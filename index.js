const fs = require("fs");
const openAI = require("openai");
const express = require("express");

const openai = new openAI.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 30000
});

openai.audio.transcriptions.create({
    file: fs.createReadStream("test.mp4"),
    response_format: "srt",
    model: 'whisper-1',
})
    .then(console.log)
    .catch(console.error);

const app = express();

app.post("/api/[a-zA-Z0-9]+/upload", (req, res) => {
    res.status(200).json({ code: 204 });
});

app.get("/api/[a-zA-Z0-9]+/download", (req, res) => {
    res.status(200).json({ code: 204 });
});

// app.listen(Number(process.env.OPENAI_API_KEY), () => console.log("http://localhost:3000/"));