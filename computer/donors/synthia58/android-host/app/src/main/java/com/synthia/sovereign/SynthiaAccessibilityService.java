package com.synthia.sovereign;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.graphics.Rect;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Locale;

public final class SynthiaAccessibilityService extends AccessibilityService {
    private static volatile SynthiaAccessibilityService instance;

    public static SynthiaAccessibilityService getInstance() {
        return instance;
    }

    @Override
    protected void onServiceConnected() {
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Cynthia pulls the active accessibility tree on demand through the localhost bridge.
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        instance = null;
        super.onDestroy();
    }

    public boolean tap(float x, float y) {
        OverlayService.hideForAction(450);
        Path path = new Path();
        path.moveTo(x, y);
        GestureDescription.StrokeDescription stroke =
                new GestureDescription.StrokeDescription(path, 0, 70);
        return dispatchGesture(new GestureDescription.Builder().addStroke(stroke).build(), null, null);
    }

    public boolean swipe(float x1, float y1, float x2, float y2, long durationMs) {
        OverlayService.hideForAction(Math.max(450, durationMs + 150));
        Path path = new Path();
        path.moveTo(x1, y1);
        path.lineTo(x2, y2);
        GestureDescription.StrokeDescription stroke =
                new GestureDescription.StrokeDescription(path, 0, Math.max(120, durationMs));
        return dispatchGesture(new GestureDescription.Builder().addStroke(stroke).build(), null, null);
    }

    public boolean scroll(String direction) {
        int width = getResources().getDisplayMetrics().widthPixels;
        int height = getResources().getDisplayMetrics().heightPixels;
        float x = width * 0.50f;
        String normalized = direction == null ? "down" : direction.toLowerCase(Locale.ROOT);
        if ("up".equals(normalized)) {
            return swipe(x, height * 0.30f, x, height * 0.72f, 360);
        }
        return swipe(x, height * 0.72f, x, height * 0.30f, 360);
    }

