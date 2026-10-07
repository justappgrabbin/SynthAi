import React from "react";
import {
  SYNTHIA_API_URL,
  SYNTHIA_WS_URL,
  connectSynthiaSocket,
  synthiaApi,
} from "../lib/synthiaApi";

type BootLine = {
  id: string;
  level: "info" | "ok" | "warn" | "error";
  text: string;
};

function line(level: BootLine["level"], text: string): BootLine {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, level, text };
}

export default function BootTerminal() {
  const [open, setOpen] = React.useState(true);
  const [booting, setBooting] = React.useState(true);
  const [token, setToken] = React.useState(() => localStorage.getItem("synthaipro.terminalToken") || "");
  const [command, setCommand] = React.useState("node -v && npm -v");
  const [lines, setLines] = React.useState<BootLine[]>([]);

  const append = React.useCallback((entry: BootLine) => {
    setLines((current) => [...current, entry].slice(-80));
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBooting(true);
      append(line("info", "Booting SynthAIPro self-service console..."));
      append(line("info", `API: ${SYNTHIA_API_URL || "same-origin"}`));
      append(line("info", `WS: ${SYNTHIA_WS_URL || "same-origin /ws"}`));

      try {
        const health = await synthiaApi.health();
        if (cancelled) return;
        append(line("ok", `Synthia server healthy: ${health.service || health.version || "online"}`));
      } catch (error: any) {
        if (cancelled) return;
        append(line("warn", `Server health not ready: ${error.message}`));
      }

      try {
        const status = await synthiaApi.synthiaStatus();
        if (cancelled) return;
        append(line("ok", `Synthia status loaded: ${status.status || status.database || "ready"}`));
      } catch (error: any) {
        if (cancelled) return;
        append(line("warn", `Status route waiting: ${error.message}`));
      }

      const socket = connectSynthiaSocket(
        (message) => append(line("ok", `Live event: ${JSON.stringify(message).slice(0, 220)}`)),
        (status) => append(line(status === "connected" ? "ok" : "info", `Socket ${status.replace("_", " ")}`))
      );

      setTimeout(() => socket.close(), 3500);
      setBooting(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [append]);

  async function runCommand() {
    localStorage.setItem("synthaipro.terminalToken", token);
    append(line("info", `$ ${command}`));

    try {
      const response = await fetch(`${SYNTHIA_API_URL}/terminal/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-terminal-token": token,
        },
        body: JSON.stringify({ command }),
      });
      const text = await response.text();
      append(line(response.ok ? "ok" : "error", text.slice(0, 4000)));
    } catch (error: any) {
      append(line("error", error.message));
    }
  }

  if (!open) {
    return (
      <button className="boot-terminal-tab" type="button" onClick={() => setOpen(true)}>
        Terminal
      </button>
    );
  }

  return (
    <section className="boot-terminal" aria-label="Self-service terminal">
      <header>
        <div>
          <strong>{booting ? "Autobooting" : "Self-Service Terminal"}</strong>
          <span>Boot checks, server control, and phone-friendly diagnostics.</span>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Hide terminal">
          Hide
        </button>
      </header>

      <div className="boot-terminal-output" role="log" aria-live="polite">
        {lines.map((entry) => (
          <p key={entry.id} className={`boot-line boot-line-${entry.level}`}>
            {entry.text}
          </p>
        ))}
      </div>

      <div className="boot-terminal-controls">
        <input
          aria-label="Terminal token"
          type="password"
          placeholder="TERMINAL_TOKEN"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <input
          aria-label="Command"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") runCommand();
          }}
        />
        <button type="button" onClick={runCommand}>
          Run
        </button>
      </div>
    </section>
  );
}
