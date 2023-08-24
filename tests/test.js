const fs = require("fs");
const http = require('http');
const path = require("path");
const Form = require("form-data");

const { errorCheck } = require("../utils/video");

require("../index");

new Promise((resolve, reject) => {
    console.log("Uploading file");

    const form = new Form();
    form.append("video", fs.createReadStream(path.join(__dirname, "./test.mp4")), "test.mp4");

    const request = http.request({
        host: 'localhost',
        port: process.env.PORT,
        path: '/subtitle',
        method: 'POST',
        headers: { ...form.getHeaders(), "Accept": "video/mp4" }
    }, res => {
        console.log("Status:", res.statusCode, res.statusMessage);
        res.setEncoding('utf8');

        var result = "";

        res.on('data', chunk => result += chunk);
        res.on('end', () => resolve(result));
        res.on("error", reject);
    }).on('error', reject);

    form.pipe(request).on("finish", request.end);
})
    .then(result => {
        console.log("Downloading file");
        fs.writeFileSync(path.join(__dirname, "./sample.mp4"), result, { encoding: "base64" });

        // Error check
        console.log("Checking for errors");
        errorCheck("./sample.mp4")
            .then(() => console.log("Valid video file"))
            .catch(console.error);
    })
    .catch(console.error)
    .finally(process.exit);