    public boolean global(String action) {
        if (action == null) return false;
        switch (action.toUpperCase(Locale.ROOT)) {
            case "BACK": return performGlobalAction(GLOBAL_ACTION_BACK);
            case "HOME": return performGlobalAction(GLOBAL_ACTION_HOME);
            case "RECENTS": return performGlobalAction(GLOBAL_ACTION_RECENTS);
            case "NOTIFICATIONS": return performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS);
            case "QUICK_SETTINGS": return performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
            default: return false;
        }
    }

    public boolean clickText(String text) {
        String query = text == null ? "" : text.trim();
        if (query.isEmpty()) return false;

        AccessibilityNodeInfo root = targetRoot();
        if (root == null) return false;

        Deque<AccessibilityNodeInfo> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            AccessibilityNodeInfo node = queue.removeFirst();
            CharSequence nodeText = node.getText();
            CharSequence desc = node.getContentDescription();

            boolean matches = containsIgnoreCase(nodeText, query) || containsIgnoreCase(desc, query);
            if (matches) {
                AccessibilityNodeInfo clickable = node;
                while (clickable != null && !clickable.isClickable()) clickable = clickable.getParent();
                if (clickable != null && clickable.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                    return true;
                }
            }

            for (int i = 0; i < node.getChildCount(); i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) queue.addLast(child);
            }
        }
        return false;
    }

    public boolean setText(String text) {
        AccessibilityNodeInfo root = targetRoot();
        if (root == null) return false;

        AccessibilityNodeInfo focus = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focus == null || !focus.isEditable()) {
            Deque<AccessibilityNodeInfo> queue = new ArrayDeque<>();
            queue.add(root);
            while (!queue.isEmpty()) {
                AccessibilityNodeInfo node = queue.removeFirst();
                if (node.isEditable() && (node.isFocused() || node.isAccessibilityFocused())) {
                    focus = node;
                    break;
                }
                for (int i = 0; i < node.getChildCount(); i++) {
                    AccessibilityNodeInfo child = node.getChild(i);
                    if (child != null) queue.addLast(child);
                }
            }
        }
        if (focus == null || !focus.isEditable()) return false;

        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                text == null ? "" : text);
        return focus.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    }

    public JSONObject screenSnapshot() {
        JSONObject out = new JSONObject();
        AccessibilityNodeInfo root = targetRoot();
        try {
            out.put("ok", root != null);
            if (root == null) {
                out.put("error", "No non-Cynthia Android window is currently available.");
                return out;
            }
            out.put("packageName", string(root.getPackageName()));
            out.put("className", string(root.getClassName()));
            out.put("tree", serializeTree(root, 7, 550));
        } catch (Exception e) {
            try {
                out.put("ok", false);
                out.put("error", e.getMessage());
            } catch (Exception ignored) {}
        }
        return out;
    }

    private AccessibilityNodeInfo targetRoot() {
        List<AccessibilityWindowInfo> windows = getWindows();
        if (windows != null) {
            for (int i = windows.size() - 1; i >= 0; i--) {
                AccessibilityNodeInfo root = windows.get(i).getRoot();
                if (root == null) continue;
                CharSequence pkg = root.getPackageName();
                if (pkg == null || !getPackageName().contentEquals(pkg)) {
                    return root;
                }
            }
        }
        AccessibilityNodeInfo active = getRootInActiveWindow();
        if (active != null) {
            CharSequence pkg = active.getPackageName();
            if (pkg == null || !getPackageName().contentEquals(pkg)) return active;
        }
        return null;
    }

    private JSONObject serializeTree(AccessibilityNodeInfo root, int maxDepth, int maxNodes) throws Exception {
        JSONObject wrapper = new JSONObject();
        JSONArray nodes = new JSONArray();
        Deque<NodeDepth> queue = new ArrayDeque<>();
        queue.add(new NodeDepth(root, 0, -1));
        int seen = 0;

        while (!queue.isEmpty() && seen < maxNodes) {
            NodeDepth item = queue.removeFirst();
            AccessibilityNodeInfo node = item.node;
            JSONObject json = new JSONObject();
            Rect bounds = new Rect();
            node.getBoundsInScreen(bounds);

            json.put("id", seen);
            json.put("parent", item.parent);
            json.put("depth", item.depth);
            json.put("text", string(node.getText()));
            json.put("description", string(node.getContentDescription()));
            json.put("className", string(node.getClassName()));
            json.put("viewId", string(node.getViewIdResourceName()));
            json.put("bounds", new JSONArray()
                    .put(bounds.left).put(bounds.top).put(bounds.right).put(bounds.bottom));
            json.put("clickable", node.isClickable());
            json.put("editable", node.isEditable());
            json.put("scrollable", node.isScrollable());
            json.put("enabled", node.isEnabled());
            json.put("focused", node.isFocused());
            nodes.put(json);

            int currentId = seen++;
            if (item.depth < maxDepth) {
                for (int i = 0; i < node.getChildCount(); i++) {
                    AccessibilityNodeInfo child = node.getChild(i);
                    if (child != null) queue.addLast(new NodeDepth(child, item.depth + 1, currentId));
                }
            }
        }

        wrapper.put("nodes", nodes);
        wrapper.put("truncated", !queue.isEmpty());
        wrapper.put("count", seen);
        return wrapper;
    }

    private static boolean containsIgnoreCase(CharSequence value, String query) {
        return value != null && value.toString().toLowerCase(Locale.ROOT)
                .contains(query.toLowerCase(Locale.ROOT));
    }

    private static String string(CharSequence value) {
        return value == null ? "" : value.toString();
    }

    private static String string(String value) {
        return value == null ? "" : value;
    }

    private static final class NodeDepth {
        final AccessibilityNodeInfo node;
        final int depth;
        final int parent;
        NodeDepth(AccessibilityNodeInfo node, int depth, int parent) {
            this.node = node;
            this.depth = depth;
            this.parent = parent;
        }
    }
}
