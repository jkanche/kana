const scran_utils_markers = {};

scran_utils_markers.serializeGroupStats = function(obj, group) {
  return {
    "means": obj.means(i, 0).slice(),
    "detected": obj.detected(i, 0).slice(),
    "lfc": {
      "min": obj.lfc(i, 0).slice(),
      "mean": obj.lfc(i, 1).slice(),
      "min-rank": obj.lfc(i, 4).slice()
    },
    "delta_detected": {
      "min": obj.delta_detected(i, 0).slice(),
      "mean": obj.delta_detected(i, 1).slice(),
      "min-rank": obj.delta_detected(i, 4).slice()
    },
    "cohen": {
      "min": obj.cohen(i, 0).slice(),
      "mean": obj.cohen(i, 1).slice(),
      "min-rank": obj.cohen(i, 4).slice()
    },
    "auc": {
      "min": obj.auc(i, 0).slice(),
      "mean": obj.auc(i, 1).slice(),
      "min-rank": obj.auc(i, 4).slice()
    }
  };
};

/*
 * Helper function to retrieve marker statistics for plotting.
 * This is used both for cluster-specific markers as well as the
 * DE genes that are computed for a custom selection vs the rest.
 */
scran_utils_markers.fetchGroupResults = function(wasm, results, reloaded, rank_type, group) {
  if (!rank_type || rank_type === undefined) {
      rank_type = "cohen-min-rank";
  }
  var use_reloaded = (reloaded !== undefined);

  // Choosing the ranking statistic. Do NOT do any Wasm allocations
  // until 'ranking' is fully consumed!
  var ranking;
  if (use_reloaded) {
    var summary = "mean";
    if (rank_type.match(/-min$/)) {
        summary = "min";
    } else if (rank_type.match(/-min-rank$/)) {
        summary = "min-rank";
    }

    var effect;
    if (rank_type.match(/^cohen-/)) {
      effect = "cohen";
    } else if (rank_type.match(/^auc-/)) {
      effect = "auc";
    } else if (rank_type.match(/^lfc-/)) {
      effect = "lfc";
    } else if (rank_type.match(/^delta-d-/)) {
      effect = "delta_detected";
    } else {
      throw "unknown rank type '" + rank_type + "'";
    }

    ranking = reloaded[group][effect][summary];
  } else {
    var index = 1;
    if (rank_type.match(/-min$/)) {
        index = 0;
    } else if (rank_type.match(/-min-rank$/)) {
        increasing = true;
        index = 4;
    }

    if (rank_type.match(/^cohen-/)) {
      ranking = results.cohen(group, index);
    } else if (rank_type.match(/^auc-/)) {
      ranking = results.auc(group, index);
    } else if (rank_type.match(/^lfc-/)) {
      ranking = results.lfc(group, index);
    } else if (rank_type.match(/^delta-d-/)) {
      ranking = results.delta_detected(group, index);
    } else {
      throw "unknown rank type '" + rank_type + "'";
    }
  }

  // Computing the ordering based on the ranking statistic.
  var ordering = new Int32Array(ranking.length);
  for (var i = 0; i < ordering.length; i++) {
      ordering[i] = i;
  }
  if (increasing) {
      ordering.sort((f, s) => (ranking[f] - ranking[s]));
  } else {
      ordering.sort((f, s) => (ranking[s] - ranking[f]));
  }

  // Apply that ordering to each statistic of interest.
  var reorder = function(stats) {
      var thing = new Float64Array(stats.length);
      for (var i = 0; i < ordering.length; i++) {
          thing[i] = stats[ordering[i]];
      }
      return thing;
  };

  var stat_detected, stat_mean, stat_lfc, stat_delta_d;
  if (use_reloaded) {
    var current = reloaded[group];
    stat_mean = reorder(current.means);
    stat_detected = reorder(current.detected);
    stat_lfc = reorder(current.lfc["mean"]);
    stat_delta_d = reorder(current.delta_detected["mean"]);
  } else {
    stat_detected = reorder(results.detected(group, 0));
    stat_mean = reorder(results.means(group, 0));
    stat_lfc = reorder(results.lfc(group, 1));
    stat_delta_d = reorder(results.delta_detected(group, 1));
  }

  /** TODO: move this to the main thread to avoid having to 
   * continually (un)serialize a large string array. */
  var genes = scran_inputs.fetchGeneNames(wasm);
  var new_genes = [];
  for (const o of ordering) {
      new_genes.push(genes[o]);
  }

  return {
    "genes": new_genes,
    "means": stat_mean,
    "detected": stat_detected,
    "lfc": stat_lfc,
    "delta_detected": stat_delta_d
  };
};
