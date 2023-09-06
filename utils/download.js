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
    if (process.argv.includes("--dry-run")) return new Promise(r => r(""));
    else return new Promise((resolve, reject) => {
        console.log("Downloading URL");
        if (!url) reject(new Error("File not provided"));
        else if (url.startsWith("data:")) {
            const mime = /:\w+\/\w+/i.exec(url)[0].slice(1);
            const encoding = url.slice(url.indexOf(mime) + mime.length + 1, url.indexOf(","));

            if (!mime.startsWith("video/")) reject(new Error("Invalid file type"));
            else {
                const file = `${Date.now()}_download.mp4`;
                const stream = fs.createWriteStream(path.join(__dirname, "../data/", file), { encoding });
                stream.write(Buffer.from(url.slice(url.indexOf(`${mime};${encoding},`) + mime.length + encoding.length + 2), encoding));
                stream.close();
                resolve(file);
            }
        } else if (url.startsWith("http")) [http, https][~~url.startsWith("https:")].get(url, res => {
            if (!res.headers["content-type"].startsWith("video/")) reject(new Error("Invalid file type"));
            else if (res.statusCode > 199 && res.statusCode < 300) {
                const file = `${Date.now()}_${new URL(url).host}.mp4`;
                res.pipe(fs.createWriteStream(path.join(__dirname, "../data/", file)));
                resolve(file);
            } else reject(new Error(res.statusMessage));
        }).end();
        else reject(new Error("Unsupported protocol"));
    });
}

module.exports = download;