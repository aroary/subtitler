const fs = require("fs");
const path = require('path');
const openAI = require("openai");
const moment = require("moment");
const express = require("express");
const multer = require('multer');
const HandleBars = require("handlebars");

const transcribe = require("./utils/transcribe");
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

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, './'),
        filename: (req, file, cb) => cb(null, "test.mp4")
    })
});

// Results pages
const resultPage = HandleBars.compile(fs.readFileSync(path.join(__dirname, './public/results.hbs'), { encoding: "utf8" }))

const app = express();

app.use("/", express.static(path.join(__dirname, './public')));

app.get(["/", "/home"], (req, res) => res.sendFile(path.join(__dirname, "./public/index.html")));

app.post("/subtitle", upload.fields([{ name: "video", maxCount: 1 }]), (req, res) => {
    // Save the video data to a file.
    console.log("Saving uploaded file");

    try {
        // Error check
        console.log("Checking for errors");
        errorCheck("./test.mp4").then(() => {
            // Generate srt subtitles.
            console.log("Generating subtitles");
            transcribe(openai, "./test.mp4").then(async transcription => {
                // Save srt file with transcription.
                console.log("Saving subtitles");
                fs.writeFileSync("./test.srt", transcription);

                try {
                    // Add subtitles from srt to video.
                    console.log("Burning subtitles");
                    await burn("./test.mp4", "./test.srt", "./tested.mp4");

                    console.log("Updating results");
                    fs.unlinkSync("./test.mp4");
                    fs.renameSync("./tested.mp4", "./test.mp4");

                    console.log("Embedding subtitles");
                    await embed("./test.mp4", "./test.srt", "./tested.mp4");

                    // Send results
                    console.log("Sending results");
                    const results = {
                        "videoData": fs.readFileSync(path.join('./tested.mp4')).toString('base64'),
                        "transcript": fs.readFileSync(path.join('./test.srt')).toString('base64'),
                        "videoFile": "test.mp4",
                        "transcriptFile": "test.srt"
                    };

                    if (req.accepts("text/html")) res.send(resultPage(results));
                    else {
                        res.charset = "base46";
                        res.type("mp4").send(results.videoData);
                    };
                } catch (error) {
                    res.status(500).sendFile(path.join(__dirname, './public/500.html'));
                    console.error(error.message);
                } finally {
                    // Clean up
                    console.log("Cleaning files");
                    fs.unlinkSync("./test.mp4");
                    fs.unlinkSync("./tested.mp4");
                    fs.unlinkSync("./test.srt");
                    fs.unlinkSync("./test.ass");
                }
            }).catch(error => {
                res.status(500).type('text/html').sendFile(path.join(__dirname, './public/500.html'));
                console.error(error.message);

                // Clean up
                console.log("Cleaning files");
                fs.unlink("./test.mp4", error => (error ? console.error : console.log)(error || "Deleted test.mp4"));
            });
        }).catch(error => {
            res.status(400).type('text/html').sendFile(path.join(__dirname, './public/400.html'));
            console.error(error.message);

            // Clean up
            console.log("Cleaning files");
            fs.unlink("./test.mp4", error => (error ? console.error : console.log)(error || "Deleted test.mp4"));
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).type('text/html').sendFile(path.join(__dirname, './public/500.html'));

        // Clean up
        console.log("Cleaning files");
        fs.unlink("./test.mp4", error => (error ? console.error : console.log)(error || "Deleted test.mp4"));
    }
});

// 404
app.get("*", (req, res) => res.type('text/html').sendFile(path.join(__dirname, './public/404.html')));

app.listen(Number(process.env.PORT), () => {
    console.log(`http://localhost:${process.env.PORT}/`);
    if (process.env.WEBSITE_HOSTNAME) console.log(`https://${WEBSITE_HOSTNAME}/`);
});