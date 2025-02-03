import React, { useEffect } from "react";
import '@quantumblack/kedro-viz/lib/styles/styles.min.css';
import KedroViz from "@quantumblack/kedro-viz";
const vscodeApi = window.acquireVsCodeApi();

function App() {
  const [data, setData] = React.useState({ nodes: [], edges: [] });
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const toolbarOptions = {
    labelBtn: true,
    layerBtn: true,
    expandPipelinesBtn: false,
    exportBtn: false,
  };

  useEffect(() => {
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
      console.log("Received message from extension", event);
      const message = event.data;
      switch (message.command) {
        case "updateData":
          if (message.data) {
            setData(message.data);
            setLoading(false);
          } else {
            setLoading(true);
            setError(true);
          }
          break;
        case "filterPipeline":
          if (message.pipelineName) {
            console.log("Filtering pipeline:", message.pipelineName);
            // Filter the data based on the pipeline name
            const filteredData = filterDataByPipeline(data, message.pipelineName);
            console.log("Filtered Data:", filteredData);
            setData(filteredData);
          }
          break;
        default:
          break;  
      }
    });

    return () => {
      window.removeEventListener("message", () => {console.log("removed")});
    };

  }, [data]);

  function filterDataByPipeline(data, pipelineName) {
    const filteredNodes = data.nodes.filter((node) =>
      node.pipelines.includes(pipelineName)
    );
  
    // Filter edges so they only connect nodes in this pipeline
    const nodeIDs = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter(
      (edge) => nodeIDs.has(edge.source) && nodeIDs.has(edge.target)
    );
  
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }

  const handleNodeClick = (node) => {
    if (node) {
      vscodeApi.postMessage({
        command: "fromWebview",
        node: {
          type:node.type,
          text:node.fullName
        },
      });
    }
  };

  const handleOutputClick = () => {
      vscodeApi.postMessage({
        command: "showOutput",
        showOutput: true,
      });
    
  };

  const showMessages = () => {
    if (error) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: `100vh` }}>
          <h2 style={{ textAlign: "center" }}>
            {"Error: couldn't display Kedro Viz, check "}
            <span style={{ textDecoration: "underline", cursor: "pointer", color: "#00bcff" }} onClick={handleOutputClick}> output</span>
            {" logs for more information."}
          </h2>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: `100vh` }}>
        <h2 style={{ textAlign: "center" }}>{'Loading Kedro Viz...'}</h2>
      </div>
    );
  };

  const handleActionCallback = (action) => {
    if (action) {
      switch (action.type) {
        case "TOGGLE_NODE_CLICKED":
          handleNodeClick(action.payload);
          break;
        default:
          break;
      }
    }
  };

  return (
      <div style={{ height: `90vh`, width: `100%` }}>
        {loading ? showMessages() : (<KedroViz
          data={data}
          onActionCallback={handleActionCallback}
          options={{
            display: {
              globalNavigation: false,
              metadataPanel: false,
              miniMap: false,
              sidebar: true,
              ...toolbarOptions,
            },
            behaviour: { 
              reFocus: false,
            },
            visible: {
              slicing: false,
            },
            layer: {visible: false},
          }}
        />)}
    </div>
  );
}

export default App;
