package com.synthia.sovereign;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public final class BridgeForegroundService extends Service {
    private static final String CHANNEL_ID = "cynthia_hands";
    private LocalBridgeServer server;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(
                this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        Notification notification = builder
                .setContentTitle("Cynthia hands are ready")
                .setContentText("Local accessibility bridge active on 127.0.0.1:8787")
                .setSmallIcon(com.synthia.sovereign.R.drawable.synthia_planet)
                .setContentIntent(pending)
                .setOngoing(true)
                .build();

        startForeground(58, notification);
        server = new LocalBridgeServer(getApplicationContext(), 8787);
        server.start();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (server != null) server.start();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (server != null) server.stop();
        server = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Cynthia hands", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Keeps Cynthia's local, device-only hand bridge available.");
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }
}
