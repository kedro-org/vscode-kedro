import React, { useEffect } from "react";
import "my-kviz/lib/styles/styles.min.css";
import KedroViz from "my-kviz";
const vscodeApi = window.acquireVsCodeApi();

function App() {
  const [data, setData] = React.useState({ nodes: [], edges: [] });
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
      console.log("Received message from extension", event);
      const message = event.data;
      switch (message.command) {
        case "updateData":
          setData(message.data);
          setLoading(false);
          break;
        default:
          break;  
      }
    });

    return () => {
      window.removeEventListener("message", () => {console.log("removed")});
    };

  }, []);

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
  }

  return (
      <div style={{ height: `90vh`, width: `100%` }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: `100vh` }}>
            <h2>Loading Kedro Viz...</h2>
          </div>
        ) : (<KedroViz
          data={data}
          onActionCallback={handleActionCallback}
          options={{
            display: {
              globalNavigation: false,
              metadataPanel: false,
              miniMap: false,
              sidebar: false,
            },
            layer: {visible: false},
          }}
        />)}
    </div>
  );
}

export default App;
