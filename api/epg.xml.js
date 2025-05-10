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
  const userAgent = req.headers['user-agent'] || '';

  if (userAgent !== 'Mozilla/5.0 (m3u-ip.tv 3.0.1) Android') {
    res.status(403).send('Access denied');
    return;
  }

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
        xmlParts.push(content.toString("utf-8"));
      } else {
        content = Buffer.from(buffer).toString("utf-8");
        xmlParts.push(content);
      }
    }

    let mergedChannels = new Set();
    let mergedProgrammes = [];

    for (const xml of xmlParts) {
      const cleanXml = xml.replace(/<\?xml[^>]*\?>/, '').replace(/<\/?tv>/g, '').trim();

      const channelMatches = [...cleanXml.matchAll(/<channel[^>]*>[\s\S]*?<\/channel>/g)];
      const programmeMatches = [...cleanXml.matchAll(/<programme[^>]*>[\s\S]*?<\/programme>/g)];

      for (const match of channelMatches) {
        mergedChannels.add(match[0]);
      }

      for (const match of programmeMatches) {
        mergedProgrammes.push(match[0]);
      }
    }

    let mergedXml = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n';
    mergedXml += [...mergedChannels].join('\n') + '\n';
    mergedXml += mergedProgrammes.join('\n') + '\n';
    mergedXml += '</tv>';

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(mergedXml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to merge EPGs" });
  }
}
