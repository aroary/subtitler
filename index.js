const fs = require("fs");
const fluent = require("fluent-ffmpeg");
const openAI = require("openai");
const express = require("express");

const openai = new openAI.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 30000
});

fluent.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

const app = express();

app.get("/api/[a-zA-Z0-9]+/subtitle", (req, res) => {
    // Save the video data to a file.
    fs.writeFileSync("./test.mp4", req.body);

    // Generate srt subtitles.
    openai.audio.transcriptions.create({
        file: fs.createReadStream("test.mp4"),
        response_format: "srt",
        model: 'whisper-1',
    })
        .then(transcription => {
            // Save srt file with transcription.
            fs.writeFileSync("./test.srt", transcription);

            // Add subtitles from srt to video.
            fluent("./test.mp4")
                .videoFilters(`subtitles=${"./test.srt"}`)
                .output("./tested.mp4")
                .on('error', error => {
                    res.status(500).send();
                    console.error(error);
                })
                .on('end', () => {
                    // Send results
                    res.status(200).send(fs.readFileSync("./tested.mp4"));
                })
                .run();
        })
        .catch(error => {
            res.status(500).send();
            console.error(error);
        });
});

app.listen(Number(process.env.OPENAI_API_KEY), () => console.log(`http://localhost:${process.env.OPENAI_API_KEY}/`));