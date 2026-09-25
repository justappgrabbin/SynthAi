package org.synthai.computer;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Intent;
import android.graphics.Path;
import android.net.Uri;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public final class SynthiaAccessibilityService extends AccessibilityService {
    private volatile boolean running;
    private ServerSocket server;
    private Thread thread;
    private final Map<String, AccessibilityNodeInfo> nodes = Collections.synchronizedMap(new HashMap<>());

    @Override protected void onServiceConnected() { super.onServiceConnected(); startBridge(); }
    @Override public void onAccessibilityEvent(AccessibilityEvent event) {}
    @Override public void onInterrupt() {}

    @Override
    public void onDestroy() {
        running = false;
        try { if (server != null) server.close(); } catch (Exception ignored) {}
        super.onDestroy();
    }

    private void startBridge() {
        if (running) return;
        running = true;
        thread = new Thread(() -> {
            try {
                server = new ServerSocket();
                server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 18758));
                while (running) handle(server.accept());
            } catch (Exception error) {
                running = false;
            }
        }, "SynthiaHandBridge");
        thread.start();
    }

    private void handle(Socket socket) {
        try (Socket s = socket) {
            BufferedReader reader = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
            String first = reader.readLine();
            if (first == null) return;
            String[] request = first.split(" ");
            String method = request.length > 0 ? request[0] : "GET";
            String path = request.length > 1 ? request[1] : "/";
            int length = 0;
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                if (line.toLowerCase().startsWith("content-length:")) length = Integer.parseInt(line.substring(15).trim());
            }
            char[] bodyChars = new char[length];
            int offset = 0;
            while (offset < length) {
                int read = reader.read(bodyChars, offset, length - offset);
                if (read < 0) break;
                offset += read;
            }
            JSONObject body = length > 0 ? new JSONObject(new String(bodyChars, 0, offset)) : new JSONObject();
            JSONObject response;
            int status = 200;
            try {
                response = dispatch(method, path, body);
                if (!response.optBoolean("ok", true)) status = 400;
            } catch (Exception error) {
                status = 500;
                response = new JSONObject().put("ok", false).put("error", String.valueOf(error.getMessage()));
            }
            byte[] bytes = response.toString().getBytes(StandardCharsets.UTF_8);
            OutputStream out = s.getOutputStream();
            out.write(("HTTP/1.1 " + status + (status == 200 ? " OK" : status == 400 ? " Bad Request" : " Internal Server Error") + "\r\n"
                + "Content-Type: application/json\r\n"
                + "Content-Length: " + bytes.length + "\r\n"
                + "Connection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            out.write(bytes);
            out.flush();
        } catch (Exception ignored) {}
    }

    private JSONObject dispatch(String method, String path, JSONObject body) throws Exception {
        JSONObject out = new JSONObject();
        if (path.equals("/health")) return out.put("ok", true).put("service", "synthia-android-hand");
        if (path.equals("/tree")) return tree().put("ok", true);
        if (path.equals("/open")) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(body.getString("url")));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return out.put("ok", true);
        }
        if (path.equals("/global")) {
            String action = body.optString("action");
            int global;
            if (action.equals("back")) global = GLOBAL_ACTION_BACK;
            else if (action.equals("home")) global = GLOBAL_ACTION_HOME;
            else if (action.equals("recents")) global = GLOBAL_ACTION_RECENTS;
            else return out.put("ok", false).put("error", "unsupported global action: " + action);
            return out.put("ok", performGlobalAction(global));
        }
        if (path.equals("/tap")) {
            Path gesturePath = new Path();
            gesturePath.moveTo((float) body.getDouble("x"), (float) body.getDouble("y"));
            GestureDescription gesture = new GestureDescription.Builder()
                .addStroke(new GestureDescription.StrokeDescription(gesturePath, 0, 80))
                .build();
            return out.put("ok", dispatchGesture(gesture, null, null));
        }
        if (path.equals("/scroll")) {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            AccessibilityNodeInfo target = findScrollable(root);
            String direction = body.optString("direction", "forward");
            int action = direction.equals("backward") ? AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD : AccessibilityNodeInfo.ACTION_SCROLL_FORWARD;
            return out.put("ok", target != null && target.performAction(action));
        }
        if (path.equals("/node/click")) {
            AccessibilityNodeInfo node = nodes.get(body.optString("id"));
            return out.put("ok", node != null && node.performAction(AccessibilityNodeInfo.ACTION_CLICK));
        }
        if (path.equals("/form/fill")) {
            JSONArray entries = body.optJSONArray("entries");
            int filled = 0;
            if (entries != null) {
                for (int i = 0; i < entries.length(); i++) {
                    JSONObject entry = entries.getJSONObject(i);
                    AccessibilityNodeInfo node = findEditable(entry.optString("name"));
                    if (node != null) {
                        Bundle args = new Bundle();
                        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, entry.optString("value"));
                        if (node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) filled++;
                    }
                }
            }
            return out.put("ok", true).put("filled", filled);
        }
        if (path.equals("/form/submit")) {
            AccessibilityNodeInfo node = findByText("submit");
            if (node == null) node = findByText("send");
            return out.put("ok", node != null && node.performAction(AccessibilityNodeInfo.ACTION_CLICK));
        }
        return out.put("ok", false).put("error", "unknown route");
    }

    private JSONObject tree() throws Exception {
        nodes.clear();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        JSONObject out = new JSONObject().put("url", "").put("title", "");
        JSONArray actions = new JSONArray();
        JSONArray forms = new JSONArray();
        JSONArray fields = new JSONArray();
        walk(root, "0", actions, fields);
        if (fields.length() > 0) forms.put(new JSONObject().put("id", "android-active-form").put("fields", fields));
        return out.put("actions", actions).put("forms", forms).put("source", "android-accessibility");
    }

    private void walk(AccessibilityNodeInfo node, String id, JSONArray actions, JSONArray fields) throws Exception {
        if (node == null) return;
        nodes.put(id, node);
        CharSequence textValue = node.getText();
        CharSequence description = node.getContentDescription();
        String text = textValue != null ? textValue.toString() : (description != null ? description.toString() : "");
        if (node.isClickable()) actions.put(new JSONObject().put("id", id).put("text", text).put("role", String.valueOf(node.getClassName())));
        if (node.isEditable()) fields.put(new JSONObject().put("id", id).put("name", text).put("label", text).put("type", "text"));
        for (int i = 0; i < node.getChildCount(); i++) walk(node.getChild(i), id + "." + i, actions, fields);
    }

    private AccessibilityNodeInfo findEditable(String hint) { return find(getRootInActiveWindow(), hint, true); }
    private AccessibilityNodeInfo findByText(String text) { return find(getRootInActiveWindow(), text, false); }

    private AccessibilityNodeInfo find(AccessibilityNodeInfo node, String query, boolean editable) {
        if (node == null) return null;
        String searchable = String.valueOf(node.getText()) + " " + String.valueOf(node.getContentDescription()) + " " + String.valueOf(node.getViewIdResourceName());
        if ((!editable || node.isEditable()) && searchable.toLowerCase().contains(query.toLowerCase())) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo found = find(node.getChild(i), query, editable);
            if (found != null) return found;
        }
        return null;
    }

    private AccessibilityNodeInfo findScrollable(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isScrollable()) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo found = findScrollable(node.getChild(i));
            if (found != null) return found;
        }
        return null;
    }
}
