const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

/**
 * @description Download a video from a URL.
 * @param {string} url - The link to the video
 * @returns {Promise<string,Error>} The write stream of the result
 */
function download(url) {
    return new Promise((resolve, reject) => {
        if (url.startsWith("data:")) {
            const mime = /:\w+\/\w+/i.exec(url)[0].slice(1);
            const encoding = url.slice(url.indexOf(mime) + mime.length + 1, url.indexOf(","));

            if (!mime.startsWith("video/")) reject(new Error("Invalid file type"));
            else {
                const stream = fs.createWriteStream(path.join(__dirname, "../test.mp4"), { encoding });
                stream.write(Buffer.from(url.slice(url.indexOf(`${mime};${encoding},`) + mime.length + encoding.length + 2), encoding));
                stream.close();
                resolve("test.mp4");
            }
        } else if (url.startsWith("http")) [http, https][~~url.startsWith("https:")].get(url, res => {
            if (!res.headers["content-type"].startsWith("video/")) reject(new Error("Invalid file type"));
            else if (res.statusCode > 199 && res.statusCode < 300) {
                res.pipe(fs.createWriteStream(path.join(__dirname, "../test.mp4")));
                resolve("test.mp4");
            } else reject(new Error(res.statusMessage));
        }).end();
        else reject(new Error("Unsupported protocol"));
    });
}

module.exports = download;