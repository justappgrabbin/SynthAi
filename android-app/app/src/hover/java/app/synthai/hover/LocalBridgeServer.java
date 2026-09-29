package app.synthai.hover;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class LocalBridgeServer {
    private final Context context;
    private final int port;
    private final AndroidRuntimeBridge androidRuntime;
    private final ExecutorService pool = Executors.newCachedThreadPool();
    private volatile ServerSocket socket;
    private volatile boolean running;

    public LocalBridgeServer(Context context, int port) {
        this.context = context.getApplicationContext();
        this.port = port;
        this.androidRuntime = new AndroidRuntimeBridge(this.context);
    }

    public synchronized void start() {
        if (running) return;
        running = true;
        pool.submit(() -> {
            try {
                socket = new ServerSocket(port, 8, InetAddress.getByName("127.0.0.1"));
                while (running) {
                    Socket client = socket.accept();
                    pool.submit(() -> handle(client));
                }
            } catch (Exception ignored) {
                running = false;
            }
        });
    }

    public synchronized void stop() {
        running = false;
        try { if (socket != null) socket.close(); } catch (Exception ignored) {}
        socket = null;
        pool.shutdownNow();
    }

    private void handle(Socket client) {
        try (Socket c = client;
             BufferedInputStream in = new BufferedInputStream(c.getInputStream());
             BufferedOutputStream out = new BufferedOutputStream(c.getOutputStream())) {

            String requestLine = readLine(in);
            if (requestLine == null || requestLine.isEmpty()) return;
            String[] first = requestLine.split(" ");
            if (first.length < 2) return;
            String method = first[0].toUpperCase(Locale.ROOT);
            String path = first[1];

            int contentLength = 0;
            String line;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    String key = line.substring(0, colon).trim().toLowerCase(Locale.ROOT);
                    String value = line.substring(colon + 1).trim();
                    if ("content-length".equals(key)) contentLength = Integer.parseInt(value);
                }
            }

            byte[] bodyBytes = contentLength > 0 ? readExactly(in, contentLength) : new byte[0];
            JSONObject body = bodyBytes.length == 0
                    ? new JSONObject()
                    : new JSONObject(new String(bodyBytes, StandardCharsets.UTF_8));

            Response response = dispatch(method, path, body);
            byte[] payload = response.body.toString().getBytes(StandardCharsets.UTF_8);
            String headers = "HTTP/1.1 " + response.status + " " + reason(response.status) + "\r\n"
                    + "Content-Type: application/json; charset=utf-8\r\n"
                    + "Access-Control-Allow-Origin: " + HoverPorts.RUNTIME_URL + "\r\n"
                    + "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                    + "Access-Control-Allow-Headers: Content-Type\r\n"
                    + "Cache-Control: no-store\r\n"
                    + "Content-Length: " + payload.length + "\r\n"
                    + "Connection: close\r\n\r\n";
            out.write(headers.getBytes(StandardCharsets.UTF_8));
            out.write(payload);
            out.flush();
        } catch (Exception ignored) {
        }
    }

    private Response dispatch(String method, String path, JSONObject body) {
        try {
            if ("OPTIONS".equals(method)) return ok(new JSONObject().put("ok", true));

            SynthiaAccessibilityService hands = SynthiaAccessibilityService.getInstance();

            if ("GET".equals(method) && "/status".equals(path)) {
                return ok(new JSONObject()
                        .put("ok", true)
                        .put("bridge", "cynthia-android-hands")
                        .put("baseUrl", "http://127.0.0.1:" + port)
                        .put("accessibilityEnabled", hands != null)
                        .put("overlayAllowed", Settings.canDrawOverlays(context))
                        .put("runtimeUrl", HoverPorts.RUNTIME_URL)
                        .put("android", androidRuntime.status()));
            }

            // Host Android is available even when Accessibility hands are not enabled.
            if ("GET".equals(method) && "/android/status".equals(path)) {
                return ok(androidRuntime.status());
            }
            if ("GET".equals(method) && "/android/apps".equals(path)) {
                return ok(androidRuntime.apps());
            }
            if ("POST".equals(method) && "/android/open".equals(path)) {
                return ok(androidRuntime.openApp(body.optString("packageName", "")));
            }
            if ("POST".equals(method) && "/android/store".equals(path)) {
                return ok(androidRuntime.openStore(
                        body.optString("packageName", ""),
                        body.optString("query", "")));
            }
            if ("POST".equals(method) && "/android/ai".equals(path)) {
                return ok(androidRuntime.openAi(body.optString("provider", "")));
            }

            if (hands == null && !("/open-app".equals(path))) {
                return error(409, "Synthia Hands is not enabled in Android Accessibility settings.");
            }

            if ("GET".equals(method) && "/screen".equals(path)) {
                return ok(hands.screenSnapshot());
            }
            if ("POST".equals(method) && "/tap".equals(path)) {
                boolean accepted = hands.tap((float) body.getDouble("x"), (float) body.getDouble("y"));
                return ok(result("tap", accepted));
            }
            if ("POST".equals(method) && "/swipe".equals(path)) {
                boolean accepted = hands.swipe(
                        (float) body.getDouble("x1"), (float) body.getDouble("y1"),
                        (float) body.getDouble("x2"), (float) body.getDouble("y2"),
                        body.optLong("durationMs", 350));
                return ok(result("swipe", accepted));
            }
            if ("POST".equals(method) && "/scroll".equals(path)) {
                boolean accepted = hands.scroll(body.optString("direction", "down"));
                return ok(result("scroll", accepted));
            }
            if ("POST".equals(method) && "/click-text".equals(path)) {
                boolean accepted = hands.clickText(body.optString("text", ""));
                return ok(result("click-text", accepted));
            }
            if ("POST".equals(method) && "/set-text".equals(path)) {
                boolean accepted = hands.setText(body.optString("text", ""));
                return ok(result("set-text", accepted));
            }
            if ("POST".equals(method) && "/global".equals(path)) {
                boolean accepted = hands.global(body.optString("action", ""));
                return ok(result("global", accepted));
            }
            if ("POST".equals(method) && "/open-app".equals(path)) {
                return ok(androidRuntime.openApp(body.optString("packageName", "")));
            }

            return error(404, "Unknown bridge route: " + method + " " + path);
        } catch (Exception e) {
            return error(400, e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        }
    }

    private JSONObject result(String action, boolean accepted) throws Exception {
        return new JSONObject()
                .put("ok", accepted)
                .put("accepted", accepted)
                .put("action", action);
    }

    private Response ok(JSONObject body) {
        return new Response(200, body);
    }

    private Response error(int status, String message) {
        try {
            return new Response(status, new JSONObject().put("ok", false).put("error", message));
        } catch (Exception impossible) {
            return new Response(status, new JSONObject());
        }
    }


    private static byte[] readExactly(BufferedInputStream in, int length) throws Exception {
        byte[] out = new byte[length];
        int offset = 0;
        while (offset < length) {
            int count = in.read(out, offset, length - offset);
            if (count < 0) throw new IllegalArgumentException("Unexpected end of HTTP request body");
            offset += count;
        }
        return out;
    }

    private static String readLine(BufferedInputStream in) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        int b;
        boolean seen = false;
        while ((b = in.read()) != -1) {
            seen = true;
            if (b == '\n') break;
            if (b != '\r') bytes.write(b);
            if (bytes.size() > 8192) throw new IllegalArgumentException("HTTP header line too long");
        }
        if (!seen && bytes.size() == 0) return null;
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }

    private static String reason(int status) {
        switch (status) {
            case 200: return "OK";
            case 400: return "Bad Request";
            case 404: return "Not Found";
            case 409: return "Conflict";
            default: return "Error";
        }
    }

    private static final class Response {
        final int status;
        final JSONObject body;
        Response(int status, JSONObject body) {
            this.status = status;
            this.body = body;
        }
    }
}
