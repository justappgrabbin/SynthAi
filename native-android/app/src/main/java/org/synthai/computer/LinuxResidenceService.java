package org.synthai.computer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public final class LinuxResidenceService extends Service {
    private static final String CHANNEL = "synthai-linux-residence";
    private static final int NOTIFICATION_ID = 5810;
    private LinuxResidenceManager residence;

    public static void start(Context context) {
        Intent intent = new Intent(context, LinuxResidenceService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        startForeground(NOTIFICATION_ID, notification("Starting local Linux residence"));
        residence = new LinuxResidenceManager(this);
        residence.ensureStarted(new LinuxResidenceManager.Listener() {
            @Override public void onStatus(String status) { update(status); }
            @Override public void onReady() { update("Local Linux residence active"); }
            @Override public void onError(Throwable error) { update("Linux residence error: " + String.valueOf(error.getMessage())); }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (residence != null && !residence.isRunning()) {
            residence.ensureStarted(new LinuxResidenceManager.Listener() {
                @Override public void onStatus(String status) { update(status); }
                @Override public void onReady() { update("Local Linux residence active"); }
                @Override public void onError(Throwable error) { update("Linux residence error: " + String.valueOf(error.getMessage())); }
            });
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (residence != null) residence.shutdown();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(new NotificationChannel(
                CHANNEL,
                "Synthia local residence",
                NotificationManager.IMPORTANCE_LOW
            ));
        }
    }

    private Notification notification(String text) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL)
            : new Notification.Builder(this);
        return builder
            .setContentTitle("Synthia")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.presence_online)
            .setOngoing(true)
            .build();
    }

    private void update(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.notify(NOTIFICATION_ID, notification(text));
    }
}
