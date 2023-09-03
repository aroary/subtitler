const fs = require("fs");
const path = require('path');
const openAI = require("openai");
const moment = require("moment");
const express = require("express");
const multer = require('multer');

const transcribe = require("./utils/transcribe");
const download = require("./utils/download");
const { errorCheck, burn, embed } = require("./utils/video");

// Add timestamp to console outputs.
const _log = console.log, _error = console.error;
console.log = (...args) => _log(moment().format("\\[MM:DD:YY;HH:mm:ss\\]"), "LOG", ...args);
console.error = (...args) => _error(moment().format("\\[MM:DD:YY;HH:mm:ss\\]"), "ERR", ...args);

// Initialize openAI API.
const openai = new openAI.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 30000
});

// Save the video data to a file.
const upload = multer({
    storage: process.argv.includes("--dry-run") ? null : multer.diskStorage({
        destination: (req, file, cb) => cb(null, './'),
        filename: (req, file, cb) => {
            console.log("Saving uploaded file");
            return cb(null, "test.mp4");
        }
    })
});

const app = express();

app.use("/", (req, res, next) => next(console.log(req.method, req.path)));
app.use("/", express.static(path.join(__dirname, './public')));

app.get(["/", "/home"], (req, res) => res.sendFile(path.join(__dirname, "./public/index.html")));

app.post("/subtitle", upload.fields([{ name: "video", maxCount: 1 }]), async (req, res) => {
    const chunk = {
        log(...args) {
            if (req.accepts("text/html")) res.write(`<script>status(${JSON.stringify(args.map(String).join(" "))})</script>`);
            console.log(...args);
        }, error(...args) {
            if (req.accepts("text/html")) res.write(`<script>status(${JSON.stringify(args.map(String).join(" "))})</script>`);
            console.error(...args);
        }
    };

    if (req.accepts("text/html")) {
        res.status(200);
        res.write(fs.readFileSync(path.join(__dirname, "./public/results.html")));
        res.write(`<header><span class="logo">SubtitleRush</span></header><div class="download-container"><code id="console"></code>`);
        res.write(`<script src="./chunk.js"></script>`);
    }

    try {
        // Download from url if provided
        if (!process.argv.includes("--dry-run") && req.body.videoURL && !fs.existsSync("./test.mp4")) {
            const file = await download(req.body.videoURL);
            chunk.log("Downloaded", file);
        }

        // Error check
        chunk.log("Checking for errors");
        await errorCheck("./test.mp4");

        // Generate srt subtitles.
        chunk.log("Generating subtitles");
        transcription = await transcribe(openai, "./test.mp4");

        // Save srt file with transcription.
        chunk.log("Saving subtitles");
        if (!process.argv.includes("--dry-run")) fs.writeFileSync("./test.srt", transcription);

        // Add subtitles from srt to video.
        chunk.log("Burning subtitles");
        await burn("./test.mp4", "./test.srt", "./tested.mp4");

        chunk.log("Updating results");
        if (!process.argv.includes("--dry-run")) {
            fs.unlinkSync("./test.mp4");
            fs.renameSync("./tested.mp4", "./test.mp4");
        };

        chunk.log("Embedding subtitles");
        await embed("./test.mp4", "./test.srt", "./tested.mp4");

        // Send results
        chunk.log("Sending results");

        const results = {
            videoData: process.argv.includes("--dry-run") ? "" : fs.readFileSync(path.join('./tested.mp4')).toString('base64'),
            transcript: process.argv.includes("--dry-run") ? "" : fs.readFileSync(path.join('./test.srt')).toString('base64'),
            videoFile: process.argv.includes("--dry-run") ? "" : "test.mp4",
            transcriptFile: process.argv.includes("--dry-run") ? "" : "test.srt"
        };

        if (req.accepts("text/html")) {
            res.write(`<h1>Hurray!</h1><h2>Your video is ready, check it out.</h2>`);
            res.write(`<video controls><source src="data:video/mp4;base64,${results.videoData}" type="video/mp4"></video>`);
            res.write(`<a class="download-btn" download="${results.videoFile}" href="data:video/mp4;base64,${results.videoData}">Download Video</a>`);
            res.write(`<a class="download-btn download-transcript-btn" download="${results.transcriptFile}" href="data:application/x-subrip;base64,${results.transcript}">Download Transcription</a>`);
        } else {
            res.charset = "base46";
            res.status(200).type("mp4").send(results.videoData);
        }
    } catch (error) {
        chunk.error(error.message);
        res.write(`<h1>Oh no!</h1><h2>Something went wrong.</h2>`);
    } finally {
        if (req.accepts("text/html")) {
            res.write(`<a class="home-btn" href="/"><img src="./media/back.svg" alt="Back to home">Go back to home</a>`)
            res.write(`</div><footer><p>Copyright &copy; 2023 Kuma Web Creations</p><a href="https://wearekuma.com" target="_blank"><img src="./media/kuma-logo.png" alt="Kuma Web Creations"></a></footer>`);
        };

        res.end();

        // Clean up
        console.log("Cleaning files");
        if (!process.argv.includes("--dry-run")) {
            fs.unlink("./test.mp4", error => !error && console.log("Deleted test.mp4"));
            fs.unlink("./tested.mp4", error => !error && console.log("Deleted tested.mp4"));
            fs.unlink("./test.srt", error => !error && console.log("Deleted test.srt"));
            fs.unlink("./test.ass", error => !error && console.log("Deleted test.ass"));
        }
    }
});

// 404
app.get("*", (req, res) => res.type('text/html').sendFile(path.join(__dirname, './public/404.html')));

app.listen(Number(process.env.PORT), () => {
    console.log(`http://localhost:${process.env.PORT}/`);
    if (process.env.WEBSITE_HOSTNAME) console.log(`https://${process.env.WEBSITE_HOSTNAME}/`);
});