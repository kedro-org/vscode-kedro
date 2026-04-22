import React, { useEffect } from "react";
import '@quantumblack/kedro-viz/lib/styles/styles.min.css';
import KedroViz from "@quantumblack/kedro-viz";
const vscodeApi = window.acquireVsCodeApi();

function App() {
  const [data, setData] = React.useState({ nodes: [], edges: [] });
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [theme, setTheme] = React.useState('dark');
  const containerRef = React.useRef(null);

  const toolbarOptions = {
    labelBtn: true,
    layerBtn: true,
    expandPipelinesBtn: true,
    exportBtn: false,
    filterBtn: true,
  };

  useEffect(() => {
    // Clear local storage to avoid persisting data
    localStorage.clear();

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
        case "updateTheme":
          if (message.theme) {
            setTheme(message.theme);
          }
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

  // Set data-vscode-context on right-click using Kedro Viz's data-node-type/data-node-fullname attributes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContextMenu = (event) => {
      const nodeEl = event.target.closest('[data-node-type="task"]');
      const context = nodeEl
        ? {
            webviewSection: "kedroTaskNode",
            canonicalName: nodeEl.getAttribute("data-node-fullname"),
            type: "task",
            preventDefaultContextMenuItems: false,
          }
        : { webviewSection: "kedroViz", preventDefaultContextMenuItems: false };
      container.setAttribute("data-vscode-context", JSON.stringify(context));
    };

    container.addEventListener("contextmenu", handleContextMenu, true);
    return () => container.removeEventListener("contextmenu", handleContextMenu, true);
  }, []);

  const handlePipelineFilterClick = () => {
    vscodeApi.postMessage({
      command: "showPipelineFilter",
    });
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
        case "NODE_CONTEXT_MENU":
          // Handled by data-vscode-context attributes set in the contextmenu listener above
          break;
        case "SHOW_PIPELINE_FILTER":
          handlePipelineFilterClick();
          break;
        default:
          break;
      }
    }
  };

  return (
      <div
        ref={containerRef}
        style={{ height: `90vh`, width: `100%`, position: "relative" }}
        data-vscode-context={JSON.stringify({ webviewSection: "kedroViz", preventDefaultContextMenuItems: false })}
      >
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
