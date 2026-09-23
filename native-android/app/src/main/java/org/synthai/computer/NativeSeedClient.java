package org.synthai.computer;

import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class NativeSeedClient {
    static final class Result {
        final boolean ok;
        final int code;
        final String body;
        Result(boolean ok, int code, String body) {
            this.ok = ok;
            this.code = code;
            this.body = body;
        }
    }

    private final String base;

    NativeSeedClient(String base) {
        this.base = base;
    }

    Result health() {
        return request("GET", "/health", null);
    }

    Result post(String path, JSONObject body) {
        return request("POST", path, body == null ? new JSONObject() : body);
    }

    Result upload(String path, InputStream input, long length, String contentType, String source) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(base + path);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(1500);
            connection.setReadTimeout(180000);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Content-Type", contentType == null ? "application/octet-stream" : contentType);
            if (source != null) connection.setRequestProperty("X-SynthAI-Source", source);
            connection.setDoOutput(true);
            if (length >= 0) connection.setFixedLengthStreamingMode(length);
            else connection.setChunkedStreamingMode(64 * 1024);
            try (OutputStream out = connection.getOutputStream()) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = input.read(buffer)) >= 0) {
                    if (read > 0) out.write(buffer, 0, read);
                }
                out.flush();
            }
            int code = connection.getResponseCode();
            InputStream stream = code >= 200 && code < 400
                ? connection.getInputStream()
                : connection.getErrorStream();
            StringBuilder text = new StringBuilder();
            if (stream != null) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) text.append(line);
                }
            }
            return new Result(code >= 200 && code < 300, code, text.toString());
        } catch (Exception error) {
            return new Result(false, -1, error.toString());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private Result request(String method, String path, JSONObject body) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(base + path);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(900);
            connection.setReadTimeout(2500);
            connection.setRequestMethod(method);
            connection.setRequestProperty("Accept", "application/json");
            if (body != null) {
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(bytes);
                }
            }
            int code = connection.getResponseCode();
            InputStream stream = code >= 200 && code < 400
                ? connection.getInputStream()
                : connection.getErrorStream();
            StringBuilder text = new StringBuilder();
            if (stream != null) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) text.append(line);
                }
            }
            return new Result(code >= 200 && code < 300, code, text.toString());
        } catch (Exception error) {
            return new Result(false, -1, error.toString());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
