import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // Log to console in dev; in production this would go to a reporting service.
    console.error("[ErrorBoundary]", _error, _info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: "1rem",
          color: "var(--text, #e0e0e0)",
          background: "var(--surface2, #1e1e1e)",
          border: "1px solid var(--border, #333)",
          borderRadius: "0.5rem",
          fontSize: "0.82rem",
        }}>
          <strong>Something went wrong.</strong>
          <p style={{ margin: "0.4rem 0 0", color: "var(--muted, #888)" }}>
            {this.state.message}
          </p>
          <button
            style={{
              marginTop: "0.6rem",
              background: "var(--surface2, #2a2a2a)",
              border: "1px solid var(--border, #444)",
              color: "var(--text, #e0e0e0)",
              padding: "0.3rem 0.7rem",
              borderRadius: "0.3rem",
              cursor: "pointer",
              fontSize: "0.78rem",
            }}
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
