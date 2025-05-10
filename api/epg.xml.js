import { gunzip } from 'zlib';
import { promisify } from 'util';
import { XMLParser } from 'fast-xml-parser';

const gunzipAsync = promisify(gunzip);
const parser = new XMLParser({ ignoreAttributes: false });

const epgUrls = [
  "https://github.com/atone77721/CIGNAL_EPG/raw/refs/heads/main/merged_epg.xml.gz",
  "https://raw.githubusercontent.com/atone77721/CIGNAL_EPG/refs/heads/main/merged_epg.xml",
  "https://raw.githubusercontent.com/atone77721/CIGNAL_EPG/refs/heads/main/sky_epg.xml",
  "https://github.com/matthuisman/i.mjh.nz/raw/master/PlutoTV/us.xml.gz",
  "https://github.com/atone77721/CIGNAL_EPG/raw/refs/heads/main/sky_epg.xml.gz"
];

function escapeXml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
}

export default async function handler(req, res) {
  try {
    let allChannels = new Set();
    let allProgrammes = [];

    for (const url of epgUrls) {
      const response = await fetch(url);
      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      const isGz = url.endsWith(".gz");
      const content = isGz
        ? await gunzipAsync(Buffer.from(buffer))
        : Buffer.from(buffer);

      const xml = content.toString();
      let parsed;
      try {
        parsed = parser.parse(xml);
      } catch (err) {
        continue; // skip invalid XML
      }

      if (parsed.tv?.channel) {
        const channels = Array.isArray(parsed.tv.channel) ? parsed.tv.channel : [parsed.tv.channel];
        channels.forEach(ch => {
          const chStr = `<channel id="${escapeXml(ch["@_id"])}">${ch.display_name ? `<display-name>${escapeXml(ch.display_name)}</display-name>` : ''}</channel>`;
          allChannels.add(chStr);
        });
      }

      if (parsed.tv?.programme) {
        const programmes = Array.isArray(parsed.tv.programme) ? parsed.tv.programme : [parsed.tv.programme];
        programmes.forEach(pg => {
          const attrs = Object.entries(pg)
            .filter(([key]) => key.startsWith("@_"))
            .map(([k, v]) => `${k.slice(2)}="${escapeXml(v)}"`).join(" ");
          const title = pg.title ? `<title>${escapeXml(pg.title)}</title>` : '';
          allProgrammes.push(`<programme ${attrs}>${title}</programme>`);
        });
      }
    }

    let xmlOutput = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n`;
    xmlOutput += Array.from(allChannels).join("\n") + "\n";
    xmlOutput += allProgrammes.join("\n") + "\n</tv>";

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(xmlOutput);
  } catch (err) {
    console.error(err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><tv></tv>');
  }
}
