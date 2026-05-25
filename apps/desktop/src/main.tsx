import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

type NaisState = "idle" | "listening" | "thinking" | "speaking" | "success" | "warning" | "error";

const stateLabels: Record<NaisState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

function App() {
  const [state, setState] = React.useState<NaisState>("idle");

  return (
    <main className="shell">
      <section className="assistant-card" aria-label="NAIS desktop assistant shell">
        <div className="orb" data-state={state} aria-hidden="true">
          <div className="orb-core" />
        </div>

        <div className="content">
          <p className="eyebrow">NAIS Desktop</p>
          <h1>Nano Assistant Intelligence System</h1>
          <p className="summary">
            Tauri + React shell ready for Live2D, VRM, character packs, and an OpenClaw-compatible
            gateway adapter.
          </p>

          <div className="status-row">
            <span className="status-dot" data-state={state} />
            <span>State: {stateLabels[state]}</span>
          </div>

          <div className="state-grid" aria-label="Character state controls">
            {(Object.keys(stateLabels) as NaisState[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setState(key)}
                aria-pressed={state === key}
              >
                {stateLabels[key]}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
