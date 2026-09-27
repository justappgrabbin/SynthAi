package app.synthai.computer;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;

import java.security.SecureRandom;

public final class ComputerBackendService extends Service {
    private static final String TAG = "SynthAIComputer";
    private static final String PREFS = "synthai-local-computer";
    private static final String SECRET_KEY = "session-secret";

    private static volatile boolean ready;
    private static volatile String failure;

    private LinuxContainer container;
    private Thread worker;

    static String sessionSecret(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String existing = prefs.getString(SECRET_KEY, null);
        if (existing != null && existing.length() >= 32) return existing;

        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String created = Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.URL_SAFE);
        prefs.edit().putString(SECRET_KEY, created).apply();
        return created;
    }

    static boolean isReady() {
        return ready;
    }

    static String failure() {
        return failure;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        ready = false;
        failure = null;
        startBackend();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (worker == null || !worker.isAlive()) startBackend();
        return START_STICKY;
    }

    private synchronized void startBackend() {
        if (worker != null && worker.isAlive()) return;
        worker = new Thread(() -> {
            try {
                container = new LinuxContainer(this, sessionSecret(this));
                container.startAndVerify();
                ready = true;
                failure = null;
                Log.i(TAG, "COMPUTER_BACKEND_SERVICE_READY=true");
            } catch (UnsupportedOperationException unsupported) {
                ready = false;
                failure = unsupported.getMessage();
                Log.w(TAG, "LOCAL_BACKEND_UNSUPPORTED_ABI " + failure);
            } catch (Throwable error) {
                ready = false;
                failure = String.valueOf(error.getMessage());
                Log.e(TAG, "LOCAL_BACKEND_FAILED " + failure, error);
            }
        }, "SynthAI-Computer-Backend");
        worker.setDaemon(true);
        worker.start();
    }

    @Override
    public void onDestroy() {
        ready = false;
        if (container != null) container.stop();
        container = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
