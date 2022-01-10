var kanaDB;
var init = null;

export function initialize() {
    init = new Promise(resolve => {
        // initialize database on worker creation
        kanaDB = indexedDB.open("KanaDB");

        kanaDB.onupgradeneeded = (e) => {
            var kanaDBClient = e.target.result;
            kanaDBClient.createObjectStore("analysis", { keyPath: 'id' });
            kanaDBClient.createObjectStore("analysis_files", { keyPath: 'id' });
            kanaDBClient.createObjectStore("file", { keyPath: 'id' });
            kanaDBClient.createObjectStore("file_ref_count", { keyPath: 'id' });
        };

        // Send existing stored analyses, if available.
        kanaDB.onsuccess = () => {
            getRecordsResolver(resolve);
        };

        kanaDB.onerror = () => {
            resolve(null);
        };
    });

    return init;
}

function getRecordsResolver(resolve) {
    var allAnalysis = kanaDB.result
        .transaction(["analysis"], "readonly")
        .objectStore("analysis").getAllKeys();

    allAnalysis.onsuccess = function () {
        resolve(allAnalysis.result);
    };
    allAnalysis.onerror = function () {
        resolve(null);
    };
}

async function loadContent(id, store) {
    return new Promise(resolve => {
        let request = store.get(id);
        request.onsuccess = function () {
            if (request.result !== undefined) {
                resolve(request.result.payload);
            } else {
                resolve(null);
            }
        };
        request.onerror = function () {
            resolve(null);
        };
    });
}

function allOK(promises) {
    return Promise.allSettled(promises)
        .then(vals => {
            for (const x of vals) {
                if (!x) {
                    return false;
                }
            }
            return true;
        });
}

export async function getRecords() {
    await init;
    return new Promise(resolve => {
        getRecordsResolver(resolve);
    });
}

export async function saveFile(id, buffer) {
    await init;
    let trans = kanaDB.result.transaction(["file", "file_ref_count"], "readwrite");
    let file_store = trans.objectStore("file");
    let ref_store = trans.objectStore("file_ref_count");

    var refcount = await loadContent(id, ref_store);
    if (refcount === null) {
        refcount = 0;
    }
    refcount++;

    var data_saving = new Promise(resolve => {
        var putrequest = file_store.put({ "id": id, "payload": buffer });
        putrequest.onsuccess = function (event) {
            resolve(true);
        };
        putrequest.onerror = function (event) {
            resolve(false);
        };
    });

    var ref_saving = new Promise(resolve => {
        var putrequest = ref_store.put({ "id": id, "payload": refcount });
        putrequest.onsuccess = function (event) {
            resolve(true);
        };
        putrequest.onerror = function (event) {
            resolve(false);
        };
    });

    return allOK([data_saving, ref_saving])
}

export async function saveAnalysis(id, state, files) {
    await init;
    let trans = kanaDB.result.transaction(["analysis", "analysis_files"], "readwrite")
    let analysis_store = trans.objectStore("analysis");
    let file_id_store = trans.objectStore("analysis_files");

    var data_saving = new Promise(resolve => {
        var putrequest = analysis_store.put({ "id": id, "payload": state });
        putrequest.onsuccess = function (event) {
            resolve(true);
        };
        putrequest.onerror = function (event) {
            resolve(false);
        };
    });

    var id_saving = new Promise(resolve => {
        var putrequest = file_id_store.put({ "id": id, "payload": files });
        putrequest.onsuccess = function (event) {
            resolve(true);
        };
        putrequest.onerror = function (event) {
            resolve(false);
        };
    });

    return allOK([data_saving, id_saving])
}

export async function loadFile(id) {
    await init;
    let file_store = kanaDB.result
        .transaction(["file"], "readonly")
        .objectStore("file");
    return loadContent(id, file_store);
}

export async function loadAnalysisfunction (id) {
    await init;
    let analysis_store = kanaDB.result
        .transaction(["analysis"], "readonly")
        .objectStore("analysis");
    return loadContent(id, analysis_store);
}

export async function removeFile(id) {
    await init;
    let trans = kanaDB.result.transaction(["file", "file_ref_count"], "readwrite");
    let file_store = trans.objectStore("file");
    let ref_store = trans.objectStore("file_ref_count");

    var promises = [];
    var refcount = await loadContent(id, file_ref_count);
    refcount--;

    if (refcount == 0) {
        promises.push(new Promise(resolve => {
            let request = file_store.remove(id);
            request.onerror = function (event) {
                resolve(false);
            };
            request.onsuccess = function (event) {
                resolve(true);
            };
        }));
        promises.push(new Promise(resolve => {
            let request = ref_store.delete(id);
            request.onerror = function (event) {
                resolve(false);
            };
            request.onsuccess = function (event) {
                resolve(true);
            };
        }))
    } else {
        promises.push(new Promise(resolve => {
            let request = ref_store.put({ "id": id, "payload": refcount })
            request.onsuccess = function (event) {
                resolve(true);
            };
            request.onerror = function (event) {
                resolve(false);
            };
        }));
    }

    return allOK(promises);
}

export async function removeAnalysis(id) {
    await init;
    let trans = kanaDB.result.transaction(["analysis", "analysis_files"], "readwrite")
    let analysis_store = trans.objectStore("analysis");
    let file_id_store = trans.objectStore("analysis_files");

    var promises = [];

    promises.push(new Promise(resolve => {
        let request = analysis_store.delete(id);
        request.onsuccess = function (event) {
            resolve(true);
        };
        request.onerror = function (event) {
            resolve(false);
        };
    }));

    // Removing all files as well.
    var files = await loadContent(id, file_id_store);
    for (const f of files) {
        promises.push(x.removeFile(f));
    }

    promises.push(new Promise(resolve => {
        let request = file_id_store.delete(id);
        request.onsuccess = function (event) {
            resolve(true);
        };
        request.onerror = function (event) {
            resolve(false);
        };
    }));

    return allOK(promises);
}
