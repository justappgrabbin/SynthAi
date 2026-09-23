package org.synthai.computer;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

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

    EventJournal(Context context) {
        pending = new File(context.getFilesDir(), "mesh-events.jsonl");
    }

    synchronized void append(JSONObject event) {
        try (FileWriter writer = new FileWriter(pending, StandardCharsets.UTF_8, true)) {
            writer.write(event.toString());
            writer.write("\n");
        } catch (Exception ignored) {}
    }

    synchronized Batch beginBatch() {
        try {
            if (!pending.exists() || pending.length() == 0) return new Batch(null, new JSONArray());
            File inflight = new File(pending.getParentFile(), "mesh-events-" + System.currentTimeMillis() + ".inflight");
            if (!pending.renameTo(inflight)) return new Batch(null, new JSONArray());
            JSONArray events = read(inflight);
            return new Batch(inflight, events);
        } catch (Exception error) {
            return new Batch(null, new JSONArray());
        }
    }

    synchronized void commit(Batch batch) {
        if (batch != null && batch.file != null) batch.file.delete();
    }

    synchronized void rollback(Batch batch) {
        if (batch == null || batch.file == null || !batch.file.exists()) return;
        try {
            String old = Files.readString(batch.file.toPath(), StandardCharsets.UTF_8);
            String newer = pending.exists() ? Files.readString(pending.toPath(), StandardCharsets.UTF_8) : "";
            Files.writeString(pending.toPath(), old + newer, StandardCharsets.UTF_8);
            batch.file.delete();
        } catch (Exception ignored) {}
    }

    private JSONArray read(File file) {
        JSONArray array = new JSONArray();
        if (file == null || !file.exists()) return array;
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                try { array.put(new JSONObject(line)); } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
        return array;
    }
}
