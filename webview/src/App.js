import React, { useEffect } from "react";
import "@quantumblack/kedro-viz/lib/styles/styles.min.css";
import spaceflights from "@quantumblack/kedro-viz/lib/utils/data/spaceflights.mock.json";
import KedroViz from "@quantumblack/kedro-viz";

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
    const vscode = window.acquireVsCodeApi();
    vscode.postMessage({
      command: "fromWebview",
      text: "Hello from the webview!",
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
        Send Message to Extension
      </button>
    </div>
  );
}

export default App;
