import React from "react";
import PCABarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import { useContext } from 'react';
import { AppContext } from './../../context/AppContext';
import { Card, Elevation } from "@blueprintjs/core";
import QCPlotMgr from "../Plots/QCPlotMgr";

import './Gallery.css';

const Gallery = () => {
  const { pcaVarExp, qcData, clusterData } = useContext(AppContext);

  return (
    <>
      <div className="gallery-cont">
        {
          clusterData ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5># of cells per cluster</h5>
              <ClusterBarPlot data={clusterData} />
            </Card>
            : ""
        }
        {
          pcaVarExp ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>PCA (% variance explained)</h5>
              <PCABarPlot pca={pcaVarExp} />
            </Card>
            : ""
        }
        {
          qcData && qcData?.["thresholds"] ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>QC Statistics</h5>
              <QCPlotMgr data={qcData} />
            </Card>
            : ""
        }
      </div>
    </>
  );
};

export default Gallery;
