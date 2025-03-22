export default async function handler(req, res) {
    const { url, referer, ua } = req.query;

    if (!url) {
        return res.status(400).send("Missing stream URL");
    }

    try {
        const response = await fetch(url, {
            headers: {
                "Referer": referer || "https://default-referer.com/",
                "User-Agent": ua || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });

        if (!response.ok) {
            return res.status(response.status).send(`Error: ${response.status}`);
        }

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        const data = await response.text();
        res.status(200).send(data);
    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).send("Proxy Failed");
    }
} 
