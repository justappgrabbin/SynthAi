package org.synthai.computer;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

final class TermuxBridge {
    private static final String TERMUX_PACKAGE = "com.termux";
    private static final String TERMUX_SERVICE = "com.termux.app.RunCommandService";
    private static final String ACTION = "com.termux.RUN_COMMAND";

    static boolean isInstalled(Context context) {
        try {
            context.getPackageManager().getPackageInfo(TERMUX_PACKAGE, 0);
            return true;
        } catch (PackageManager.NameNotFoundException error) {
            return false;
        }
    }

    static boolean startNativeSeed(Context context) {
        if (!isInstalled(context)) return false;
        Intent intent = new Intent(ACTION);
        intent.setClassName(TERMUX_PACKAGE, TERMUX_SERVICE);
        intent.putExtra("com.termux.RUN_COMMAND_PATH", "$PREFIX/bin/bash");
        intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{
            "-lc",
            "cd ~/SynthAi && exec node computer/native/native-seed-server.mjs"
        });
        intent.putExtra("com.termux.RUN_COMMAND_WORKDIR", "~/SynthAi");
        intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        intent.putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "SynthAI Native Seed");
        try {
            context.startService(intent);
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private TermuxBridge() {}
}
