import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as hdf5 from "h5wasm";
import * as d3 from "d3-dsv";
import * as pako from "pako";

var cache = {};
var parameters = {};
var abbreviated = {};

export var changed = false;

function permuteGenes(genes) {
    var buf = new scran.Int32WasmArray(cache.matrix.numberOfRows());
    try {
        cache.matrix.permutation({ buffer: buf });

        let perm = buf.array();
        for (const [key, val] of Object.entries(genes)) {
            let copy = val.slice();

            for (var i = 0; i < perm.length; i++) {
                copy[perm[i]] = val[i];
            }
            genes[key] = copy;
        }
    } finally {
        buf.free();
    }
}

function dummyGenes(numberOfRowss) {
    let genes = []
    for (let i = 0; i < numberOfRowss; i++) {
        genes.push(`Gene ${i + 1}`);
    }
    return { "id": genes };
}

/** Matrix Market **/
function loadMatrixMarketRaw(files) {
    utils.freeCache(cache.matrix);

    // In theory, this section may support multiple files (e.g., for multiple samples).
    var mtx_files = files.filter(x => x.type == "mtx");
    var first_mtx = mtx_files[0];
    var contents = new Uint8Array(first_mtx.buffer);
    var ext = first_mtx.name.split('.').pop();
    var is_compressed = (ext == "gz");
    cache.matrix = scran.initializeSparseMatrixFromMatrixMarketBuffer(contents, { "compressed": is_compressed });

    var genes_file = files.filter(x => x.type == "genes");
    if (genes_file.length == 1) {
        var genes_file = genes_file[0] 
        var content = new Uint8Array(genes_file.buffer);
        var ext = genes_file.name.split('.').pop();
        if (ext == "gz") {
            content = pako.ungzip(content);
        }

        const dec = new TextDecoder();
        let genes_str = dec.decode(content);
        const tsv = d3.dsvFormat("\t");
        let parsed = tsv.parseRows(genes_str);
        if (parsed.length != cache.matrix.numberOfRows()) {
            throw "number of matrix rows is not equal to the number of genes in '" + genes_file.name + "'";
        }

        var ids = [], symb = [];
        parsed.forEach(x => {
            ids.push(x[0]);
            symb.push(x[1]);
        });

        cache.genes = { "id": ids, "symbol": symb };
    } else {
        cache.genes = dummyGenes(cache.matrix.numberOfRows());
    }

    permuteGenes(cache.genes);
    return;
}

function loadMatrixMarket(args) {
    var reader = new FileReaderSync();

    // First pass computes an abbreviated version to quickly check for changes.
    // Second pass does the actual readArrayBuffer.
    for (var it = 0; it < 2; it++) {
        var formatted = { "type": "MatrixMarket", "files": [] };

        var bufferFun;
        if (it == 0) {
            bufferFun = (f) => f.size;
        } else {
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }

        for (const f of args.mtx) {
            formatted.files.push({ "type": "mtx", "name": f.name, "buffer": bufferFun(f) });
        }

        if (args.gene !== null) {
            if (args.gene.length !== 1) {
                throw "expected no more than one gene file";
            }
            var genes_file = args.gene[0];
            formatted.files.push({ "type": "genes", "name": genes_file.name, "buffer": bufferFun(genes_file) });
        }

        if (it == 0) {
            if (!utils.changedParameters(abbreviated, formatted)) {
                changed = false;
                return;
            } else {
                abbreviated = formatted;
                changed = true;
            }
        } else {
            parameters = formatted;
            loadMatrixMarketRaw(formatted.files);
            delete cache.reloaded;
        }
    }

    return;
}

/** HDF5 **/

function guessPath(f) {
    var fkeys = f.keys();
    if (fkeys.indexOf("X") != -1) {
        return "X";
    } else if (fkeys.indexOf("matrix") != -1) {
        return "matrix";
    } else {
        var sparse_opts = [];
        var dense_opts = [];

        // Try to pick out sparse formats.
        for (const key of fkeys) {
            var current = f.get(key);
            if (current instanceof hdf5.Group) {
                var cur_keys = current.keys();
                if (cur_keys.indexOf("data") != -1 && cur_keys.indexOf("indices") && cur_keys.indexOf("indptr")) {
                    sparse_opts.push(key);
                }
            } else if (current instanceof hdf5.Dataset && current.shape.length == 2) {
                dense_opts.push(key);
            }
        }

        if (sparse_opts.length) {
            return sparse_opts[0];
        } else if (dense_opts.length) {
            return dense_opts[0];
        } else {
            throw "could not automatically find a suitable 'path' inside the HDF5 file";
        }
    }

    return null;
}

function guessGenesFromH5AD(f) {
    var fkeys = f.keys();

    // Does it have a 'var' group?
    if (fkeys.indexOf("var") == -1) {
        return null;
    }

    var vars = f.get("var");
    if (!(vars instanceof hdf5.Group)) {
        return null;
    }

    var vkeys = vars.keys();
    if (vkeys.indexOf("_index") == -1) {
        return null;
    }

    let index = vars.get("_index");
    if (!(index instanceof hdf5.Dataset)) {
        return null;
    }

    let output = { "_index": index.value };

    // Also include anything else that might be a gene symbol.
    for (const key of vkeys) {
        if (key == "_index") {
            continue;
        }

        if (key.match(/name/i) || key.match(/symbol/i)) {
            let current = vars.get(key);
            if (current instanceof hdf5.Dataset) {
                output[field] = current.value;
            }
        }
    }

    return output;
}

