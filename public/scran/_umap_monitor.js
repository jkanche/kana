const scran_umap_monitor = {};

(function(x) {
  /** Private members **/
  var cache = { "counter": 0, "promises": {} };
  var parameters = {};
  var worker = null;

  /** Public members **/
  x.changed = false;

  /** Public functions **/
  x.compute = function(wasm, args) {
    if (!scran_neighbor_index.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
      return;
    }

    if (worker == null) {
      worker = scran_utils_viz_parent.createWorker("./umapWorker.js", cache);
      cache.initialized = scran_utils_viz_parent.initializeWorker(worker, cache);
    }
   
    var nn_out = null;
    if (scran_neighbor_index.changed || scran_utils.changedParameters(parameters.num_neighbors, args.num_neighbors)) {
      nn_out = scran_utils_viz_parent.computeNeighbors(wasm, args.num_neighbors);
    }

    cache.run = cache.initialized.then(x => scran_utils_viz_parent.runWithNeighbors(worker, args, nn_out, cache));

    parameters = args;
    delete cache.reloaded;
    x.changed = true;
  };

  x.results = function(wasm) {
    return scran_utils_viz_parent.retrieveCoordinates(worker, cache);
  }

  x.serialize = function(wasm) {
    return scran_utils_viz_parent.retrieveCoordinates(worker, cache)
    .then(contents => {
      return {
        "parameters": parameters,
        "contents": contents
      };
    });
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };
  
})(scran_umap_monitor);
