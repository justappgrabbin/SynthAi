package app.synthai.hover;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Hover-face launcher. Ported from Synthia 5.8 android-host MainActivity, reshaped as a light
 * setup screen: it starts the foreground runtime/bridge, asks for the overlay permission, then
 * for Accessibility ("hands"), then starts the floating planet. The Synthia UI itself lives in
 * the planet's panel (OverlayService), so there is no full-screen dark WebView here.
 */
public final class MainActivity extends Activity {
    private static final String STATE_ASKED_OVERLAY = "asked-overlay";
    private static final String STATE_ASKED_HANDS = "asked-hands";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView status;
    private boolean askedOverlay;
    private boolean askedHands;

    private final Runnable refresher = new Runnable() {
        @Override
        public void run() {
            updateStatus();
            handler.postDelayed(this, 2000);
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            askedOverlay = state.getBoolean(STATE_ASKED_OVERLAY, false);
            askedHands = state.getBoolean(STATE_ASKED_HANDS, false);
        }
        Log.i(HoverPorts.TAG, "HOVER_LAUNCHER_CREATED package=" + getPackageName());

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
        }

        startBridge();
        setContentView(buildUi());
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        out.putBoolean(STATE_ASKED_OVERLAY, askedOverlay);
        out.putBoolean(STATE_ASKED_HANDS, askedHands);
    }

    @Override
    protected void onResume() {
        super.onResume();
        startBridge();
        guidePermissionsThenStartPlanet();
        handler.post(refresher);
    }

    @Override
    protected void onPause() {
        handler.removeCallbacks(refresher);
        super.onPause();
    }

    /** Overlay first (needed for the planet), then Accessibility (needed for hands), then the planet. */
    private void guidePermissionsThenStartPlanet() {
        if (!Settings.canDrawOverlays(this)) {
            if (!askedOverlay) {
                askedOverlay = true;
                Log.i(HoverPorts.TAG, "HOVER_ASK_OVERLAY");
                openOverlaySettings();
            }
            return;
        }
        startPlanet();
        if (!handsEnabled() && !askedHands) {
            askedHands = true;
            Log.i(HoverPorts.TAG, "HOVER_ASK_ACCESSIBILITY");
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        }
    }

    private LinearLayout buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);
        int pad = dp(20);
        root.setPadding(pad, pad, pad, pad);

        ImageView planet = new ImageView(this);
        planet.setImageResource(app.synthai.computer.R.drawable.synthia_planet);
        LinearLayout.LayoutParams planetParams = new LinearLayout.LayoutParams(dp(96), dp(96));
        planetParams.gravity = Gravity.CENTER_HORIZONTAL;
        root.addView(planet, planetParams);

        TextView title = new TextView(this);
        title.setText("Synthia");
        title.setTextSize(24);
        title.setTextColor(0xFF3A1D66);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(title, matchWrap());

        status = new TextView(this);
        status.setTextSize(14);
        status.setTextColor(0xFF333333);
        status.setPadding(0, dp(12), 0, dp(12));
        root.addView(status, matchWrap());

        Button overlay = button("1. Allow hover (display over other apps)");
        overlay.setOnClickListener(v -> openOverlaySettings());
        root.addView(overlay, matchWrap());

        Button hands = button("2. Enable Synthia Hands (Accessibility)");
        hands.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        root.addView(hands, matchWrap());

        Button start = button("3. Start planet");
        start.setOnClickListener(v -> {
            if (Settings.canDrawOverlays(this)) startPlanet();
            else openOverlaySettings();
            updateStatus();
        });
        root.addView(start, matchWrap());

        Button computer = button("Open Synthia computer · chat and Realm");
        computer.setOnClickListener(v -> startActivity(new Intent(this, NativeComputerActivity.class)));
        root.addView(computer, matchWrap());

        Button mic = button("Allow microphone (optional)");
        mic.setOnClickListener(v -> requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 102));
        root.addView(mic, matchWrap());

        Button battery = button("Battery optimisation settings (optional)");
        battery.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)));
        root.addView(battery, matchWrap());

        updateStatus();
        return root;
    }

    private void openOverlaySettings() {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
        try {
            startActivity(intent);
        } catch (Exception error) {
            Log.w(HoverPorts.TAG, "overlay settings unavailable: " + error.getMessage());
        }
    }

    private void startBridge() {
        Intent bridge = new Intent(this, BridgeForegroundService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(bridge);
        else startService(bridge);
    }

    private void startPlanet() {
        if (!Settings.canDrawOverlays(this)) return;
        startService(new Intent(this, OverlayService.class));
        Log.i(HoverPorts.TAG, "HOVER_PLANET_STARTED");
    }

    private boolean handsEnabled() {
        if (SynthiaAccessibilityService.getInstance() != null) return true;
        String enabled = Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        ComponentName component = new ComponentName(this, SynthiaAccessibilityService.class);
        return enabled.contains(component.flattenToString()) || enabled.contains(component.flattenToShortString());
    }

    private void updateStatus() {
        if (status == null) return;
        boolean hover = Settings.canDrawOverlays(this);
        String runtime = HoverRuntime.isReady()
                ? "ready"
                : (HoverRuntime.failure() == null ? "starting…" : "unavailable: " + HoverRuntime.failure());
        status.setText("Hover: " + (hover ? "allowed" : "needs overlay permission")
                + "\nHands: " + (handsEnabled() ? "enabled" : "needs Accessibility permission")
                + "\nPlanet: " + (OverlayService.isRunning() ? "floating" : "not started")
                + "\nSynthia 5.8 runtime (" + HoverPorts.RUNTIME_URL + "): " + runtime
                + "\nLocal hand bridge: " + HoverPorts.BRIDGE_URL);
    }

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
