package org.synthai.computer;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;

/** A durable Android resident kernel. It boots without a separate application or network. */
final class LocalRuntime {
    private final File journal;
    private final SharedPreferences state;

    LocalRuntime(Context context) {
        journal = new File(context.getFilesDir(), "resident-events.jsonl");
        state = context.getSharedPreferences("synthia-resident-v1", Context.MODE_PRIVATE);
    }

    synchronized void wake(long elapsedMs) {
        record("resident.wake", new JSONObject(), elapsedMs);
    }

    synchronized void record(String type, JSONObject payload) {
        record(type, payload, 0L);
    }

    private void record(String type, JSONObject payload, long elapsedMs) {
        try {
            JSONObject event = new JSONObject();
            event.put("type", type);
            event.put("at", System.currentTimeMillis());
            event.put("elapsedMs", elapsedMs);
            event.put("payload", payload);
            try (OutputStreamWriter out = new OutputStreamWriter(new FileOutputStream(journal, true), StandardCharsets.UTF_8)) {
                out.write(event.toString());
                out.write('\n');
            }
            state.edit().putLong("lastEventAt", event.getLong("at"))
                .putLong("eventCount", state.getLong("eventCount", 0) + 1).apply();
        } catch (Exception error) {
            throw new IllegalStateException("Could not preserve resident event", error);
        }
    }

    synchronized void setApplications(JSONArray applications) {
        state.edit().putString("applications", applications.toString()).apply();
    }

    synchronized JSONObject snapshot() {
        JSONObject result = new JSONObject();
        try {
            result.put("resident", "Synthia");
            result.put("substrate", "Android in-app runtime");
            result.put("eventCount", state.getLong("eventCount", 0));
            result.put("lastEventAt", state.getLong("lastEventAt", 0));
            result.put("applications", new JSONArray(state.getString("applications", "[]")));
            result.put("address", new JSONObject(state.getString("address", "{}")));
        } catch (Exception error) { throw new IllegalStateException(error); }
        return result;
    }

    synchronized void setAddress(JSONObject address) {
        state.edit().putString("address", address.toString()).apply();
        record("address.activate", address);
    }

    synchronized JSONArray recentEvents(int limit) {
        JSONArray all = new JSONArray();
        if (!journal.exists()) return all;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(journal), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                try { all.put(new JSONObject(line)); } catch (Exception ignored) {}
            }
        } catch (Exception error) { throw new IllegalStateException(error); }
        JSONArray recent = new JSONArray();
        for (int i = Math.max(0, all.length() - limit); i < all.length(); i++) recent.put(all.opt(i));
        return recent;
    }
}
