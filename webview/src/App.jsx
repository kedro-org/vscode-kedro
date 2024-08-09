import React, { useEffect } from "react";
import "my-kviz/lib/styles/styles.min.css";
import spaceflights from "my-kviz/lib/utils/data/spaceflights.mock.json";
import KedroViz from "my-kviz";
const vscodeApi = window.acquireVsCodeApi();

function App() {
  const [theme, setTheme] = React.useState("dark");
  const [data, setData] = React.useState(spaceflights);

  useEffect(() => {
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
      console.log("Received message from extension", event);
      const message = event.data; // The json data that the extension sent
      switch (message.command) {
        case "updateTheme":
          setTheme(message.theme);
          break;
        case "updateData":
          setData(JSON.parse(message.data));
          break;
        default:
          break;  
      }
    });

    return () => {
      window.removeEventListener("message", () => {console.log("removed")});
    };

  }, [theme]);

  const sendMessageToExtension = () => {
    vscodeApi.postMessage({
      command: "fromWebview",
      text: "prm_spine_table",
    });
  };

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
      <KedroViz
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
      />
      <button
        style={{ position: "absolute", zIndex: 999, top: 0 }}
        onClick={sendMessageToExtension}
      >
      Goto: "prm_spine_table"
      </button>
    </div>
  );
}

export default App;
