const fs = require("fs");
const path = require('path');
const express = require("express");
const multer = require('multer');

const transcribe = require("./utils/transcribe");
const download = require("./utils/download");
const { errorCheck, burn, embed } = require("./utils/video");

// Save the video data to a file.
const upload = multer({
    storage: process.argv.includes("--dry-run") ? null : multer.diskStorage({
        destination: (req, file, cb) => cb(null, './data'),
        filename: (req, file, cb) => {
            const filename = `${Date.now()}_${file.originalname}`;
            console.log("Saving", filename);
            return cb(null, filename);
        }
    })
}).single("video");

// Cache files for performance
const cache = new Map();
cache.set("home", fs.readFileSync(path.join(__dirname, "./public/index.html")));
cache.set("404", fs.readFileSync(path.join(__dirname, './public/404.html')));

const app = express();

app.use("/", (req, res, next) => next(console.log(req.method, req.path)));
app.use("/", express.static(path.join(__dirname, './public')));

app.get(["/", "/home"], (req, res) => res.send(cache.get("home")));

app.post("/subtitle", upload, async (req, res) => {
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
        res.write(`<header><span class="logo">SubtitleRush</span></header><div class="download-container"><code id="console"><button onclick="toggle()"></button></code>`);
        res.write(`<script src="./chunk.js"></script>`);
    }

    var file, name, type;

    try {
        // Get file
        file = encodeURIComponent(req.file?.filename || await download(req.body.videoURL));
        name = file.split(".").slice(0, -1).join(".");
        type = file.split(".").pop();

        // Error check
        chunk.log("Checking for errors");
        await errorCheck(`./data/${file}`);

        // Generate srt subtitles.
        chunk.log("Generating subtitles");
        transcription = await transcribe(`./data/${file}`);

        // Save srt file with transcription.
        chunk.log("Saving subtitles");
        if (!process.argv.includes("--dry-run")) fs.writeFileSync(`./data/${name}.srt`, transcription);

        // Add subtitles from srt to video.
        chunk.log("Burning subtitles");
        await burn(`./data/${file}`, `./data/${name}.srt`, `./data/_${file}`);

        chunk.log("Updating results");
        if (!process.argv.includes("--dry-run")) {
            fs.unlinkSync(`./data/${file}`);
            fs.renameSync(`./data/_${file}`, `./data/${file}`);
        };

        chunk.log("Embedding subtitles");
        await embed(`./data/${file}`, `./data/${name}.srt`, `./data/_${file}`);

        chunk.log("Updating results");
        if (!process.argv.includes("--dry-run")) {
            fs.unlinkSync(`./data/${file}`);
            fs.renameSync(`./data/_${file}`, `./data/${file}`);
        };

        // Send results
        chunk.log("Sending results");

        const results = {
            videoData: process.argv.includes("--dry-run") ? "" : fs.readFileSync(path.join(`./data/${file}`)).toString('base64'),
            transcript: process.argv.includes("--dry-run") ? "" : fs.readFileSync(path.join(`./data/${name}.srt`)).toString('base64'),
            videoFile: process.argv.includes("--dry-run") ? "" : file.replace(/\d+_/, ""),
            transcriptFile: process.argv.includes("--dry-run") ? "" : name.replace(/\d+_/, "") + ".srt"
        };

        if (req.accepts("text/html")) {
            res.write(`<h1>Hurray!</h1><h2>Your video is ready, check it out.</h2>`);
            res.write(`<video controls><source src="data:video/${type};base64,${results.videoData}" type="video/${type}"></video>`);
            res.write(`<a class="download-btn" download="${results.videoFile}" href="data:video/mp4;base64,${results.videoData}">Download Video</a>`);
            res.write(`<a class="download-btn download-transcript-btn" download="${results.transcriptFile}" href="data:application/x-subrip;base64,${results.transcript}">Download Transcription</a>`);
        } else {
            res.charset = "base46";
            res.status(200).type(type).send(results.videoData);
        }
    } catch (error) {
        chunk.error(error.message);
        res.write(`<h1>Oh no!</h1><h2>Something went wrong.</h2>`);
    } finally {
        if (req.accepts("text/html")) {
            res.write(`<a class="home-btn" href="/"><img src="./media/back.svg" alt="Back to home">Go back to home</a>`);
            res.write(`</div><footer><p>Copyright &copy; 2023 Kuma Web Creations</p><a href="https://wearekuma.com" target="_blank"><img src="./media/kuma-logo.png" alt="Kuma Web Creations"></a></footer>`);
        };

        res.end();

        // Clean up
        console.log("Cleaning files");
        if (!process.argv.includes("--dry-run")) {
            fs.unlink(`./data/${file}`, error => !error && console.log(`Deleted ${file}`));
            fs.unlink(`./data/${name}.srt`, error => !error && console.log(`Deleted ${name}.srt`));
            fs.unlink(`./data/${name}.ass`, error => !error && console.log(`Deleted ${name}.ass`));
        }
    }
});

// 404
app.get("*", (req, res) => res.type('text/html').send(cache.get("home")));

app.listen(Number(process.env.PORT), () => {
    console.log(`http://localhost:${process.env.PORT}/`);
    if (process.env.WEBSITE_HOSTNAME) console.log(`https://${process.env.WEBSITE_HOSTNAME}/`);
});