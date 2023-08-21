const fs = require("fs");
const path = require('path');
const fluent = require("fluent-ffmpeg");
const openAI = require("openai");
const moment = require("moment");
const express = require("express");
const multer = require('multer');

// Add timestamp to console outputs.
const _log = console.log, _error = console.error;
console.log = (...args) => _log(moment().format("\\[MM:DD:YY;HH:mm:ss\\]"), "LOG", ...args);
console.error = (...args) => _error(moment().format("\\[MM:DD:YY;HH:mm:ss\\]"), "ERR", ...args);

// Initialize openAI API
const openai = new openAI.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 30000
});

fluent.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, './'),
        filename: (req, file, cb) => cb(null, "test.mp4")
    })
});

const app = express();

app.use('/', express.static(path.join(__dirname, './view')));

app.post("/subtitle", upload.fields([{ name: "video", maxCount: 1 }]), (req, res) => {
    try {
        // Save the video data to a file.
        console.log("Saving uploaded file");

        // Check for errors.
        fluent("./test.mp4")
            .addInputOption('-xerror')
            .addInputOption('-v error')
            .output('-')
            .outputOptions('-f null')
            .on('error', error => {
                res.status(400).type('text/plain').send("File is unsupported or corrupt");
                console.error(error.message);
            })
            .on("end", () => {
                // Generate srt subtitles.
                console.log("Generating transcription");
                openai.audio.transcriptions.create({
                    file: fs.createReadStream("test.mp4"),
                    response_format: "srt",
                    model: 'whisper-1',
                })
                    .then(transcription => {
                        // Save srt file with transcription.
                        console.log("Saving transcription");
                        fs.writeFileSync("./test.srt", transcription);

                        // Add subtitles from srt to video.
                        console.log("Generating file");
                        fluent("./test.mp4")
                            .videoFilters(`subtitles=${"./test.srt"}`)
                            .output("./tested.mp4")
                            .on('error', error => {
                                res.status(500).type('text/plain').send("Failed to generate video file");
                                console.error(error.message);
                            })
                            .on('end', () => {
                                // Send results
                                console.log("Sending generated file");
                                res.setHeader("Content-Disposition", "attachment;filename=test.mp4").status(200).send(fs.readFileSync("./tested.mp4"));
                            })
                            .run();
                    })
                    .catch(error => {
                        res.status(500).type('text/plain').send("Failed to generate transcription file");
                        console.error(error.message);
                    });
            })
            .run();
    } catch (error) {
        console.error(error.message);
        res.status(500).send();
    }
});

app.listen(Number(process.env.PORT), () => console.log(`http://localhost:${process.env.PORT}/`));