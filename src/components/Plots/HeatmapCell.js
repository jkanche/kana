import { useRef } from "react";
import * as d3 from 'd3';

const HeatmapCell = (props) => {
    const container = useRef();

    let propwidth = props?.width;
    let colorscale = props?.colorscale;
    let score = props?.score;
    let minmax = props?.minmax;

    // inverted scale - blue for +ve, red for -ve
    const detectedScale = d3.scaleSequential(d3.interpolateRdYlBu)
                .domain([minmax[1], minmax[0]]);

    if (!propwidth) {
        propwidth = "100%";
    }

    return (
        <div ref={container}
            style={{
                width: propwidth, height: '66%',
                margin: '5px', border: '1px solid gainsboro',
                alignItems: 'center',
                backgroundColor: detectedScale(score)
            }}>
                <div style={{
                    width: '100%',
                    backgroundColor: detectedScale(score),
                    height: '100%'
                }}></div>
        </div>
    );
};

export default HeatmapCell;