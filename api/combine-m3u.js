export default async function handler(req, res) {
    const urls = [
       "https://premiumm3u.vercel.app/converge.m3u", "https://premiumm3u.vercel.app/CIGNAL.m3u","https://premiumm3u.vercel.app/Jungo.m3u",
        "https://iptv-scraper-re.vercel.app/pixelsport","https://raw.githubusercontent.com/nero31994/PLUTO/27f2fb78218684c0f9f0e38ea7f4e6d656fc7832/pluto","https://premiumm3u.vercel.app/hbogoasia.m3u","https://premiumm3u.vercel.app/moveonjoy.m3u8",
    ];

    try {
        const responses = await Promise.all(urls.map(url => fetch(url).then(res => res.text())));
        let combinedM3U = "#EXTM3U\n";

        responses.forEach(content => {
            combinedM3U += content.replace(/^#EXTM3U\s*/, ""); // Remove extra #EXTM3U headers
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.status(200).send(combinedM3U);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch M3U files" });
    }
}
