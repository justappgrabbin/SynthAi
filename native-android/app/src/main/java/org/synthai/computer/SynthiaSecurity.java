package org.synthai.computer;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.security.SecureRandom;

final class SynthiaSecurity {
    private static final String PREFS = "synthai-security";
    private static final String HAND_TOKEN = "android-hand-token";

    static String handToken(Context context) {
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String existing = prefs.getString(HAND_TOKEN, null);
        if (existing != null && existing.length() >= 32) return existing;
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String token = Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.URL_SAFE);
        prefs.edit().putString(HAND_TOKEN, token).apply();
        return token;
    }

    private SynthiaSecurity() {}
}
