"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fbf8f2",
          color: "#1f1a16",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6f6153", margin: "0 0 20px" }}>
            The application hit an unexpected error. Please reload to continue.
          </p>
          {error.digest ? (
            <p style={{ color: "#8f8171", fontSize: 12, margin: "0 0 20px" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#c22a1b",
              color: "#fff",
              border: "none",
              borderRadius: 9999,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}