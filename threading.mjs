import fs from "fs";
import os from "os";
import cluster from 'cluster';
import path from "path";
import moment from "moment";

// Add timestamp to console outputs.
const _log = console.log, _error = console.error;
console.log = (...args) => _log(process.pid, moment().format("\\[MM:DD:YY HH:mm:ss\\]"), "LOG", ...args);
console.error = (...args) => _error(process.pid, moment().format("\\[MM:DD:YY HH:mm:ss\\]"), "ERR", ...args);

// Initialize generated data directory
if (!process.argv.includes("--dry-run")) {
    console.log("Initializing ./data/");
    if (fs.existsSync(path.join(__dirname, "./data"))) fs.rmSync(path.join(__dirname, "./data"), { recursive: true, force: true });
    fs.mkdirSync(path.join(__dirname, "./data"));
};

if (cluster.isPrimary) {
    // Start workers.
    for (let i = os.availableParallelism(); i; i--) cluster.fork();

    cluster.on('exit', (worker, code, signal) => console.log(worker.process.pid, code, signal));
} else await import("./index.js");