import React, { useEffect } from "react";
import "my-kviz/lib/styles/styles.min.css";
import KedroViz from "my-kviz";
const vscodeApi = window.acquireVsCodeApi();

function App() {
  const [theme, setTheme] = React.useState("dark");
  const [data, setData] = React.useState({ nodes: [], edges: [] });
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
      console.log("Received message from extension", event);
      const message = event.data;
      switch (message.command) {
        case "updateTheme":
          setTheme(message.theme);
          break;
        case "updateData":
          setData(JSON.parse(message.data));
          setLoading(false);
          break;
        default:
          break;  
      }
    });

    return () => {
      window.removeEventListener("message", () => {console.log("removed")});
    };

  }, [theme]);

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

  return (
      <div style={{ height: `90vh`, width: `100%` }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: `100vh` }}>
            <h2>Loading Kedro Viz...</h2>
          </div>
        ) : (<KedroViz
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
            theme: theme,
          }}
        />)}
    </div>
  );
}

export default App;
