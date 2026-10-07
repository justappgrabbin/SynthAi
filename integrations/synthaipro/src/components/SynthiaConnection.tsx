import React from "react";
import {
  SYNTHIA_API_URL,
  SYNTHIA_WS_URL,
  connectSynthiaSocket,
  synthiaApi,
} from "../lib/synthiaApi";

type SocketStatus = "connecting" | "connected" | "closed" | "error" | "not_configured";

export default function SynthiaConnection() {
  const [health, setHealth] = React.useState<any>(null);
  const [events, setEvents] = React.useState<any[]>([]);
  const [socketStatus, setSocketStatus] = React.useState<SocketStatus>("connecting");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    synthiaApi
      .health()
      .then(setHealth)
      .catch((err) => setError(err.message));

    const socket = connectSynthiaSocket(
      (message) => setEvents((current) => [message, ...current].slice(0, 5)),
      setSocketStatus
    );

    return () => socket.close();
  }, []);

  return (
    <section
      className="synthia-connection"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "75vh",
        overflow: "auto",
        padding: 16,
        borderRadius: 16,
        background: "rgba(10, 10, 20, 0.92)",
        color: "white",
        border: "1px solid rgba(255,255,255,0.16)",
        fontFamily: "system-ui, sans-serif",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}
    >
      <strong>Synthia wires</strong>

      <p style={{ margin: "8px 0" }}>
        API: <code>{SYNTHIA_API_URL || "not configured"}</code>
      </p>

      <p style={{ margin: "8px 0" }}>
        WS: <code>{SYNTHIA_WS_URL || "not configured"}</code>
      </p>

      <p style={{ margin: "8px 0" }}>
        Socket: <strong>{socketStatus.replace("_", " ")}</strong>
      </p>

      {socketStatus === "not_configured" && (
        <pre style={{ color: "#ffd98a", whiteSpace: "pre-wrap" }}>
          Add VITE_SYNTHIA_API_URL and VITE_SYNTHIA_WS_URL to the deployment environment to enable live Synthia wires.
        </pre>
      )}

      {error && (
        <pre style={{ color: "#ff8a8a", whiteSpace: "pre-wrap" }}>{error}</pre>
      )}

      {health && (
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      )}

      {events.length > 0 && (
        <>
          <strong>Live events</strong>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {JSON.stringify(events, null, 2)}
          </pre>
        </>
      )}
    </section>
  );
}
