import React, { useEffect } from "react";
import "my-kviz/lib/styles/styles.min.css";
import KedroViz from "my-kviz";
const vscodeApi = window.acquireVsCodeApi();

function App() {
  const [data, setData] = React.useState({ nodes: [], edges: [] });
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

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
            setError("Error: couldn't display Kedro Viz, check logs for more information. Output > kedro");
          }
          break;
        case "notification":
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

  const showMessages = () => {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: `100vh` }}>
        <h2 style={{ textAlign: "center" }}>{error || 'Loading Kedro Viz...'}</h2>
      </div>
    );
  }

  return (
      <div style={{ height: `90vh`, width: `100%` }}>
        {loading ? showMessages() : (<KedroViz
          data={data}
          onNodeClickCallback={handleNodeClick}
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
