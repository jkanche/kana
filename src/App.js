import './App.css';
import Header from "./components/Header";
import Gallery from './components/Gallery';

import { Button, Label, Overlay, Spinner } from "@blueprintjs/core";

import { useState, useEffect, useContext } from 'react';
import { AppContext } from './context/AppContext';

import DimPlot from './components/Plots/ScatterPlot.js';
import MarkerPlot from './components/Markers';
import Pong from './components/Spinners/Pong';
import Spinner2 from './components/Spinners/Spinner2';

// App is the single point of contact with the web workers
// All requests and responses are received here

function App() {

  // show loading screen ?
  const [loading, setLoading] = useState(true);
  // props for dialogs
  const loadingProps = {
    autoFocus: true,
    canEscapeKeyClose: false,
    canOutsideClickClose: false,
    enforceFocus: true,
    hasBackdrop: true,
    usePortal: true,
    useTallContent: false,
  };

  const { setWasmInitialized, setTsneData, setRedDims, redDims,
    setInitDims, setQcDims, defaultRedDims, setDefaultRedDims,
    setQcData, qcData, setClusterData, setFSelectionData,
    setUmapData, setPcaVarExp, logs, setLogs,
    selectedCluster, clusterRank,
    selectedClusterSummary, setSelectedClusterSummary,
    reqGene, customSelection, clusterData,
    delCustomSelection, setDelCustomSelection,
    setSelectedCluster, setShowGame, showGame,
    setShowAnimation, triggerAnimation, setTriggerAnimation, params } = useContext(AppContext);

  // initializes various things on the worker side
  useEffect(() => {
    window.Worker.postMessage({
      "type": "INIT",
      "msg": "Initial Load"
    });
  }, [])

  // request worker for new markers 
  // if either the cluster or the ranking changes
  useEffect(() => {

    if (selectedCluster !== null) {
      let type = String(selectedCluster).startsWith("cs") ?
        "getMarkersForSelection" : "getMarkersForCluster";
      window.Worker.postMessage({
        "type": type,
        "payload": {
          "cluster": selectedCluster,
          "rank_type": clusterRank,
        }
      });
    }
  }, [selectedCluster, clusterRank]);

  // compute markers in the worker 
  // when a new custom selection of cells is made through the UI
  useEffect(() => {

    if (customSelection !== null && Object.keys(customSelection).length > 0) {
      let csLen = `cs${Object.keys(customSelection).length}`;
      var cs = customSelection[csLen];
      window.Worker.postMessage({
        "type": "computeCustomMarkers",
        "payload": {
          "selection": cs,
          "id": csLen
        }
      });
    }
  }, [customSelection]);

  // Remove a custom selection from cache
  useEffect(() => {
    if (delCustomSelection !== null) {
      window.Worker.postMessage({
        "type": "removeCustomMarkers",
        "payload": {
          "id": delCustomSelection
        }
      });

      setDelCustomSelection(null);
    }
  }, [delCustomSelection])

  // get expression for a gene from worker
  useEffect(() => {

    reqGene !== null && window.Worker.postMessage({
      "type": "getGeneExpression",
      "payload": {
        "gene": reqGene
      }
    });
  }, [reqGene]);

  useEffect(() => {
    triggerAnimation && defaultRedDims && window.Worker.postMessage({
      "type": "animate" + defaultRedDims,
      payload: {
        params: params[defaultRedDims.toLowerCase()]
      }
    });
  }, [triggerAnimation]);

  // callback for all responses from workers
  // all interactions are logged and shown on the UI
  window.Worker.onmessage = (msg) => {
    const payload = msg.data;

    if (payload?.msg) {
      let tmp = [...logs];
      let d = new Date();
      tmp.push(`${d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()} - ${payload?.type} - ${payload?.msg}`);

      setLogs(tmp);
    }

    if (payload.type === "INIT") {
      setLoading(false);
      setWasmInitialized(true);
    } else if (payload.type === "inputs_DATA") {
      setInitDims(`${payload.resp.dimensions.num_genes} genes, ${payload.resp.dimensions.num_cells} cells`);
    } else if (payload.type === "quality_control_metrics_DATA") {
      const { resp } = payload;
      setQcData(resp);
    } else if (payload.type === "quality_control_thresholds_DATA") {
      const { resp } = payload;
      let tmp = { ...qcData };
      tmp["thresholds"] = resp;
      setQcData(tmp);
    } else if (payload.type === "quality_control_filtered_DATA") {
      setQcDims(`${payload.resp.retained} cells`);
    } else if (payload.type === "feature_selection_DATA") {
      const { resp } = payload;
      setFSelectionData(resp);
    } else if (payload.type === "pca_DATA") {
      const { resp } = payload;
      setPcaVarExp(resp);
    } else if (payload.type === "snn_cluster_graph_DATA") {
      const { resp } = payload;
      setClusterData(resp);

      // show markers for the first cluster
      setSelectedCluster(0);
    } else if (payload.type === "tsne_DATA" || payload.type === "tsne_iter") {
      const { resp } = payload;
      setTsneData(resp);

      setShowAnimation(true);

      let tmp = [...redDims];
      tmp.push("TSNE");
      // once t-SNE is available, set this as the default display
      if (!defaultRedDims) {
        setDefaultRedDims("TSNE");
      }

      setRedDims(tmp);
      // also don't show the pong game anymore
      setShowGame(false);

      // assuming the last response is _data
      if (payload.type === "tsne_DATA") {
        setShowAnimation(false);
        setTriggerAnimation(false);
      }
      const { resp } = payload;
      setUmapData(resp);

      // enable UMAP selection
      let tmp = [...redDims];
      tmp.push("UMAP");
      setRedDims(tmp);
    } else if (payload.type === "markerGene_DATA") {
    } else if (payload.type === "setMarkersForCluster"
      || payload.type === "setMarkersForCustomSelection") {
      const { resp } = payload;
      let records = {};
      resp.means.forEach((x, i) => {
        records[resp?.genes?.[i]] = {
          "gene": resp?.genes?.[i],
          "mean": x,
          "delta": resp?.delta_detected?.[i],
          "lfc": resp?.lfc?.[i],
          "detected": resp?.detected?.[i],
          "expanded": false,
          "expr": null,
        }
      });
      setSelectedClusterSummary(records);
    } else if (payload.type === "setGeneExpression") {
      const { resp } = payload;

      let gtmp = { ...selectedClusterSummary };
      gtmp[resp.gene].expr = Object.values(resp.expr);
      setSelectedClusterSummary(gtmp);
    }
  }

  return (
    <div className="App">
      <Header />
      <div className="App-content">
        <div className="plot">
          {
            defaultRedDims ?
              <DimPlot /> :
              showGame ?
                <div style={{
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '50px'
                }}>
                  <Label>Get some coffee or play pong while you wait for the analysis to finish..</Label>
                  <Button onClick={() => { setShowGame(false) }}>I'm good, go back</Button>
                  <Pong />
                </div>
                :
                <div style={{
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '50px'
                }}>
                  <Spinner2 />
                  <Label>Get some coffee or play pong while you wait for the analysis to finish..</Label>
                  <Button onClick={() => { setShowGame(true) }}>Play Pong</Button>
                </div>
          }
        </div>
        <div className="marker">
          {clusterData ?
            <MarkerPlot /> :
            <div style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Spinner2 />
              <Label>Generating nearest neighbor graph to compute clusters....</Label>
            </div>}
        </div>
        <div className="analysis">
          <Gallery />
        </div>
      </div>
      <Overlay
        isOpen={loading}
        {...loadingProps}
      >
        <div className="spinner">
          <Spinner size={100} />
          <p>Initializing kana</p>
        </div>
      </Overlay>
    </div>
  );
}

export default App;
