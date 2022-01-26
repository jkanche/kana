import * as scran from "scran.js";
import * as vizutils from "./_utils_viz_parent.js";
import * as index from "./_neighbor_index.js";
import * as utils from "./_utils.js";

var cache = { "counter": 0, "promises": {} };
var parameters = {};
var worker = null;

export function initialize() {
    worker = new Worker(new URL("./tsne.worker.js", import.meta.url), { type: "module" });
    return vizutils.initializeWorker(worker, cache);
}

export var changed = false;

function core(args, reneighbor) {
    var nn_out = null;
    if (reneighbor) {
        var k = scran.perplexityToNeighbors(args.perplexity);
        nn_out = vizutils.computeNeighbors(k);
    }

    // This returns a promise but the message itself is sent synchronously,
    // which is important to ensure that the t-SNE runs in its worker in
    // parallel with other analysis steps. Do NOT put the runWithNeighbors
    // call in a .then() as this may defer the message sending until 
    // the current thread is completely done processing.
    cache.run = vizutils.runWithNeighbors(worker, args, nn_out, cache);
    return;
}

export function compute(args) {
    if (!index.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
        return;
    }

    var reneighbor = index.changed || utils.changedParameters(parameters.perplexity, args.perplexity);
    core(args, reneighbor);

    parameters = args;
    delete cache.reloaded;
    changed = true;
}


export function results() {
    return vizutils.retrieveCoordinates(worker, cache);
}

export async function serialize() {
    var contents = await vizutils.retrieveCoordinates(worker, cache);
    return {
        "parameters": parameters,
        "contents": contents
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

export function animate() {
    if ("reloaded" in cache) {
        var param_copy = { ...parameters };
        param_copy.animate = true;
        core(param_copy, true);
        delete cache.reloaded;

        // Mimicking the response from the re-run.
        return cache.run
            .then(contents => {
                return {
                    "type": "tsne_rerun",
                    "data": { "status": "SUCCESS" }
                };
            });
    } else {
        return vizutils.sendTask(worker, { "cmd": "RERUN" }, cache);
    }
}
