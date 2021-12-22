import React, { createContext, useEffect, useState } from "react";

export const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
  // Input State
  const [inputFiles, setInputFiles] = useState({
    gene: null,
    mtx: null,
    barcode: null,
  });

  const [params, setParams] = useState({
    qc: {
      "qc-nmads": 3
    },
    fSelection: {
      "fsel-span": 0.3
    },
    pca: {
      "pca-npc": 5
    },
    cluster: {
      "clus-k": 10,
      "clus-res": 0.5,
      "clus-scheme": 0,
    },
    tsne: {
      "tsne-iter": 500,
      "tsne-perp": 30,
    },
    umap: {
      "umap-nn": 15,
      "umap-epochs": 500,
      "umap-min_dist": 0.01,
      "umap-approx_nn": true,
    },
    markerGene: {}
  });

  // wasm state and error 
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Response State for various components
  // dim sizes
  const [initDims, setInitDims] = useState(null);
  const [qcDims, setQcDims] = useState(null);
  const [fSelDims, setFSelDims] = useState(null);

  // QC Data
  const [qcData, setQcData] = useState(null);
  const [qcThreshold, setQcThreshold] = useState(null);

  // Feature Selection
  const [fSelectionData, setFSelectionData] = useState(null);

  // UI dimensions reduction dropdown
  const [redDims, setRedDims] = useState([]);
  // which dimension is selected
  const [defaultRedDims, setDefaultRedDims] = useState(null);
  // the actual dimensions
  const [plotRedDims, setPlotRedDims] = useState(null);

  // Cluster Analysis
  // cluster assignments
  const [clusterData, setClusterData] = useState(null);
  // which cluster is selected
  const [selectedCluster, setSelectedCluster] = useState(null);
  // cohen, mean scores per gene
  const [selectedClusterSummary, setSelectedClusterSummary] = useState({});
  // set cluster colors
  const [clusterColors, setClusterColors] = useState(null);

  // PCA
  const [pcaData, setPcaData] = useState(null);
  const [pcaVarExp, setPcaVarExp] = useState(null);

  // TSNE
  const [tsneData, setTsneData] = useState(null);

  // UMAP
  const [umapData, setUmapData] = useState(null);

  // geneExpression
  // what gene is selected for scatterplot
  const [gene, setGene] = useState(null);
  // request gene expression
  const [reqGene, setReqGene] = useState(null);
  // expr values per gene

  // Logs
  const [logs, setLogs] = useState([]);

  useEffect(() => {

    if (wasmInitialized && inputFiles.mtx != null) {
      window.Worker.postMessage({
        "type": "RUN",
        "payload": {
          "files": [inputFiles.mtx,
          inputFiles.barcode ? inputFiles.barcode[0] : [],
          inputFiles.gene ? inputFiles.gene[0] : []], //mtx, barcode, gene
          "params": params
        },
        "msg": "not much to pass"
      });
    }
  }, [inputFiles, params, wasmInitialized]);

  return (
    <AppContext.Provider
      value={{
        inputFiles, setInputFiles,
        params, setParams,
        error, setError,
        wasmInitialized, setWasmInitialized,
        pcaData, setPcaData,
        pcaVarExp, setPcaVarExp,
        tsneData, setTsneData,
        umapData, setUmapData,
        initDims, setInitDims,
        qcDims, setQcDims,
        qcData, setQcData,
        qcThreshold, setQcThreshold,
        fSelDims, setFSelDims,
        redDims, setRedDims,
        defaultRedDims, setDefaultRedDims,
        plotRedDims, setPlotRedDims,
        clusterData, setClusterData,
        fSelectionData, setFSelectionData,
        logs, setLogs,
        selectedCluster, setSelectedCluster,
        selectedClusterSummary, setSelectedClusterSummary,
        gene, setGene,
        clusterColors, setClusterColors,
        reqGene, setReqGene
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
