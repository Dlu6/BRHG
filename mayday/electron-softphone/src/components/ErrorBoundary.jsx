import React from "react";
import PropTypes from "prop-types";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

function Fallback({ error, resetErrorBoundary }) {
  return (
    <div
      style={{
        padding: "20px",
        margin: "20px",
        border: "1px solid #333",
        borderRadius: "8px",
        backgroundColor: "#1e1e1e",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <h2 style={{ margin: 0 }}>Something went wrong.</h2>
      <p style={{ opacity: 0.9 }}>
        The application encountered an error. You can try to recover.
      </p>
      <details style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>
        <summary>Error details</summary>
        {error?.message}
      </details>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          onClick={resetErrorBoundary}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2d2d2d",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 16px",
            backgroundColor: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

Fallback.propTypes = {
  error: PropTypes.object,
  resetErrorBoundary: PropTypes.func.isRequired,
};

export default function ErrorBoundary({ children }) {
  const handleError = (error, info) => {
    // Centralized logging hook
    console.error("Error caught by boundary:", error, info);
  };

  return (
    <ReactErrorBoundary FallbackComponent={Fallback} onError={handleError}>
      {children}
    </ReactErrorBoundary>
  );
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};
