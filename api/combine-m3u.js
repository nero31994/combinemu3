export default async function handler(req, res) {
    const urls = [
        "https://premiumm3u.vercel.app/converge.m3u",
        "https://premiumm3u.vercel.app/CIGNAL.m3u",
        "https://premiumm3u.vercel.app/Jungo.m3u",     
        "https://iptv-scraper-re.vercel.app/pixelsport",
        "https://raw.githubusercontent.com/pigzillaaaaa/iptv-scraper/refs/heads/main/daddylive-channels.m3u8",
        "https://premiumm3u.vercel.app/hbogoasia.m3u",
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

    try {
        const responses = await Promise.allSettled(
            urls.map(url => fetch(url, { signal: controller.signal }).then(res => res.ok ? res.text() : null))
        );

        clearTimeout(timeout);

        let combinedM3U = "#EXTM3U\n";
        const seenLines = new Set(); // Deduplication

        for (const result of responses) {
            if (result.status === "fulfilled" && result.value) {
                const lines = result.value.split("\n").filter(line => !seenLines.has(line));
                lines.forEach(line => seenLines.add(line));
                combinedM3U += lines.join("\n") + "\n";
            }
        }

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
        res.status(200).send(combinedM3U);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch M3U files" });
    }
}
