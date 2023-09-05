const fs = require("fs");
const openAI = require("openai");

/**
 * @description Get transcription of video.
 * @param {openAI.OpenAI} openai - configurated openAI
 * @param {string} video - The video
 * @param {"srt"|"text"} format - Format of transcription file
 * @returns {Promise} Video transcription.
 */
function transcibe(openai, video, format = "srt") {
    if (process.argv.includes("--dry-run")) return new Promise(r => r(""));
    else return openai.audio.transcriptions.create({
        file: fs.createReadStream(video),
        response_format: "srt",
        model: 'whisper-1',
    });
}

module.exports = transcibe;