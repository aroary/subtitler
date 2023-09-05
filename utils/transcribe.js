const fs = require("fs");
const openAI = require("openai");

// Initialize openAI API.
const openai = new openAI.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: 30000
});

/**
 * @description Get transcription of video.
 * @param {string} video - The video
 * @param {"srt"|"text"} format - Format of transcription file
 * @returns {Promise} Video transcription.
 */
function transcibe(video, format = "srt") {
    if (process.argv.includes("--dry-run")) return new Promise(r => r(""));
    else return openai.audio.transcriptions.create({
        file: fs.createReadStream(video),
        response_format: "srt",
        model: 'whisper-1',
    });
}

module.exports = transcibe;