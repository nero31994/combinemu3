import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    const userAgent = req.headers["user-agent"] || "";

    const isAllowed = userAgent.includes("m3u-ip.tv");

    const blockedAgents = [
        "curl", "wget", "httpie", "postman", "http-client", "termux", "okhttp", "python-requests", "axios", "node-fetch"
    ];

    const isBlockedTool = blockedAgents.some(agent =>
        userAgent.toLowerCase().includes(agent)
    );

    const suspiciousHeaders = [
        "Postman-Token", "Insomnia", "Sec-Fetch-Mode", "Sec-Fetch-Site", "Sec-Fetch-Dest", "X-Requested-With"
    ];
    const hasSuspiciousHeader = suspiciousHeaders.some(h => h.toLowerCase() in req.headers);

    if (!isAllowed || isBlockedTool || hasSuspiciousHeader) {
        // Email notification for blocked access
        try {
            await resend.emails.send({
                from: 'M3U Security <security@m3u-ip.tv>',
                to: 'arenaofvalorph937@gmail.com',
                subject: 'Blocked Access Attempt Detected',
                html: `
                    <h2>Unauthorized Attempt</h2>
                    <p><strong>User-Agent:</strong> ${userAgent}</p>
                    <p><strong>IP Address:</strong> ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                `,
            });
        } catch (emailError) {
            console.error("Failed to send alert email:", emailError);
        }

        return res.status(403).json({ error: "Access denied. Unauthorized client." });
    }

    const urls = [
        "https://premiumm3u.vercel.app/converge.m3u",
        "https://premiumm3u.vercel.app/CIGNAL.m3u",
        "https://premiumm3u.vercel.app/Jungo.m3u",     
        "https://iptv-scraper-re.vercel.app/streameast",
        "https://raw.githubusercontent.com/nero31994/pluto2/refs/heads/main/filtered_playlist.m3u",
        "https://raw.githubusercontent.com/pigzillaaaaa/iptv-scraper/refs/heads/main/daddylive-channels.m3u8",
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const responses = await Promise.allSettled(
            urls.map(url => fetch(url, { signal: controller.signal }).then(res => res.ok ? res.text() : null))
        );

        clearTimeout(timeout);

        let combinedM3U = "#EXTM3U\n";
        const seenLines = new Set();

        for (const result of responses) {
            if (result.status === "fulfilled" && result.value) {
                const lines = result.value.split("\n").filter(line => !seenLines.has(line));
                lines.forEach(line => seenLines.add(line));
                combinedM3U += lines.join("\n") + "\n";
            }
        }

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.status(200).send(combinedM3U);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch M3U files" });
    }
}
