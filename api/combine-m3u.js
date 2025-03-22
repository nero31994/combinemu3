export default async function handler(req, res) {
    const urls = [
        "https://premiumm3u.vercel.app/CIGNAL.m3u",
        "https://premiumm3u.vercel.app/daddylive.m3u",
        "https://premiumm3u.vercel.app/hbogoasia.m3u"
    ];

    try {
        const responses = await Promise.all(urls.map(url => fetch(url).then(res => res.text())));
        let combinedM3U = "#EXTM3U\n";

        responses.forEach(content => {
            // Remove extra #EXTM3U headers
            content = content.replace(/^#EXTM3U\s*/, "");
            
            // Automatically replace URLs that contain "|Referer=" with the proxy
            content = content.replace(/(https?:\/\/[^\s|]+)\|Referer=([^&]+)&User-Agent=([^\s]+)/g, (match, streamUrl, referer, userAgent) => {
                return `https://premiumm3u.vercel.app/api/proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(referer)}&ua=${encodeURIComponent(userAgent)}`;
            });

            combinedM3U += content + "\n";
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.status(200).send(combinedM3U);
    } catch (error) {
        console.error("Error fetching M3U files:", error);
        res.status(500).json({ error: "Failed to fetch M3U files" });
    }
}
