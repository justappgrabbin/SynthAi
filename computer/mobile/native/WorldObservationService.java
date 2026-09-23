package org.synthai.computer;

import android.accessibilityservice.AccessibilityService;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import org.json.JSONArray;
import org.json.JSONObject;

public class WorldObservationService extends AccessibilityService {
    public static final String PREFS = "synthai_world_observation";
    public static final String KEY_LATEST = "latest";

    private static final int MAX_NODES = 120;
    private static final int MAX_DEPTH = 8;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;

        String packageName = String.valueOf(event.getPackageName());
        if (getPackageName().equals(packageName)) return;

        try {
            JSONObject observation = new JSONObject();
            observation.put("packageName", packageName);
            observation.put("appLabel", resolveLabel(packageName));
            observation.put("activity", event.getClassName() == null ? JSONObject.NULL : String.valueOf(event.getClassName()));
            observation.put("eventType", AccessibilityEvent.eventTypeToString(event.getEventType()));
            observation.put("observedAt", System.currentTimeMillis());
            observation.put("source", "android-accessibility");

            JSONArray ui = new JSONArray();
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                int[] count = new int[] { 0 };
                collect(root, ui, 0, count);
            }
            observation.put("ui", ui);

            getSharedPreferences(PREFS, MODE_PRIVATE)
                .edit()
                .putString(KEY_LATEST, observation.toString())
                .apply();
        } catch (Exception ignored) {
            // Accessibility callbacks cannot throw into Android. The absence of
            // a new observation is visible to the WorldShell bridge.
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

            // Never persist password-field text or descriptions.
            if (!password) {
                CharSequence text = node.getText();
                CharSequence description = node.getContentDescription();
                CharSequence hint = node.getHintText();
                item.put("text", text == null ? JSONObject.NULL : String.valueOf(text));
                item.put("contentDescription", description == null ? JSONObject.NULL : String.valueOf(description));
                item.put("hint", hint == null ? JSONObject.NULL : String.valueOf(hint));
            }

            out.put(item);
        } catch (Exception ignored) {
            // Skip malformed node fields and continue the tree.
        }

        for (int i = 0; i < node.getChildCount() && count[0] < MAX_NODES; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) collect(child, out, depth + 1, count);
        }
    }

    @Override
    public void onInterrupt() {
        // No speech/feedback channel to interrupt.
    }
}
