import { gunzip } from 'zlib';
import { promisify } from 'util';

const gunzipAsync = promisify(gunzip);

const epgUrls = [
  "https://github.com/atone77721/CIGNAL_EPG/raw/refs/heads/main/merged_epg.xml.gz",
  "https://raw.githubusercontent.com/atone77721/CIGNAL_EPG/refs/heads/main/merged_epg.xml",
  "https://raw.githubusercontent.com/atone77721/CIGNAL_EPG/refs/heads/main/sky_epg.xml",
  "https://github.com/matthuisman/i.mjh.nz/raw/master/PlutoTV/us.xml.gz",
  "https://github.com/atone77721/CIGNAL_EPG/raw/refs/heads/main/sky_epg.xml.gz"
];

export default async function handler(req, res) {
  try {
    let xmlParts = [];

    for (const url of epgUrls) {
      const response = await fetch(url);
      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      const isGz = url.endsWith(".gz");

      let content;
      if (isGz) {
        content = await gunzipAsync(Buffer.from(buffer));
        xmlParts.push(content.toString());
      } else {
        content = Buffer.from(buffer).toString();
        xmlParts.push(content);
      }
    }

    // Combine all <programme> and <channel> nodes under one <tv> root
    let merged = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n';
    for (const xml of xmlParts) {
      const content = xml
        .replace(/<\?xml[^>]*\?>/, '')
        .replace(/<\/?tv>/g, '');
      merged += content.trim() + '\n';
    }
    merged += '</tv>';

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(merged);
  } catch (error) {
    console.error(error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><tv></tv>');
  }
}
