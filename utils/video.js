const fluent = require("fluent-ffmpeg");

fluent.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

/**
 * @description Check a video file for errors.
 * @param {string} video - The video path
 * @returns {Promise} resolved is no errors, otherwise rejected
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
 * @description Burn the subtitles to the video.
 * @param {string} video - The video
 * @param {string} transcription - The subtitles,
 * @param {string} output - The output path
 * @returns {Promise} resolved is no errors, otherwise rejected
 */
function burn(video, transcription, output) {
    return new Promise((resolve, reject) => fluent(video)
        .videoFilters(`subtitles=${transcription}`)
        .output(output)
        .on('error', reject)
        .on('end', resolve)
        .run());
};

module.exports = { errorCheck, burn };