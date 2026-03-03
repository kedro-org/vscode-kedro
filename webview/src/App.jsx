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
  const suppressNextNodeClickRef = React.useRef(false);
  const clearSuppressionTimerRef = React.useRef(null);

  const toolbarOptions = {
    labelBtn: true,
    layerBtn: true,
    expandPipelinesBtn: true,
    exportBtn: false,
    filterBtn: true,
  };

  const defaultContext = React.useMemo(
    () => JSON.stringify({ webviewSection: "kedroViz", preventDefaultContextMenuItems: false }),
    []
  );
  const defaultContextObject = React.useMemo(
    () => ({ webviewSection: "kedroViz", preventDefaultContextMenuItems: false }),
    []
  );
  const postDebug = React.useCallback((text, data = {}) => {
    vscodeApi.postMessage({
      command: "debugLog",
      text,
      data,
    });
  }, []);

  /**
   * Resolve VS Code webview context for a right-click event.
   *
   * Why this is non-trivial:
   * - Kedro Viz renders nodes as SVG groups with nested children.
   * - Right-click target is often an inner SVG element (rect/path/text), not the group itself.
   * - We must map the clicked element back to the task-node group and extract canonical node data.
   *
   * Strategy:
   * 1) Find nearest `.pipeline-node--task` via `closest(...)`.
   * 2) If not found, scan `event.composedPath()` for a task-node group.
   * 3) Prefer D3-bound datum (`__data__`) for canonical name.
   * 4) Fallback to `data-id` lookup against `data.nodes`.
   * 5) Return `undefined` for non-task/unknown targets so menu stays hidden.
   */
  const getTaskNodeContext = React.useCallback(
    (event) => {
      let taskNodeElement = event?.target?.closest?.(".pipeline-node--task");

      if (!taskNodeElement && typeof event?.composedPath === "function") {
        const path = event.composedPath();
        taskNodeElement = path.find(
          (element) => element?.classList?.contains?.("pipeline-node--task")
        );
      }

      if (!taskNodeElement) {
        return undefined;
      }

      // Kedro Viz uses D3; DOM nodes often carry bound datum in __data__.
      const boundNode = taskNodeElement.__data__ || event?.target?.__data__;
      if (boundNode?.type === "task" && boundNode?.fullName) {
        return {
          webviewSection: "kedroTaskNode",
          canonicalName: boundNode.fullName,
          type: "task",
          preventDefaultContextMenuItems: false,
        };
      }

      const nodeId = taskNodeElement.getAttribute("data-id");
      const selectedNode = data.nodes.find((node) => node.id === nodeId);
      if (!selectedNode?.fullName || selectedNode?.type !== "task") {
        return undefined;
      }

      return {
        webviewSection: "kedroTaskNode",
        canonicalName: selectedNode.fullName,
        type: "task",
        preventDefaultContextMenuItems: false,
      };
    },
    [data]
  );

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    /**
     * Capture-phase native contextmenu handler.
     *
     * This runs before VS Code evaluates `webview/context` menu `when` clauses.
     * We stamp `data-vscode-context` on container/target/path elements so whichever
     * DOM element VS Code reads for the menu context has the correct payload.
     */
    const handleNativeContextMenu = (event) => {
      const taskNodeContext = getTaskNodeContext(event);
      const contextValue = JSON.stringify(taskNodeContext ?? defaultContextObject);
      const targetClass = event.target?.className?.baseVal || event.target?.className || "";
      const pathPreview = typeof event.composedPath === "function"
        ? event.composedPath().slice(0, 6).map((el) => el?.className?.baseVal || el?.className || el?.tagName || typeof el)
        : [];
      postDebug("contextmenu detected", {
        targetTag: event.target?.tagName || "",
        targetClass: String(targetClass),
        hasTaskContext: Boolean(taskNodeContext),
        canonicalName: taskNodeContext?.canonicalName || "",
        pathPreview,
      });

      container.setAttribute("data-vscode-context", contextValue);
      document.body.setAttribute("data-vscode-context", contextValue);
      if (event.target?.setAttribute) {
        event.target.setAttribute("data-vscode-context", contextValue);
      }

      // Ensure VS Code can resolve the context from any element in the right-click event path.
      if (typeof event.composedPath === "function") {
        event.composedPath().forEach((element) => {
          if (element?.setAttribute) {
            element.setAttribute("data-vscode-context", contextValue);
          }
        });
      }
      postDebug("contextmenu context applied", {
        context: taskNodeContext ?? defaultContextObject,
      });

      // Kedro Viz callback doesn't expose mouse button metadata. When right-clicking on a task node,
      // suppress only the immediately following node-click callback to avoid accidental navigation.
      suppressNextNodeClickRef.current = Boolean(taskNodeContext);
      if (clearSuppressionTimerRef.current) {
        window.clearTimeout(clearSuppressionTimerRef.current);
      }
      clearSuppressionTimerRef.current = window.setTimeout(() => {
        suppressNextNodeClickRef.current = false;
        clearSuppressionTimerRef.current = null;
      }, 300);
    };

    // Capture phase ensures context is prepared before VS Code evaluates menu conditions.
    container.addEventListener("contextmenu", handleNativeContextMenu, true);
    return () => {
      container.removeEventListener("contextmenu", handleNativeContextMenu, true);
    };
  }, [defaultContextObject, getTaskNodeContext]);

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
          if (suppressNextNodeClickRef.current) {
            postDebug("node click suppressed after contextmenu", {
              nodeId: action.payload?.id || "",
              nodeType: action.payload?.type || "",
            });
            suppressNextNodeClickRef.current = false;
            return;
          }
          handleNodeClick(action.payload);
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
        data-vscode-context={defaultContext}
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
