package org.synthai.computer;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.graphics.Rect;
import android.graphics.PixelFormat;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class WorldAccessibilityService extends AccessibilityService {
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private NativeSeedClient client;
    private WindowManager windowManager;
    private InterfaceWorldOverlayView overlay;
    private long rawModeUntil = 0L;
    private long lastCaptureAt = 0L;
    private static final long CAPTURE_DEBOUNCE_MS = 120L;
    private static final long ACTION_POLL_MS = 700L;

    private final Runnable actionPoll = new Runnable() {
        @Override public void run() {
            pollActions();
            main.postDelayed(this, ACTION_POLL_MS);
        }
    };

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        client = new NativeSeedClient("http://127.0.0.1:17757");
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
            info.flags |= AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            info.flags |= AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
            setServiceInfo(info);
        }
        mountWorldOverlay();
        main.removeCallbacks(actionPoll);
        main.post(actionPoll);
        captureCurrentInterface();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        CharSequence pkg = event.getPackageName();
        if (pkg != null && getPackageName().contentEquals(pkg)) {
            if (overlay != null) overlay.setVisibility(android.view.View.GONE);
            return;
        }
        long now = System.currentTimeMillis();
        if (now < rawModeUntil) return;
        if (overlay != null) overlay.setVisibility(android.view.View.VISIBLE);
        if (now - lastCaptureAt < CAPTURE_DEBOUNCE_MS) return;
        lastCaptureAt = now;
        captureCurrentInterface();
    }

    @Override
    public void onInterrupt() {}

    @Override
    public void onDestroy() {
        main.removeCallbacks(actionPoll);
        if (windowManager != null && overlay != null) {
            try { windowManager.removeView(overlay); } catch (Exception ignored) {}
        }
        overlay = null;
        io.shutdownNow();
        super.onDestroy();
    }

    private void captureCurrentInterface() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || client == null) return;
        try {
            JSONObject snapshot = new JSONObject();
            snapshot.put("packageName", text(root.getPackageName()));
            snapshot.put("windowId", root.getWindowId());
            snapshot.put("title", text(root.getPackageName()));
            snapshot.put("capturedAt", System.currentTimeMillis());
            int[] count = new int[]{0};
            snapshot.put("root", serializeNode(root, "0", 0, count));

            JSONObject body = new JSONObject();
            body.put("residentId", "synthia");
            body.put("snapshot", snapshot);
            io.execute(() -> {
                NativeSeedClient.Result result = client.post("/phone/interface-tree", body);
                if (!result.ok || result.body == null || result.body.isEmpty()) return;
                try {
                    JSONObject surface = new JSONObject(result.body);
                    main.post(() -> {
                        if (overlay != null && System.currentTimeMillis() >= rawModeUntil) {
                            overlay.setSurface(surface);
                        }
                    });
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }

    private void mountWorldOverlay() {
        if (overlay != null) return;
        windowManager = (WindowManager)getSystemService(WINDOW_SERVICE);
        if (windowManager == null) return;

        overlay = new InterfaceWorldOverlayView(this);
        overlay.setListener(new InterfaceWorldOverlayView.Listener() {
            @Override public void onBrickAction(String brickId, String affordance) {
                requestBrickAction(brickId, affordance);
            }
            @Override public void onRawMode() {
                rawModeUntil = System.currentTimeMillis() + 10_000L;
                overlay.setVisibility(android.view.View.GONE);
                main.postDelayed(() -> {
                    if (System.currentTimeMillis() >= rawModeUntil) {
                        captureCurrentInterface();
                    }
                }, 10_100L);
            }
        });

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.setTitle("SynthAI IndiVerse Interface World");
        try {
            windowManager.addView(overlay, params);
        } catch (Exception ignored) {
            overlay = null;
        }
    }

    private void requestBrickAction(String brickId, String affordance) {
        if (client == null || brickId == null || affordance == null) return;
        io.execute(() -> {
            try {
                JSONObject request = new JSONObject();
                request.put("brickId", brickId);
                request.put("action", affordance);
                request.put("residentId", "synthia");
                client.post("/phone/interface-action", request);
            } catch (Exception ignored) {}
        });
    }

    private JSONObject serializeNode(AccessibilityNodeInfo node, String path, int depth, int[] count) throws Exception {
        JSONObject out = new JSONObject();
        if (node == null || depth > 18 || count[0] >= 600) return out;
        count[0]++;

        boolean password = node.isPassword();
        out.put("nodeId", path);
        out.put("path", path);
        out.put("viewId", nullable(node.getViewIdResourceName()));
        out.put("className", text(node.getClassName()));
        out.put("packageName", text(node.getPackageName()));
        out.put("text", password ? JSONObject.NULL : nullable(node.getText()));
        out.put("contentDescription", nullable(node.getContentDescription()));
        out.put("hintText", password ? JSONObject.NULL : nullable(node.getHintText()));
        out.put("stateDescription", nullable(node.getStateDescription()));
        out.put("password", password);
        out.put("clickable", node.isClickable());
        out.put("longClickable", node.isLongClickable());
        out.put("editable", node.isEditable());
        out.put("scrollable", node.isScrollable());
        out.put("checkable", node.isCheckable());
        out.put("checked", node.isChecked());
        out.put("selected", node.isSelected());
        out.put("enabled", node.isEnabled());
        out.put("focusable", node.isFocusable());
        out.put("focused", node.isFocused());
        out.put("visible", node.isVisibleToUser());

        Rect bounds = new Rect();
        node.getBoundsInScreen(bounds);
        JSONObject box = new JSONObject();
        box.put("left", bounds.left);
        box.put("top", bounds.top);
        box.put("right", bounds.right);
        box.put("bottom", bounds.bottom);
        out.put("bounds", box);

        JSONArray actions = new JSONArray();
        List<AccessibilityNodeInfo.AccessibilityAction> actionList = node.getActionList();
        if (actionList != null) {
            for (AccessibilityNodeInfo.AccessibilityAction action : actionList) {
                String mapped = mapAction(action.getId());
                if (mapped != null) actions.put(mapped);
            }
        }
        out.put("actions", actions);

        JSONArray children = new JSONArray();
        for (int i = 0; i < node.getChildCount() && count[0] < 600; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) children.put(serializeNode(child, path + "." + i, depth + 1, count));
        }
        out.put("children", children);
        return out;
    }

    private void pollActions() {
        if (client == null) return;
        io.execute(() -> {
            try {
                JSONObject request = new JSONObject();
                request.put("limit", 10);
                NativeSeedClient.Result result = client.post("/phone/interface-actions/pending", request);
                if (!result.ok || result.body == null || result.body.isEmpty()) return;
                JSONArray actions = new JSONObject(result.body).optJSONArray("actions");
                if (actions == null) return;
                for (int i = 0; i < actions.length(); i++) {
                    JSONObject action = actions.optJSONObject(i);
                    if (action != null) main.post(() -> executeAndReceipt(action));
                }
            } catch (Exception ignored) {}
        });
    }

    private void executeAndReceipt(JSONObject action) {
        boolean success = false;
        String reason = null;
        String packageName = null;
        int windowId = -1;
        try {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) {
                reason = "NO_ACTIVE_WINDOW";
            } else {
                packageName = text(root.getPackageName());
                windowId = root.getWindowId();
                JSONObject binding = action.optJSONObject("binding");
                AccessibilityNodeInfo node = findBoundNode(root, binding);
                if (node == null) {
                    reason = "BOUND_NODE_NOT_FOUND";
                } else {
                    String nativeAction = action.optString("action", "");
                    success = performBoundAction(node, nativeAction, action.opt("value"));
                    if (!success) reason = "ANDROID_ACTION_REJECTED";
                }
            }
        } catch (Exception error) {
            reason = error.getClass().getSimpleName();
        }

        final boolean finalSuccess = success;
        final String finalReason = reason;
        final String finalPackage = packageName;
        final int finalWindow = windowId;
        io.execute(() -> {
            try {
                JSONObject receipt = new JSONObject();
                receipt.put("actionId", action.optString("id"));
                receipt.put("success", finalSuccess);
                receipt.put("reason", finalReason == null ? JSONObject.NULL : finalReason);
                receipt.put("packageName", finalPackage == null ? JSONObject.NULL : finalPackage);
                receipt.put("windowId", finalWindow);
                client.post("/phone/interface-actions/receipt", receipt);
            } catch (Exception ignored) {}
        });

        if (success) main.postDelayed(this::captureCurrentInterface, 100L);
    }

    private AccessibilityNodeInfo findBoundNode(AccessibilityNodeInfo root, JSONObject binding) {
        if (root == null || binding == null) return null;
        String expectedPackage = binding.optString("packageName", "");
        if (!expectedPackage.isEmpty() && root.getPackageName() != null && !expectedPackage.contentEquals(root.getPackageName())) return null;

        String path = binding.optString("path", "");
        AccessibilityNodeInfo byPath = nodeAtPath(root, path);
        if (byPath != null) return byPath;

        String viewId = binding.optString("viewId", "");
        if (!viewId.isEmpty()) {
            try {
                List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(viewId);
                if (nodes != null && !nodes.isEmpty()) return nodes.get(0);
            } catch (Exception ignored) {}
        }
        return null;
    }

    private AccessibilityNodeInfo nodeAtPath(AccessibilityNodeInfo root, String path) {
        if (root == null || path == null || path.isEmpty()) return null;
        String[] parts = path.split("\\.");
        AccessibilityNodeInfo current = root;
        try {
            for (int i = 1; i < parts.length; i++) {
                int index = Integer.parseInt(parts[i]);
                AccessibilityNodeInfo next = current.getChild(index);
                if (next == null) return null;
                current = next;
            }
            return current;
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean performBoundAction(AccessibilityNodeInfo node, String action, Object value) {
        if ("click".equals(action)) return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
        if ("long-click".equals(action)) return node.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK);
        if ("focus".equals(action)) return node.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
        if ("scroll-forward".equals(action)) return node.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD);
        if ("scroll-backward".equals(action)) return node.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
        if ("set-text".equals(action)) {
            Bundle args = new Bundle();
            args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value == null || value == JSONObject.NULL ? "" : String.valueOf(value));
            return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
        }
        return false;
    }

    private static String mapAction(int id) {
        if (id == AccessibilityNodeInfo.ACTION_CLICK) return "click";
        if (id == AccessibilityNodeInfo.ACTION_LONG_CLICK) return "long-click";
        if (id == AccessibilityNodeInfo.ACTION_SET_TEXT) return "set-text";
        if (id == AccessibilityNodeInfo.ACTION_SCROLL_FORWARD) return "scroll-forward";
        if (id == AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD) return "scroll-backward";
        if (id == AccessibilityNodeInfo.ACTION_FOCUS) return "focus";
        return null;
    }

    private static String text(CharSequence value) {
        return value == null ? "" : value.toString();
    }

    private static Object nullable(CharSequence value) {
        return value == null ? JSONObject.NULL : value.toString();
    }

    private static Object nullable(String value) {
        return value == null ? JSONObject.NULL : value;
    }
}
