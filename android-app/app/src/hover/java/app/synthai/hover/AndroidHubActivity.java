package app.synthai.hover;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

/**
 * Human-facing Android organ for Synthia.
 *
 * This intentionally uses the tablet's host Android runtime. It is an app drawer plus Google Play
 * handoff, with provider fallbacks for devices that Play marks incompatible.
 */
public final class AndroidHubActivity extends Activity {
    private AndroidRuntimeBridge bridge;
    private TextView status;
    private LinearLayout appList;
    private JSONArray apps = new JSONArray();

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        bridge = new AndroidRuntimeBridge(this);
        Log.i(HoverPorts.TAG, "ANDROID_HUB_CREATED");
        setContentView(buildUi());
        refresh();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (bridge != null && status != null) refresh();
    }

    private ScrollView buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xFFF7F1FF);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(18);
        root.setPadding(pad, pad, pad, pad);
        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView title = new TextView(this);
        title.setText("Synthia Android");
        title.setTextSize(26);
        title.setTextColor(0xFF3A1D66);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(title, matchWrap());

        TextView subtitle = new TextView(this);
        subtitle.setText("Host Android runtime • installed apps • Google Play • AI web fallback");
        subtitle.setTextSize(14);
        subtitle.setTextColor(0xFF5D4A72);
        subtitle.setGravity(Gravity.CENTER_HORIZONTAL);
        subtitle.setPadding(0, dp(4), 0, dp(12));
        root.addView(subtitle, matchWrap());

        status = new TextView(this);
        status.setTextSize(14);
        status.setTextColor(Color.DKGRAY);
        status.setPadding(0, 0, 0, dp(10));
        root.addView(status, matchWrap());

        Button store = button("Google Play");
        store.setOnClickListener(v -> run(() -> bridge.openStore("", "")));
        root.addView(store, matchWrap());

        Button chatgpt = button("ChatGPT");
        chatgpt.setOnClickListener(v -> run(() -> bridge.openAi("chatgpt")));
        root.addView(chatgpt, matchWrap());

        Button claude = button("Claude");
        claude.setOnClickListener(v -> run(() -> bridge.openAi("claude")));
        root.addView(claude, matchWrap());

        Button manus = button("Manus");
        manus.setOnClickListener(v -> run(() -> bridge.openAi("manus")));
        root.addView(manus, matchWrap());

        EditText search = new EditText(this);
        search.setHint("Search installed apps");
        search.setSingleLine(true);
        search.setPadding(dp(12), dp(10), dp(12), dp(10));
        root.addView(search, matchWrap());

        Button refresh = button("Refresh Android apps");
        refresh.setOnClickListener(v -> refresh());
        root.addView(refresh, matchWrap());

        appList = new LinearLayout(this);
        appList.setOrientation(LinearLayout.VERTICAL);
        appList.setPadding(0, dp(8), 0, dp(16));
        root.addView(appList, matchWrap());

        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                renderApps(s == null ? "" : s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        return scroll;
    }

    private void refresh() {
        try {
            JSONObject state = bridge.status();
            JSONObject ai = state.getJSONObject("ai");
            status.setText(
                    "Android " + state.optString("androidRelease") + " (SDK " + state.optInt("sdkInt") + ")"
                            + "\nDevice: " + state.optString("manufacturer") + " " + state.optString("model")
                            + "\nGoogle Play: " + (state.optBoolean("playStoreAvailable") ? "ready" : "web fallback")
                            + "\nChatGPT: " + mode(ai.getJSONObject("chatgpt"))
                            + " • Claude: " + mode(ai.getJSONObject("claude"))
                            + " • Manus: " + mode(ai.getJSONObject("manus")));

            JSONObject listed = bridge.apps();
            apps = listed.optJSONArray("apps");
            if (apps == null) apps = new JSONArray();
            renderApps("");
        } catch (Exception error) {
            status.setText("Android bridge unavailable: " + error.getMessage());
        }
    }

    private String mode(JSONObject provider) {
        return provider.optBoolean("installed") ? "native" : "web";
    }

    private void renderApps(String query) {
        if (appList == null) return;
        appList.removeAllViews();
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);

        int shown = 0;
        for (int i = 0; i < apps.length(); i++) {
            JSONObject app = apps.optJSONObject(i);
            if (app == null) continue;
            String label = app.optString("label", app.optString("packageName"));
            String packageName = app.optString("packageName");
            String haystack = (label + " " + packageName).toLowerCase(Locale.ROOT);
            if (!needle.isEmpty() && !haystack.contains(needle)) continue;

            Button open = button(label + "\n" + packageName);
            open.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
            open.setOnClickListener(v -> run(() -> bridge.openApp(packageName)));
            appList.addView(open, matchWrap());
            shown++;
        }

        if (shown == 0) {
            TextView none = new TextView(this);
            none.setText(needle.isEmpty() ? "No launchable Android apps found." : "No apps match that search.");
            none.setTextColor(0xFF5D4A72);
            none.setPadding(dp(8), dp(12), dp(8), dp(12));
            appList.addView(none, matchWrap());
        }
    }

    private void run(JsonAction action) {
        try {
            JSONObject result = action.run();
            if (!result.optBoolean("accepted", result.optBoolean("ok", false))) {
                Toast.makeText(this, result.optString("error", "Android action was not accepted"),
                        Toast.LENGTH_LONG).show();
            }
        } catch (Exception error) {
            Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private interface JsonAction {
        JSONObject run() throws Exception;
    }
}
