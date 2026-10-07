import React from "react";
import { synthiaApi } from "../lib/synthiaApi";
import "./AppRunner.css";

type UploadedApp = {
  id: string;
  name: string;
  run_command?: string;
  status?: string;
  tray?: { mounted?: boolean; source?: string };
  app_store?: { ready?: boolean; submitted?: boolean };
  ingestion?: any;
  storage?: { provider?: string; bucket?: string };
  file_count?: number;
  files?: string[];
};

export default function AppRunner() {
  const [apps, setApps] = React.useState<UploadedApp[]>([]);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [name, setName] = React.useState("");
  const [runCommand, setRunCommand] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [log, setLog] = React.useState("");

  async function refresh() {
    const result = await synthiaApi.apps();
    setApps(result.apps || []);
  }

  React.useEffect(() => {
    refresh().catch((error) => setLog(error.message));
  }, []);

  async function upload() {
    if (!selectedFiles.length) {
      setLog("Choose files or a zip first.");
      return;
    }

    setBusy("upload");
    setLog("Uploading app...");
    try {
      const result = await synthiaApi.uploadApp(selectedFiles, name, runCommand);
      setLog(JSON.stringify(result.app, null, 2));
      setSelectedFiles([]);
      setName("");
      setRunCommand("");
      await refresh();
    } catch (error: any) {
      setLog(error.message);
    } finally {
      setBusy("");
    }
  }

  async function run(app: UploadedApp, command?: string) {
    setBusy(app.id);
    setLog(`Running ${app.name}...`);
    try {
      const result = await synthiaApi.runApp(app.id, command || app.run_command);
      setLog(JSON.stringify(result.run, null, 2));
      await refresh();
    } catch (error: any) {
      setLog(error.message);
    } finally {
      setBusy("");
    }
  }

  async function sendTo(app: UploadedApp, destination: "tray" | "app_store") {
    setBusy(`${app.id}-${destination}`);
    setLog(`Sending ${app.name} to ${destination === "tray" ? "app tray" : "app store"}...`);
    try {
      const result = await synthiaApi.setAppDestination(app.id, destination);
      setLog(JSON.stringify(result.app, null, 2));
      await refresh();
    } catch (error: any) {
      setLog(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="app-runner-panel">
      <div className="app-runner-header">
        <div>
          <p>Upload + Run Center</p>
          <h2>Ingest, analyze, mount, and execute apps.</h2>
        </div>
        <button type="button" onClick={() => refresh().catch((error) => setLog(error.message))}>
          Refresh
        </button>
      </div>

      <div className="app-upload-box">
        <label>
          App name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="my-test-app" />
        </label>

        <label>
          Run command
          <input
            value={runCommand}
            onChange={(event) => setRunCommand(event.target.value)}
            placeholder="auto-detect, npm start, python app.py, node index.js"
          />
        </label>

        <label className="file-picker">
          <span>{selectedFiles.length ? `${selectedFiles.length} file(s) selected` : "Choose zip or files"}</span>
          <input
            type="file"
            multiple
            onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
          />
        </label>

        <button type="button" onClick={upload} disabled={busy === "upload"}>
          {busy === "upload" ? "Uploading..." : "Upload App"}
        </button>
      </div>

      <div className="uploaded-app-list">
        {apps.map((app) => (
          <article key={app.id} className="uploaded-app-card">
            <div>
              <strong>{app.name}</strong>
              <span>
                {app.status || "uploaded"} · {app.file_count || 0} files · {app.storage?.provider || "local"}
              </span>
            </div>
            <code>{app.run_command || "auto"}</code>
            {app.ingestion && (
              <div className="app-analysis-strip">
                <span>{app.ingestion.mountable ? "mountable original" : "regenerated runtime"}</span>
                <span>{app.ingestion.structure?.memory_object?.address?.full || "address pending"}</span>
                <span>{app.ingestion.structure?.domains?.join(", ") || "domain pending"}</span>
                <span>{app.ingestion.structure?.patterns?.map((pattern: any) => pattern.kind).join(", ") || "patterns pending"}</span>
                <span>{app.ingestion.structure?.relationships?.length || 0} relationships</span>
                <span>{app.ingestion.structure?.behaviors?.length || 0} behaviors</span>
                <span>{app.ingestion.structure?.capabilities?.length || 0} capabilities</span>
              </div>
            )}
            <div className="uploaded-app-actions">
              <button type="button" onClick={() => run(app)} disabled={busy === app.id}>
                {busy === app.id ? "Running..." : "Run"}
              </button>
              <button type="button" onClick={() => sendTo(app, "tray")} disabled={busy === `${app.id}-tray`}>
                Mount Tray
              </button>
              <button type="button" onClick={() => sendTo(app, "app_store")} disabled={busy === `${app.id}-app_store`}>
                App Store
              </button>
              {app.files?.slice(0, 3).map((file) => (
                <small key={file}>{file}</small>
              ))}
            </div>
          </article>
        ))}
      </div>

      {log && <pre className="app-runner-log">{log}</pre>}
    </section>
  );
}
