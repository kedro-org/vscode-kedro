import React, { useEffect } from "react";
import "@quantumblack/kedro-viz/lib/styles/styles.min.css";
import spaceflights from "@quantumblack/kedro-viz/lib/utils/data/spaceflights.mock.json";
import KedroViz from "@quantumblack/kedro-viz";
const vscodeApi = window.acquireVsCodeApi();

function App() {
  const [theme, setTheme] = React.useState("dark");

  useEffect(() => {
    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
      console.log("Received message from extension", event);
      const message = event.data; // The json data that the extension sent
      switch (message.command) {
        case "updateTheme":
          setTheme(message.theme);
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

  return (
    <div style={{ height: `90vh`, width: `100%` }}>
      <KedroViz
        data={spaceflights}
        options={{
          display: {
            globalNavigation: false,
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
