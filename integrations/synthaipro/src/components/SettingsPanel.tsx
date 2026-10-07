import React from "react";
import { synthiaApi } from "../lib/synthiaApi";

export default function SettingsPanel() {
  const [settings, setSettings] = React.useState<any>(null);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    synthiaApi
      .runtimeSettings()
      .then(setSettings)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="settings-panel">
      <button type="button" className="settings-toggle" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide Settings" : "Settings"}
      </button>

      {open && (
        <div className="settings-body">
          <h2>Runtime Settings</h2>
          {error && <p className="settings-error">{error}</p>}

          <article>
            <h3>MCP</h3>
            <p>MCP routes are kept here so they are easy to find when you connect tools later.</p>
            <pre>{JSON.stringify(settings?.mcp || {}, null, 2)}</pre>
          </article>

          <article>
            <h3>Hugging Face</h3>
            <p>Namespace: <strong>{settings?.huggingface?.namespace || "stellarproximology"}</strong></p>
            <p>Token configured: <strong>{settings?.huggingface?.token_configured ? "yes" : "no"}</strong></p>
          </article>

          <article>
            <h3>Storage</h3>
            <p>Supabase configured: <strong>{settings?.storage?.supabase_configured ? "yes" : "no"}</strong></p>
            <p>Bucket: <strong>{settings?.storage?.supabase_bucket || "synthia-apps"}</strong></p>
          </article>

          <article>
            <h3>Self Editing</h3>
            <p>Enabled as a guarded workflow: request, preview diff, approve, apply, test.</p>
          </article>
        </div>
      )}
    </section>
  );
}
