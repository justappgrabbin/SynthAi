package org.synthai.computer;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;

final class EventJournal {
    static final class Batch {
        final File file;
        final JSONArray events;
        Batch(File file, JSONArray events) {
            this.file = file;
            this.events = events;
        }
        boolean empty() { return events.length() == 0; }
    }

    private final File pending;
    private volatile String lastError = null;

    EventJournal(Context context) {
        pending = new File(context.getFilesDir(), "mesh-events.jsonl");
    }

    synchronized boolean append(JSONObject event) {
        try (OutputStreamWriter writer = new OutputStreamWriter(new FileOutputStream(pending, true), StandardCharsets.UTF_8)) {
            writer.write(event.toString());
            writer.write("\n");
            lastError = null;
            return true;
        } catch (Exception error) {
            lastError = error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage());
            return false;
        }
    }

    String lastError() {
        return lastError;
    }

    synchronized Batch beginBatch() {
        try {
            if (!pending.exists() || pending.length() == 0) return new Batch(null, new JSONArray());
            File inflight = new File(pending.getParentFile(), "mesh-events-" + System.currentTimeMillis() + ".inflight");
            if (!pending.renameTo(inflight)) {
                lastError = "Unable to move pending event journal into an inflight batch";
                return new Batch(null, new JSONArray());
            }
            JSONArray events = read(inflight);
            return new Batch(inflight, events);
        } catch (Exception error) {
            lastError = error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage());
            return new Batch(null, new JSONArray());
        }
    }

    synchronized void commit(Batch batch) {
        if (batch == null || batch.file == null) return;
        if (batch.file.exists() && !batch.file.delete()) {
            lastError = "Unable to delete committed event journal batch: " + batch.file.getName();
        } else {
            lastError = null;
        }
    }

    synchronized void rollback(Batch batch) {
        if (batch == null || batch.file == null || !batch.file.exists()) return;
        try {
            String old = readText(batch.file);
            String newer = pending.exists() ? readText(pending) : "";
            try (OutputStreamWriter writer = new OutputStreamWriter(new FileOutputStream(pending, false), StandardCharsets.UTF_8)) {
                writer.write(old);
                writer.write(newer);
            }
            batch.file.delete();
        } catch (Exception error) {
            lastError = error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage());
        }
    }

    private String readText(File file) {
        StringBuilder text = new StringBuilder();
        if (file == null || !file.exists()) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                text.append(line).append("\n");
            }
        } catch (Exception error) {
            lastError = error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage());
        }
        return text.toString();
    }

    private JSONArray read(File file) {
        JSONArray array = new JSONArray();
        if (file == null || !file.exists()) return array;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                try {
                    array.put(new JSONObject(line));
                } catch (Exception error) {
                    lastError = "Invalid journal event JSON: " + String.valueOf(error.getMessage());
                }
            }
        } catch (Exception error) {
            lastError = error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage());
        }
        return array;
    }
}