function guessGenesFrom10x(f) {
    var fkeys = f.keys();
    
    // Does it have a 'matrix' group with a "features" subgroup?
    if (fkeys.indexOf("matrix") == -1) {
        return null;
    }

    var mat = f.get("matrix");
    if (!(mat instanceof hdf5.Group)) {
        return null;
    }

    var mkeys = mat.keys();
    if (mkeys.indexOf("features") == -1) {
        return null;
    }

    var feats = mat.get("features");
    if (!(feats instanceof hdf5.Group)) {
        return null;
    }

    var featkeys = feats.keys();
    if (featkeys.indexOf("id") == -1) {
        return null;
    }

    var featid = feats.get("id");
    if (!(featid instanceof hdf5.Dataset)) {
        return null;
    }

    var output = { id: featid.value };

    var name_index = featkeys.indexOf("name");
    if (name_index != -1) {
        var featname = feats.get("name");
        if (featname instanceof hdf5.Dataset) {
            output.name = featname.value;
        }
    }
    
    return output;
}

function guessGenesFromHDF5(f) {
    {
        let output = guessGenesFromH5AD(f);
        if (output !== null) {
            return output;
        }
    }

    {
        let output = guessGenesFrom10x(f);
        if (output !== null) {
            return output;
        }
    }

    return null;
}

function loadHDF5Raw(files) {
    utils.freeCache(cache.matrix);

    // In theory, we could support multiple HDF5 buffers.
    var first_file = files[0];
    var tmppath = "rabbit-temp.h5";
    try {
        hdf5.FS.writeFile(tmppath, new Uint8Array(first_file.buffer));
        var f = new hdf5.File(tmppath, "r");
        try {
            var path = guessPath(f); 
            cache.matrix = scran.initializeSparseMatrixFromHDF5Buffer(f, path);
            cache.genes = guessGenesFromHDF5(f);
        } finally {
            f.close();
        }
    } finally {
        hdf5.FS.unlink(tmppath);
    }

    if (cache.genes === null) {
        cache.genes = dummyGenes(cache.matrix.numberOfRows());
    }
    permuteGenes(cache.genes);
    return;
}

function loadHDF5(args) {
    var reader = new FileReaderSync();

    // First pass computes an abbreviated version to quickly check for changes.
    // Second pass does the actual readArrayBuffer.
    for (var it = 0; it < 2; it++) {
        var formatted = { "type": "HDF5", "files": [] };

        var bufferFun;
        if (it == 0) {
            bufferFun = (f) => f.size;
        } else {
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }

        for (const f of args.file) {
            formatted.files.push({ "type": "h5", "name": f.name, "buffer": bufferFun(f) });
        }

        if (it == 0) {
            if (!utils.changedParameters(abbreviated, formatted)) {
                changed = false;
                return;
            } else {
                abbreviated = formatted;
                changed = true;
            }
        } else {
            parameters = formatted;
            loadHDF5Raw(formatted.files);
            delete cache.reloaded;
        }
    }

    return;
}

/** Public functions (standard) **/
export function compute(args) {
    switch (args.format) {
        case "mtx":
            loadMatrixMarket(args.files);
            break;
        case "hdf5":
        case "tenx":
        case "h5ad":
            loadHDF5(args.files);
            break;
        case "kana":
            // do nothing, this is handled by unserialize.
            break;
        default:
            throw "unknown matrix file extension: '" + args.format + "'";
    }
    return;
}

export function results() {
    var output = { "dimensions": fetchDimensions() }
    if ("reloaded" in cache) {
        output.genes = { ...cache.reloaded.genes };
    } else {
        output.genes = { ...cache.genes };
    }
    return output;
}

export function serialize() {
    var contents = {};
    if ("reloaded" in cache) {
        contents.genes = { ...cache.reloaded.genes };
        contents.num_cells = cache.reloaded.num_cells;
    } else {
        contents.genes = { ...cache.genes };
        contents.num_cells = cache.matrix.numberOfColumns();
    }

    // Making a deep-ish clone of the parameters so that any fiddling with
    // buffers during serialization does not compromise internal state.
    var parameters2 = { ...parameters };
    parameters2.files = parameters.files.map(x => { return { ...x }; });

    return {
      "parameters": parameters2,
      "contents": contents
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

/** Public functions (custom) **/
export function fetchCountMatrix() {
    if ("reloaded" in cache) {
        if (parameters.type == "MatrixMarket") {
            loadMatrixMarketRaw(parameters.files); 
        } else {
            loadHDF5Raw(parameters.files);
        }
    }
    return cache.matrix;
}

export function fetchDimensions() {
    if ("reloaded" in cache) {
        return {
            // This should contain at least one element,
            // and all of them should have the same length,
            // so indexing by the first element is safe.
            "num_genes": Object.values(cache.reloaded.genes)[0].length,
            "num_cells": cache.reloaded.num_cells
        };
    } else {
        return {
            "num_genes": cache.matrix.numberOfRows(),
            "num_cells": cache.matrix.numberOfColumns()
        };
    }
}

export function fetchGenes() {
    if ("reloaded" in cache) {
        return cache.reloaded.genes;
    } else {
        return cache.genes;
    }
}