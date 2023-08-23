const fs = require("fs");
const path = require('path');
const openAI = require("openai");
const moment = require("moment");
const express = require("express");
const multer = require('multer');

const transcribe = require("./utils/transcribe");
const { errorCheck, burn } = require("./utils/video");

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
            console.log("Generating transcription");
            transcribe(openai, "./test.mp4").then(transcription => {
                // Save srt file with transcription.
                console.log("Saving transcription");
                fs.writeFileSync("./test.srt", transcription);

                // Add subtitles from srt to video.
                console.log("Generating file");
                burn("./test.mp4", "./test.srt", "./tested.mp4").then(() => {
                    // Send results
                    console.log("Sending generated file");
                    if (req.accepts("text/html")) res.send(fs
                        .readFileSync(path.join(__dirname, './public/complete.html'), { encoding: "utf8" })
                        .replace(/{{videoDataUrl}}/g, "data:video/mp4;base64," + fs.readFileSync(path.join('./tested.mp4')).toString('base64'))
                        .replace(/{{transcriptionDataUrl}}/g, "data:application/x-subrip;base64," + fs.readFileSync(path.join('./test.srt')).toString('base64')));
                    else {
                        res.charset = "base46";
                        res.type("mp4").send(fs.readFileSync(path.join('./test.mp4')).toString('base64'));
                    };

                    // Clean up
                    console.log("Cleaning files");
                    fs.unlinkSync("./test.mp4");
                    fs.unlinkSync("./tested.mp4");
                    fs.unlinkSync("./test.srt");
                }).catch(error => {
                    res.status(500).sendFile(path.join(__dirname, './public/error-500.html'));
                    console.error(error.message);

                    // Clean up
                    console.log("Cleaning files");
                    fs.unlink("./test.mp4", console.error);
                    fs.unlink("./test.srt", console.error);
                });
            }).catch(error => {
                res.status(500).type('text/html').sendFile(path.join(__dirname, './public/error-500.html'));
                console.error(error.message);

                // Clean up
                console.log("Cleaning files");
                fs.unlink("./test.mp4", console.error);
            });
        }).catch(error => {
            res.status(400).send("File is unsupported or corrupt");
            console.error(error.message);

            // Clean up
            console.log("Cleaning files");
            fs.unlink("./test.mp4", console.error);
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).type('text/html').sendFile(path.join(__dirname, './public/error-500.html'));

        // Clean up
        console.log("Cleaning files");
        fs.unlink("./test.mp4");
    }
});

// 404
app.get("*", (req, res) => res.redirect("/"));

app.listen(Number(process.env.PORT), () => console.log(`http://localhost:${process.env.PORT}/`));