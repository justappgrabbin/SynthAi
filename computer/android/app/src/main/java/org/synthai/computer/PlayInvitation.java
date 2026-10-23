package org.synthai.computer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.net.Uri;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;

/**
 * One-time, user-consented invite capture from Google Play.
 *
 * A Play referrer is UNTRUSTED attribution data, not proof of a relationship.
 * This class never auto-joins a mesh, sends birth data, or shares a chart.
 */
public final class PlayInvitation {
    private static final String PREFS = "synthia_installation";
    private static final String READ = "play_referrer_read";
    private static final String PENDING = "pending_invitation";
    private PlayInvitation() {}

    public static void checkOnFirstLaunch(Activity activity) {
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
        if (prefs.getBoolean(READ, false)) return;

        final InstallReferrerClient client =
                InstallReferrerClient.newBuilder(activity.getApplicationContext()).build();
        try {
            client.startConnection(new InstallReferrerStateListener() {
                private boolean handled = false;

                @Override public void onInstallReferrerSetupFinished(int responseCode) {
                    if (handled) return;
                    handled = true;
                    String code = null;
                    boolean readComplete = false;
                    try {
                        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                            String raw = client.getInstallReferrer().getInstallReferrer();
                            readComplete = true;
                            if (raw != null && raw.length() < 4096) {
                                Uri params = Uri.parse("https://synthia.invalid/?" + raw);
                                String candidate = params.getQueryParameter("invitation");
                                if (candidate != null && candidate.matches("[A-Za-z0-9_-]{1,48}")) {
                                    code = candidate;
                                }
                            }
                        } else if (responseCode ==
                                InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED) {
                            readComplete = true;
                        }
                    } catch (Exception ignored) {
                        // Retry the read on next launch; do not invent referral data.
                        readComplete = false;
                    } finally {
                        try { client.endConnection(); } catch (Exception ignored) {}
                    }

                    if (readComplete) prefs.edit().putBoolean(READ, true).apply();
                    if (code != null) {
                        final String pendingCode = code;
                        activity.runOnUiThread(() -> offerInvitation(activity, prefs, pendingCode));
                    }
                }

                @Override public void onInstallReferrerServiceDisconnected() {
                    // Transient Play service issue: leave READ=false for a later launch.
                }
            });
        } catch (RuntimeException ignored) {
            // Play Store unavailable. Normal offline computer startup is unaffected.
        }
    }

    private static void offerInvitation(Activity activity, SharedPreferences prefs, String code) {
        if (activity.isFinishing() || activity.isDestroyed()) return;
        new AlertDialog.Builder(activity)
                .setTitle("SYNTH AI invitation")
                .setMessage("You arrived through a shared SYNTH AI invitation. Keep the invitation on this phone? This does not connect you to another person or share your personal data.")
                .setPositiveButton("Keep invitation", (dialog, which) ->
                        prefs.edit().putString(PENDING, code).apply())
                .setNegativeButton("No thanks", (dialog, which) ->
                        prefs.edit().remove(PENDING).apply())
                .show();
    }

    /** Opaque invitation, only if the person agreed to retain it. No trust implied. */
    public static String getPendingInvitation(Activity activity) {
        return activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
                .getString(PENDING, null);
    }
}
