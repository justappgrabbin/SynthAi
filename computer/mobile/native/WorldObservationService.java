package org.synthai.computer;

import android.accessibilityservice.AccessibilityService;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONArray;
import org.json.JSONObject;

public class WorldObservationService extends AccessibilityService {
    public static final String PREFS = "synthai_world_observation";
    public static final String KEY_QUEUE = "queue";
    public static final String KEY_ERROR = "error";
    public static final String KEY_ERROR_AT = "error_at";

    private static final int MAX_NODES = 120;
    private static final int MAX_DEPTH = 8;
    private static final int MAX_QUEUE = 160;
    private static final long CONTENT_THROTTLE_MS = 300L;

    private long lastContentEventAt = 0L;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;

        String packageName = String.valueOf(event.getPackageName());
        if (getPackageName().equals(packageName)) return;

        long now = System.currentTimeMillis();
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            now - lastContentEventAt < CONTENT_THROTTLE_MS) {
            return;
        }
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            lastContentEventAt = now;
        }

        try {
            JSONObject observation = new JSONObject();
            observation.put("packageName", packageName);
            observation.put("appLabel", resolveLabel(packageName));
            observation.put(
                "activity",
                event.getClassName() == null ? JSONObject.NULL : String.valueOf(event.getClassName())
            );
            observation.put("eventType", AccessibilityEvent.eventTypeToString(event.getEventType()));
            observation.put("observedAt", now);
            observation.put("source", "android-accessibility");
            observation.put("eventText", joinEventText(event));
            observation.put(
                "eventContentDescription",
                event.getContentDescription() == null
                    ? JSONObject.NULL
                    : String.valueOf(event.getContentDescription())
            );

            JSONArray ui = new JSONArray();
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                int[] count = new int[] { 0 };
                collect(root, ui, 0, count);
            }
            observation.put("ui", ui);

            enqueue(observation);
            clearError();
        } catch (Exception error) {
            recordError(error);
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

    private String joinEventText(AccessibilityEvent event) {
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
        count[0] += 1;

        try {
            JSONObject item = new JSONObject();
            String id = node.getViewIdResourceName();
            CharSequence className = node.getClassName();
            boolean password = node.isPassword();

            item.put("id", id == null ? JSONObject.NULL : id);
            item.put("className", className == null ? JSONObject.NULL : String.valueOf(className));
            item.put("enabled", node.isEnabled());
            item.put("clickable", node.isClickable());
            item.put("editable", node.isEditable());
            item.put("sensitive", password);

            if (!password) {
                CharSequence text = node.getText();
                CharSequence description = node.getContentDescription();
                CharSequence hint = node.getHintText();
                item.put("text", text == null ? JSONObject.NULL : String.valueOf(text));
                item.put(
                    "contentDescription",
                    description == null ? JSONObject.NULL : String.valueOf(description)
                );
                item.put("hint", hint == null ? JSONObject.NULL : String.valueOf(hint));
            }

            out.put(item);
        } catch (Exception error) {
            recordError(error);
        }

        for (int i = 0; i < node.getChildCount() && count[0] < MAX_NODES; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) collect(child, out, depth + 1, count);
        }
    }

    private synchronized void enqueue(JSONObject observation) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            JSONArray queue;
            try {
                queue = new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
            } catch (Exception invalidQueue) {
                queue = new JSONArray();
                recordError(invalidQueue);
            }

            queue.put(observation);
            while (queue.length() > MAX_QUEUE) queue.remove(0);

            prefs.edit()
                .putString(KEY_QUEUE, queue.toString())
                .apply();
        } catch (Exception error) {
            recordError(error);
        }
    }

    private void clearError() {
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .remove(KEY_ERROR)
            .remove(KEY_ERROR_AT)
            .apply();
    }

    private void recordError(Exception error) {
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putString(KEY_ERROR, error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage()))
            .putLong(KEY_ERROR_AT, System.currentTimeMillis())
            .apply();
    }

    @Override
    public void onInterrupt() {
        // No speech or feedback channel is controlled by this service.
    }
}
