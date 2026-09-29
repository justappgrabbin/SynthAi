package org.synthai.computer;

import android.content.Context;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Serves the bundled mobile Computer only on the device's loopback interface. */
final class LocalWebServer implements AutoCloseable {
    private final Context context;
    private final ExecutorService workers = Executors.newFixedThreadPool(4);
    private ServerSocket socket;
    private int port;

    LocalWebServer(Context context) { this.context = context.getApplicationContext(); }

    synchronized String start() throws Exception {
        if (socket != null) return url();
        socket = new ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"));
        port = socket.getLocalPort();
        workers.execute(() -> {
            while (!socket.isClosed()) {
                try { Socket client = socket.accept(); workers.execute(() -> serve(client)); }
                catch (Exception error) { if (!socket.isClosed()) break; }
            }
        });
        return url();
    }

    private String url() { return "http://127.0.0.1:" + port + "/mobile-computer.html"; }

    private void serve(Socket client) {
        try (Socket peer = client) {
            peer.setSoTimeout(5000);
            InputStream in = peer.getInputStream();
            StringBuilder request = new StringBuilder();
            int next;
            while (request.length() < 4096 && (next = in.read()) != -1 && next != '\n') request.append((char)next);
            String[] parts = request.toString().trim().split(" ");
            if (parts.length < 2 || !"GET".equals(parts[0])) { reply(peer, 405, "text/plain", "Method not allowed".getBytes(StandardCharsets.UTF_8)); return; }
            String path = parts[1].split("\\?", 2)[0];
            if (path.equals("/")) path = "/index.html";
            if (!path.startsWith("/") || path.contains("..") || path.contains("\\") || path.contains("%")) {
                reply(peer, 400, "text/plain", "Bad path".getBytes(StandardCharsets.UTF_8)); return;
            }
            try (InputStream asset = context.getAssets().open("mobile" + path)) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int count;
                while ((count = asset.read(buffer)) != -1) bytes.write(buffer, 0, count);
                byte[] content = bytes.toByteArray();
                reply(peer, 200, mime(path), content);
            } catch (Exception missing) { reply(peer, 404, "text/plain", "Not found".getBytes(StandardCharsets.UTF_8)); }
        } catch (Exception ignored) {}
    }

    private static String mime(String path) {
        if (path.endsWith(".mjs") || path.endsWith(".js")) return "text/javascript; charset=utf-8";
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".json")) return "application/json; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    private static void reply(Socket peer, int code, String mime, byte[] body) throws Exception {
        OutputStream out = peer.getOutputStream();
        String head = "HTTP/1.1 " + code + (code == 200 ? " OK" : " Error") + "\r\nContent-Type: " + mime +
            "\r\nContent-Length: " + body.length + "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.US_ASCII));
        out.write(body);
        out.flush();
    }

    @Override public synchronized void close() {
        try { if (socket != null) socket.close(); } catch (Exception ignored) {}
        workers.shutdownNow();
    }
}
