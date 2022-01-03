var utils = {};

/* Free a cached Wasm-constructed object. */
utils.freeCache = function(object) {
  if (object !== undefined && object !== null) {
    object.delete();
  }
  return;
};

/* Compare two parameter sets. */
utils.compareParameters = function(x, y) {
    return JSON.stringify(x) == JSON.stringify(y);
};

/* Indicate whether 

/* Decide whether to run a step.
 *
 * This will decide whether a step should be (re-)run based on whether its
 * parameters have changed or upstream steps have been rerun. 
 *
 * `step` is the name of the current step. `latest` is an object containing the
 * latest parameters; this is compared to existing values (if any) in
 * `parameters`.  `depends` is an array of the names of the upstream steps,
 * which is checked against `upstream`. `body` is the function to be executed
 * if a rerun is desired.
 *
 * The return value of `body` should be an object as an extra `$step` property is
 * added with the name of the step for convenience. 
 */ 
utils.runStep = function(step, previous, latest, depends, body) {
  var previous = utils.parameters[step];
  var changed = true;
  var upchanged = false;

  for (const x of depends) {
    if (utils.upstream.has(x)) {
      upchanged = true;
      break;
    }
  }

  if (!upchanged) {
    if (previous !== undefined) {
      if (JSON.stringify(previous) == JSON.stringify(latest)) {
        changed = false;
      }
    }
  }

  if (!changed) {
    return null;
  } else {
    var output = body();
    output["$step"] = step;
    utils.parameters[step] = latest;
    utils.upstream.add(step);
    return output;
  }
};

/* Process the output of a step.
 *
 * Given a step to run in `body`, this function will post a message back to the
 * main thread with a success status and the time taken to execute the step.
 */
utils.processOutput = function(body, wasm, args) {
  var t0 = performance.now();

  var output = null;
  try {
    var output = body(wasm, args);
  } catch (error) {
    console.log(error);
    throw error;
  }

  if (output !== null) {
    var t1 = performance.now();
    var ftime = (t1 - t0) / 1000;
    postMessage({
        type: `${output["$step"]}_DONE`,
        resp: `~${ftime.toFixed(2)} sec`,
        msg: 'Done'
    });
  }

  return output;
};

/* Recursively extract buffers from TypedArrays.
 * 
 * The idea is to extract buffers from an object containing one or more TypedArrays,
 * to enable transfer of the memory store across workers via postMessage.
 */
utils.extractBuffers = function(object, store) {
  if (Array.isArray(object)) {
    for (const element of object) {
      utils.extractBuffers(element, store);
    }
  } else if (object.constructor == Object) {
    for (const [key, element] of Object.entries(object)) {
      utils.extractBuffers(element, store);
    }
  } else if (ArrayBuffer.isView(object)) {
    if (! (object.buffer instanceof ArrayBuffer)) {
      throw "only ArrayBuffers should be in the message payload";
    }
    store.push(object.buffer);
  }
}

/* Post a response after job success.
 *
 * This will identify all transferrable buffers to include in the `postMessage` call.
 * It will also eliminate the redundant `$step` property.
 */
utils.postSuccess = function(info, message) {
  if (info !== null) {
    var transferable = [];
    utils.extractBuffers(info, transferable);
    console.log(info);

    var step = info["$step"];
    delete info["$step"];

    postMessage({
      type: `${step}_DATA`,
      resp: info,
      msg: "Success: " + message
    }, transferable);
  }
}


