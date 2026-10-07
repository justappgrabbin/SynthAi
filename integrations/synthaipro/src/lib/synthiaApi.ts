const configuredApiUrl = import.meta.env.VITE_SYNTHIA_API_URL;
const configuredWsUrl = import.meta.env.VITE_SYNTHIA_WS_URL;

const isBrowser = typeof window !== "undefined";

function sameOriginWsUrl() {
  if (!isBrowser) return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export const SYNTHIA_API_URL = configuredApiUrl || "";

export const SYNTHIA_WS_URL =
  configuredWsUrl || (SYNTHIA_API_URL ? `${SYNTHIA_API_URL.replace(/^http/, "ws")}/ws` : sameOriginWsUrl());

export const SYNTHIA_IS_CONFIGURED = true;

function requireSynthiaApiUrl() {
  return SYNTHIA_API_URL;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiUrl = requireSynthiaApiUrl();
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

export const synthiaApi = {
  health: () => request<any>("/health"),

  synthiaStatus: () => request<any>("/api/synthia/status"),

  artifacts: (limit = 100) => request<any>(`/api/artifacts?limit=${limit}`),

  graph: () => request<any>("/api/graph"),

  runtimeSettings: () => request<any>("/api/settings/runtime"),

  build: (payload: { name: string; type?: string; html: string }) =>
    request<any>("/api/build", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  upload: async (files: File[]) => {
    const apiUrl = requireSynthiaApiUrl();
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(`${apiUrl}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return response.json();
  },

  apps: () => request<any>("/api/apps"),

  uploadApp: async (files: File[], name?: string, runCommand?: string) => {
    const apiUrl = requireSynthiaApiUrl();
    const formData = new FormData();

    if (name) formData.append("name", name);
    if (runCommand) formData.append("run_command", runCommand);

    for (const file of files) {
      formData.append("files", file, file.webkitRelativePath || file.name);
    }

    const response = await fetch(`${apiUrl}/api/apps/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return response.json();
  },

  runApp: (id: string, command?: string) =>
    request<any>(`/api/apps/${encodeURIComponent(id)}/run`, {
      method: "POST",
      body: JSON.stringify({ command }),
    }),

  setAppDestination: (id: string, destination: "tray" | "app_store") =>
    request<any>(`/api/apps/${encodeURIComponent(id)}/destination`, {
      method: "POST",
      body: JSON.stringify({ destination }),
    }),

  appRuns: (id: string) => request<any>(`/api/apps/${encodeURIComponent(id)}/runs`),
};

export function connectSynthiaSocket(
  onMessage: (message: any) => void,
  onStatus?: (status: "connected" | "closed" | "error" | "not_configured") => void
) {
  if (!SYNTHIA_WS_URL) {
    onStatus?.("not_configured");
    return { close: () => undefined };
  }

  const socket = new WebSocket(SYNTHIA_WS_URL);

  socket.onopen = () => onStatus?.("connected");

  socket.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {
      onMessage(event.data);
    }
  };

  socket.onerror = () => onStatus?.("error");
  socket.onclose = () => onStatus?.("closed");

  return socket;
}
