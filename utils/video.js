const fluent = require("fluent-ffmpeg");

fluent.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

/**
 * @description Check a video file for errors.
 * @param {string} video - The video path
 * @returns {Promise} resolved if no errors, otherwise rejected
 */
function errorCheck(video) {
    return new Promise((resolve, reject) => fluent(video)
        .addInputOption('-xerror')
        .addInputOption('-v error')
        .output('-')
        .outputOptions('-f null')
        .on('error', reject)
        .on("end", resolve)
        .run());
}

/**
 * @description Convert a file fro mone format to another.
 * @param {string} file The original file
 * @param {"mp4"|"avi"|"srt"|"ass"} format The target format
 * @returns {Promise} resolved if no errors, otherwise rejected
 */
function convert(file, format) {
    const name = file.split(".").reverse().slice(1).reverse().join(".");
    return new Promise((resolve, reject) => fluent(file)
        .output(`${name}.${format}`)
        .on('error', reject)
        .on("end", resolve)
        .run());
}

/**
 * @description Burn the subtitles to the video stream.
 * @param {string} video - The video
 * @param {string} transcription - The subtitles
 * @param {string} output - The output path
 * @returns {Promise} resolved if no errors, otherwise rejected
 */
function burn(video, transcription, output) {
    return new Promise((resolve, reject) => fluent(video)
        .videoFilters(`subtitles=${transcription}`)
        .output(output)
        .on('error', reject)
        .on('end', resolve)
        .run());
};

/**
 * @description Add subtitles to video file in a subtitle stream.
 * @param {string} video - The video
 * @param {string} transcription - The subtitles
 * @param {string} output - The output path
 * @returns {Promise} resolved if no errors, otherwise rejected
 */
function stream(video, transcription, output) {
    return new Promise((resolve, reject) => fluent(video)
        .input(transcription)
        .inputOptions([
            "-c copy",
            "-c:s mov_text"
        ])
        .output(output)
        .on('error', reject)
        .on('end', resolve)
        .run());
}

module.exports = { errorCheck, convert, burn, stream };