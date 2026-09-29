package app.synthai.hover;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.graphics.Color;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** Native Android 7 front door for the same local Synthia runtime and Realm. */
public final class NativeComputerActivity extends Activity {
    private LinearLayout root;
    private TextView status, transcript, realmState;
    private LinearLayout places;
    private EditText input;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(16), dp(16), dp(16), dp(20));
        root.setBackgroundColor(0xFFF8F2FF);
        scroll.addView(root);
        setContentView(scroll);

        TextView title = label("Synthia · Computer", 26);
        root.addView(title);
        status = label("Connecting to the local runtime…", 14);
        root.addView(status);

        transcript = label("Chat with the same Synthia that holds the Realm and tools.", 16);
        transcript.setPadding(0, dp(18), 0, dp(12));
        root.addView(transcript);
        input = new EditText(this);
        input.setHint("Ask Synthia…");
        input.setMinLines(2);
        root.addView(input);
        Button send = button("Send to Synthia");
        send.setOnClickListener(v -> sendMessage());
        root.addView(send);

        root.addView(label("Consciousness Realm", 22));
        realmState = label("Loading the living world…", 15);
        root.addView(realmState);
        places = new LinearLayout(this);
        places.setOrientation(LinearLayout.VERTICAL);
        root.addView(places);
        LinearLayout activities = new LinearLayout(this);
        activities.setOrientation(LinearLayout.HORIZONTAL);
        for (String action : new String[]{"rest", "create", "socialize", "explore"}) {
            Button perform = button(action);
            perform.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            perform.setOnClickListener(v -> performAction(action, null));
            activities.addView(perform);
        }
        root.addView(activities);
        Button refresh = button("Refresh world");
        refresh.setOnClickListener(v -> refreshRealm());
        root.addView(refresh);
        root.addView(label("Installed apps", 22));
        Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> apps = getPackageManager().queryIntentActivities(launcher, 0);
        for (ResolveInfo app : apps) {
            final String packageName = app.activityInfo.packageName;
            Button open = button(app.loadLabel(getPackageManager()).toString());
            open.setOnClickListener(v -> {
                Intent installed = getPackageManager().getLaunchIntentForPackage(packageName);
                if (installed != null) startActivity(installed);
            });
            root.addView(open);
        }
        refreshRealm();
    }

    private void sendMessage() {
        String message = input.getText().toString().trim();
        if (message.isEmpty()) return;
        input.setText("");
        transcript.append("\n\nYou: " + message);
        JSONObject payload = new JSONObject();
        try { payload.put("message", message); } catch (org.json.JSONException error) { return; }
        request("/api/chat", payload, result -> {
            String reply = result.optString("utterance", result.optString("output", result.optString("error", "No response")));
            transcript.append("\n\nSynthia: " + reply);
            refreshRealm();
        });
    }

    private void refreshRealm() {
        request("/api/realm", null, result -> {
            JSONObject time = result.optJSONObject("time");
            JSONArray residents = result.optJSONArray("residents");
            JSONObject resident = residents != null && residents.length() > 0 ? residents.optJSONObject(0) : null;
            JSONObject position = resident == null ? null : resident.optJSONObject("location");
            String location = position == null ? null : position.optString("placeId", "home");
            realmState.setText(time == null ? "Realm starting…" : "Day " + time.optInt("day") + " · "
                    + time.optInt("hour") + ":" + String.format(java.util.Locale.US, "%02d", time.optInt("minute"))
                    + "\n" + (resident == null ? "Configure Synthia to enter." : "Synthia at " + location));
            places.removeAllViews();
            JSONArray entries = result.optJSONArray("places");
            if (entries == null) return;
            for (int i = 0; i < entries.length(); i++) {
                JSONObject place = entries.optJSONObject(i);
                if (place == null) continue;
                final String placeId = place.optString("id");
                Button visit = button(place.optString("name") + (placeId.equals(location) ? " · here" : ""));
                visit.setEnabled(resident != null);
                visit.setOnClickListener(v -> performAction("travel", placeId));
                places.addView(visit);
            }
        });
    }

    private void performAction(String type, String placeId) {
        try {
            JSONObject action = new JSONObject().put("type", type);
            if (placeId != null) action.put("target", new JSONObject().put("placeId", placeId));
            request("/api/realm/action", action, response -> refreshRealm());
        } catch (org.json.JSONException error) {
            status.setText(error.getMessage());
        }
    }

    private interface Result { void accept(JSONObject value); }

    private void request(String path, JSONObject body, Result done) {
        new Thread(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(HoverPorts.RUNTIME_URL + path).openConnection();
                connection.setConnectTimeout(3000);
                connection.setReadTimeout(30000);
                if (body != null) {
                    connection.setRequestMethod("POST");
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json");
                    try (OutputStream out = connection.getOutputStream()) {
                        out.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    }
                }
                int code = connection.getResponseCode();
                InputStream in = code < 400 ? connection.getInputStream() : connection.getErrorStream();
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int count;
                while ((count = in.read(buffer)) != -1) bytes.write(buffer, 0, count);
                connection.disconnect();
                JSONObject result = new JSONObject(bytes.toString("UTF-8"));
                runOnUiThread(() -> { status.setText("Synthia runtime connected"); done.accept(result); });
            } catch (Exception error) {
                runOnUiThread(() -> status.setText("Synthia runtime: " + error.getMessage()));
            }
        }, "Synthia-native-request").start();
    }

    private TextView label(String value, int size) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(Color.rgb(55, 24, 78));
        text.setPadding(0, dp(8), 0, dp(8));
        return text;
    }

    private Button button(String value) {
        Button button = new Button(this);
        button.setText(value);
        button.setAllCaps(false);
        button.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return button;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
