const express = require("express");
const fs = require("fs");

const app = express();

//
// Throws an error if the PORT environment variable is missing.
//
if (!process.env.PORT) {
    throw new Error("Please specify the port number for the HTTP server with the environment variable PORT.");
}

//
// Extracts the PORT environment variable.
//
const PORT = process.env.PORT;

app.get("/video", (req, res) => {
    const videoPath = "./videos/Happy-20th-Birthday-Pranathi.mp4";
    const stats = fs.statSync(videoPath);
    const videoSize = stats.size;

    const range = req.headers.range;
    const chunkSize = 10 * 1024 * 1024; // Default chunk size: 10MB

    if (range) {
        // Handle Range requests as usual
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + chunkSize - 1, videoSize - 1);

        const fileStream = fs.createReadStream(videoPath, { start, end });
        const contentLength = end - start + 1;

        res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": contentLength,
            "Content-Type": "video/mp4",
        });

        fileStream.pipe(res);
    } else {
        // No Range header: Serve the video in default chunks
        let start = 0;

        // Define a function to send chunks in a loop
        const sendChunk = () => {
            const end = Math.min(start + chunkSize - 1, videoSize - 1);
            const fileStream = fs.createReadStream(videoPath, { start, end });

            const contentLength = end - start + 1;

            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${videoSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": contentLength,
                "Content-Type": "video/mp4",
            });

            fileStream.pipe(res, { end: end === videoSize - 1 }); // Close stream only for the last chunk

            fileStream.on("end", () => {
                start = end + 1;

                if (start < videoSize) {
                    sendChunk(); // Send the next chunk
                }
            });

            fileStream.on("error", (err) => {
                console.error("Error streaming video:", err);
                res.status(500).end("Error streaming video");
            });
        };

        sendChunk(); // Start sending the first chunk
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});