package org.synthai.computer;

import android.accessibilityservice.AccessibilityService;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONArray;
import org.json.JSONObject;

public final class WorldObservationService extends AccessibilityService {
    private static final int MAX_NODES = 120;
    private static final int MAX_DEPTH = 8;
    private static final long CONTENT_THROTTLE_MS = 300L;
    private long lastContentAt = 0L;
    private EventJournal journal;

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        journal = new EventJournal(this);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        String packageName = String.valueOf(event.getPackageName());
        if (getPackageName().equals(packageName)) return;

        long now = System.currentTimeMillis();
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (now - lastContentAt < CONTENT_THROTTLE_MS) return;
            lastContentAt = now;
        }

        try {
            JSONObject observation = new JSONObject();
            observation.put("packageName", packageName);
            observation.put("appLabel", resolveLabel(packageName));
            observation.put("activity", event.getClassName() == null ? JSONObject.NULL : String.valueOf(event.getClassName()));
            observation.put("eventType", AccessibilityEvent.eventTypeToString(event.getEventType()));
            observation.put("eventText", joinText(event));
            observation.put("eventContentDescription", event.getContentDescription() == null ? JSONObject.NULL : String.valueOf(event.getContentDescription()));
            observation.put("observedAt", now);
            observation.put("source", "android-accessibility");

            JSONArray ui = new JSONArray();
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                int[] count = new int[]{0};
                collect(root, ui, 0, count);
            }
            observation.put("ui", ui);

            JSONObject envelope = new JSONObject();
            envelope.put("id", "android-observation-" + now + "-" + packageName);
            envelope.put("type", "app.observe");
            envelope.put("residentId", "synthia");
            envelope.put("observation", observation);

            if (journal == null) journal = new EventJournal(this);
            if (!journal.append(envelope)) {
                getSharedPreferences("synthai-native", MODE_PRIVATE)
                    .edit()
                    .putString("observationError", journal.lastError())
                    .putLong("observationErrorAt", now)
                    .apply();
            } else {
                getSharedPreferences("synthai-native", MODE_PRIVATE)
                    .edit()
                    .remove("observationError")
                    .remove("observationErrorAt")
                    .apply();
            }
        } catch (Exception error) {
            getSharedPreferences("synthai-native", MODE_PRIVATE)
                .edit()
                .putString("observationError", error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage()))
                .putLong("observationErrorAt", now)
                .apply();
        }
    }

    private String resolveLabel(String packageName) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            return String.valueOf(pm.getApplicationLabel(info));
        } catch (Exception error) {
            return packageName;
        }
    }

    private String joinText(AccessibilityEvent event) {
        StringBuilder out = new StringBuilder();
        for (CharSequence part : event.getText()) {
            if (part == null) continue;
            if (out.length() > 0) out.append(" ");
            out.append(part);
        }
        return out.toString();
    }

    private void collect(AccessibilityNodeInfo node, JSONArray out, int depth, int[] count) {
        if (node == null || depth > MAX_DEPTH || count[0] >= MAX_NODES) return;
        count[0]++;

        try {
            JSONObject item = new JSONObject();
            boolean password = node.isPassword();
            item.put("id", node.getViewIdResourceName() == null ? JSONObject.NULL : node.getViewIdResourceName());
            item.put("className", node.getClassName() == null ? JSONObject.NULL : String.valueOf(node.getClassName()));
            item.put("enabled", node.isEnabled());
            item.put("clickable", node.isClickable());
            item.put("editable", node.isEditable());
            item.put("sensitive", password);

            if (!password) {
                item.put("text", node.getText() == null ? JSONObject.NULL : String.valueOf(node.getText()));
                item.put("contentDescription", node.getContentDescription() == null ? JSONObject.NULL : String.valueOf(node.getContentDescription()));
                item.put("hint", node.getHintText() == null ? JSONObject.NULL : String.valueOf(node.getHintText()));
            }
            out.put(item);
        } catch (Exception ignored) {
            // A single malformed Android node is skipped; service-level errors
            // are surfaced through observationError when envelope persistence fails.
        }

        for (int i = 0; i < node.getChildCount() && count[0] < MAX_NODES; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) collect(child, out, depth + 1, count);
        }
    }

    @Override
    public void onInterrupt() {}
}
