package org.synthai.computer;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.view.MotionEvent;
import android.view.View;
import java.util.ArrayList;
import java.util.List;

final class PhoneWorldView extends View {
    static final class AppPlace {
        final String packageName;
        final String label;
        final Drawable icon;
        final RectF bounds = new RectF();
        float worldLeft;
        float worldTop;
        float worldRight;
        float worldBottom;

        AppPlace(String packageName, String label, Drawable icon) {
            this.packageName = packageName;
            this.label = label;
            this.icon = icon;
        }
    }

    interface Listener {
        void onEnter(AppPlace app);
    }

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Synthia57MirrorRenderer synthiaRenderer = new Synthia57MirrorRenderer();
    private final RectF mirrorButton = new RectF();
    private final List<AppPlace> apps = new ArrayList<>();
    private Listener listener;
    private Runnable mirrorListener;
    private Bitmap mirrorFace;
    private String status = "MESH WAKING";
    private String residentName = "YOU";

    private float density;
    private float cameraY = 0f;
    private float maxCameraY = 0f;
    private float downX;
    private float downY;
    private float cameraOnDown;
    private boolean dragging = false;

    private float residentX = -1f;
    private float residentY = 95f;
    private float targetX = -1f;
    private float targetY = -1f;
    private AppPlace targetApp = null;
    private long lastFrameNanos = 0L;

    PhoneWorldView(Context context) {
        super(context);
        density = getResources().getDisplayMetrics().density;
        setFocusable(true);
        setBackgroundColor(Color.rgb(9, 6, 18));
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(2f * density);
    }

    void setListener(Listener listener) {
        this.listener = listener;
    }

    void setMirrorListener(Runnable listener) {
        this.mirrorListener = listener;
    }

    void setMirrorFace(Bitmap bitmap) {
        this.mirrorFace = bitmap;
        invalidate();
    }

    void setResidentName(String value) {
        residentName = value == null || value.trim().isEmpty() ? "YOU" : value.trim().toUpperCase();
        invalidate();
    }

    void setApps(List<AppPlace> values) {
        apps.clear();
        apps.addAll(values);
        layoutWorld();
        invalidate();
    }

    void setStatus(String value) {
        status = value;
        invalidate();
    }

    private void layoutWorld() {
        float width = Math.max(getWidth(), 360f * density);
        float streetW = Math.max(82f * density, width * 0.22f);
        float sideMargin = 14f * density;
        float buildingW = (width - streetW - sideMargin * 4f) / 2f;
        float buildingH = 148f * density;
        float rowGap = 62f * density;
        float top = 145f * density;
        float streetLeft = (width - streetW) / 2f;

        for (int i = 0; i < apps.size(); i++) {
            AppPlace app = apps.get(i);
            int row = i / 2;
            boolean left = (i % 2) == 0;
            float y = top + row * (buildingH + rowGap);
            float x = left
                ? sideMargin
                : streetLeft + streetW + sideMargin;
            app.worldLeft = x;
            app.worldTop = y;
            app.worldRight = x + buildingW;
            app.worldBottom = y + buildingH;
        }

        int rows = Math.max(1, (apps.size() + 1) / 2);
        float contentHeight = top + rows * (buildingH + rowGap) + 120f * density;
        maxCameraY = Math.max(0f, contentHeight - Math.max(getHeight(), 1));
        cameraY = Math.max(0f, Math.min(cameraY, maxCameraY));

        if (residentX < 0f) residentX = width / 2f;
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        layoutWorld();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        animateResident();

        float width = getWidth();
        float height = getHeight();
        float streetW = Math.max(82f * density, width * 0.22f);
        float streetLeft = (width - streetW) / 2f;

        paint.setStyle(Paint.Style.FILL);

        // Sky / field.
        paint.setColor(Color.rgb(13, 8, 28));
        canvas.drawRect(0, 0, width, height, paint);
        paint.setColor(Color.rgb(31, 20, 48));
        canvas.drawRect(0, 70f * density, width, height, paint);

        // Header floats above the world.
        paint.setColor(Color.rgb(224, 200, 255));
        paint.setTextSize(20f * density);
        paint.setFakeBoldText(true);
        canvas.drawText("INDIVERSE", 18f * density, 30f * density, paint);
        paint.setFakeBoldText(false);
        paint.setColor(Color.rgb(170, 145, 198));
        paint.setTextSize(10.5f * density);
        canvas.drawText(status, 18f * density, 50f * density, paint);

        if (residentName.equals("SYNTHIA")) {
            paint.setColor(Color.rgb(61, 40, 79));
            mirrorButton.set(width - 86f*density, 15f*density, width - 14f*density, 50f*density);
            canvas.drawRoundRect(mirrorButton, 12f*density, 12f*density, paint);
            stroke.setColor(Color.rgb(132, 92, 168));
            canvas.drawRoundRect(mirrorButton, 12f*density, 12f*density, stroke);
            paint.setColor(Color.rgb(225, 204, 244));
            paint.setTextSize(9f*density);
            paint.setFakeBoldText(true);
            canvas.drawText(mirrorFace == null ? "MIRROR" : "MIRROR ✓", mirrorButton.left + 10f*density, mirrorButton.centerY() + 3f*density, paint);
            paint.setFakeBoldText(false);
        } else {
            mirrorButton.setEmpty();
        }

        canvas.save();
        canvas.translate(0f, -cameraY);

        float worldTop = cameraY + 70f * density;
        float worldBottom = cameraY + height + 80f * density;

        // Main street.
        paint.setColor(Color.rgb(23, 17, 34));
        canvas.drawRoundRect(new RectF(streetLeft, worldTop, streetLeft + streetW, worldBottom), 18f*density, 18f*density, paint);
        paint.setColor(Color.rgb(112, 79, 144));
        for (float y = worldTop + 25f*density; y < worldBottom; y += 44f*density) {
            canvas.drawRoundRect(new RectF(width/2f - 2f*density, y, width/2f + 2f*density, y + 18f*density), 2f*density, 2f*density, paint);
        }

        // A few little world markers so it reads as a place rather than a launcher.
        paint.setColor(Color.rgb(74, 49, 91));
        for (float y = 105f*density; y < worldBottom; y += 210f*density) {
            canvas.drawCircle(streetLeft - 8f*density, y, 6f*density, paint);
            canvas.drawCircle(streetLeft + streetW + 8f*density, y + 70f*density, 5f*density, paint);
        }

        for (AppPlace app : apps) drawBuilding(canvas, app, width, streetLeft, streetW);

        drawResident(canvas);

        canvas.restore();

        // Bottom hint stays on screen.
        paint.setColor(Color.argb(210, 18, 11, 29));
        canvas.drawRoundRect(new RectF(12f*density, height - 46f*density, width - 12f*density, height - 12f*density), 16f*density, 16f*density, paint);
        paint.setColor(Color.rgb(204, 183, 226));
        paint.setTextSize(10.5f*density);
        canvas.drawText(targetApp == null ? "Tap a building to walk there · drag to explore" : residentName + " → " + targetApp.label,
            24f*density, height - 25f*density, paint);

        if (targetApp != null) postInvalidateOnAnimation();
    }

    private void drawBuilding(Canvas canvas, AppPlace app, float width, float streetLeft, float streetW) {
        float left = app.worldLeft;
        float top = app.worldTop;
        float right = app.worldRight;
        float bottom = app.worldBottom;
        app.bounds.set(left, top - cameraY, right, bottom - cameraY);

        // Shadow.
        paint.setColor(Color.argb(90, 0, 0, 0));
        canvas.drawRoundRect(new RectF(left + 5f*density, top + 7f*density, right + 5f*density, bottom + 7f*density), 18f*density, 18f*density, paint);

        // Main building.
        paint.setColor(Color.rgb(54, 35, 75));
        canvas.drawRoundRect(new RectF(left, top, right, bottom), 18f*density, 18f*density, paint);
        stroke.setColor(Color.rgb(102, 67, 132));
        canvas.drawRoundRect(new RectF(left, top, right, bottom), 18f*density, 18f*density, stroke);

        // "Roof on the floor" world grammar. The shared object is still a building;
        // this is only its local IndiVerse expression.
        paint.setColor(Color.rgb(112, 70, 146));
        Path floorRoof = new Path();
        floorRoof.moveTo(left + 8f*density, bottom - 22f*density);
        floorRoof.lineTo((left + right)/2f, bottom + 10f*density);
        floorRoof.lineTo(right - 8f*density, bottom - 22f*density);
        floorRoof.close();
        canvas.drawPath(floorRoof, paint);

        // Door extends down into the floor/roof plane.
        boolean isLeft = right < width / 2f;
        float doorCenter = isLeft ? right - 22f*density : left + 22f*density;
        paint.setColor(Color.rgb(30, 19, 43));
        RectF door = new RectF(doorCenter - 13f*density, bottom - 66f*density, doorCenter + 13f*density, bottom + 2f*density);
        canvas.drawRoundRect(door, 8f*density, 8f*density, paint);
        paint.setColor(Color.rgb(210, 176, 241));
        canvas.drawCircle(doorCenter + 7f*density, bottom - 31f*density, 2.5f*density, paint);

        // App icon becomes the building sign/window.
        if (app.icon != null) {
            int iconSize = (int)(42f * density);
            int cx = (int)((left + right) / 2f);
            int iy = (int)(top + 18f*density);
            app.icon.setBounds(cx - iconSize/2, iy, cx + iconSize/2, iy + iconSize);
            app.icon.draw(canvas);
        }

        paint.setColor(Color.WHITE);
        paint.setTextSize(11f*density);
        paint.setFakeBoldText(true);
        String label = app.label.length() > 17 ? app.label.substring(0, 16) + "…" : app.label;
        canvas.drawText(label, left + 10f*density, top + 82f*density, paint);
        paint.setFakeBoldText(false);

        paint.setColor(Color.rgb(167, 141, 190));
        paint.setTextSize(8.5f*density);
        canvas.drawText("ENTER", left + 10f*density, top + 102f*density, paint);
    }

    private void drawResident(Canvas canvas) {
        if (residentName.equals("SYNTHIA")) {
            boolean walking = targetApp != null;
            boolean facingRight = targetX < 0f || targetX >= residentX;
            synthiaRenderer.draw(canvas, residentX, residentY + 12f*density, 116f*density, walking, facingRight, mirrorFace);
            paint.setColor(Color.rgb(230, 210, 244));
            paint.setTextSize(8f*density);
            paint.setFakeBoldText(true);
            float textW = paint.measureText("SYNTHIA 5.7");
            canvas.drawText("SYNTHIA 5.7", residentX - textW/2f, residentY + 28f*density, paint);
            paint.setFakeBoldText(false);
            if (walking) postInvalidateOnAnimation();
            return;
        }

        float r = 13f*density;
        paint.setColor(Color.rgb(184, 161, 214));
        canvas.drawCircle(residentX, residentY, r, paint);
        paint.setColor(Color.rgb(78, 47, 102));
        canvas.drawCircle(residentX - 4f*density, residentY - 2f*density, 1.6f*density, paint);
        canvas.drawCircle(residentX + 4f*density, residentY - 2f*density, 1.6f*density, paint);
        paint.setColor(Color.rgb(230, 210, 244));
        paint.setTextSize(8f*density);
        paint.setFakeBoldText(true);
        float textW = paint.measureText(residentName);
        canvas.drawText(residentName, residentX - textW/2f, residentY + 26f*density, paint);
        paint.setFakeBoldText(false);
    }

    private void animateResident() {
        if (targetApp == null || targetX < 0f || targetY < 0f) {
            lastFrameNanos = 0L;
            return;
        }
        long now = System.nanoTime();
        float dt = lastFrameNanos == 0L ? 1f/60f : Math.min(0.05f, (now - lastFrameNanos) / 1_000_000_000f);
        lastFrameNanos = now;
        float dx = targetX - residentX;
        float dy = targetY - residentY;
        float dist = (float)Math.sqrt(dx*dx + dy*dy);
        float step = 190f * density * dt;
        if (dist <= Math.max(step, 7f*density)) {
            residentX = targetX;
            residentY = targetY;
            AppPlace arrived = targetApp;
            targetApp = null;
            targetX = targetY = -1f;
            lastFrameNanos = 0L;
            if (listener != null) post(() -> listener.onEnter(arrived));
            return;
        }
        residentX += dx / dist * step;
        residentY += dy / dist * step;

        float screenY = residentY - cameraY;
        float upper = 120f*density;
        float lower = getHeight() - 100f*density;
        if (screenY < upper) cameraY = clamp(residentY - upper, 0f, maxCameraY);
        else if (screenY > lower) cameraY = clamp(residentY - lower, 0f, maxCameraY);
    }

    private void walkTo(AppPlace app) {
        float width = getWidth();
        boolean left = app.worldRight < width / 2f;
        float streetW = Math.max(82f * density, width * 0.22f);
        float streetLeft = (width - streetW) / 2f;
        targetX = left ? streetLeft + 16f*density : streetLeft + streetW - 16f*density;
        targetY = app.worldBottom - 22f*density;
        targetApp = app;
        setStatus(residentName + " WALKING TO " + app.label.toUpperCase());
        postInvalidateOnAnimation();
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = event.getX();
                downY = event.getY();
                cameraOnDown = cameraY;
                dragging = false;
                return true;
            case MotionEvent.ACTION_MOVE:
                float dy = event.getY() - downY;
                if (Math.abs(dy) > 7f*density) dragging = true;
                if (dragging) {
                    cameraY = clamp(cameraOnDown - dy, 0f, maxCameraY);
                    invalidate();
                }
                return true;
            case MotionEvent.ACTION_UP:
                if (!dragging && !mirrorButton.isEmpty() && mirrorButton.contains(event.getX(), event.getY())) {
                    if (mirrorListener != null) mirrorListener.run();
                    performClick();
                    return true;
                }
                if (!dragging) {
                    for (AppPlace app : apps) {
                        if (app.bounds.contains(event.getX(), event.getY())) {
                            walkTo(app);
                            performClick();
                            return true;
                        }
                    }
                }
                performClick();
                return true;
            default:
                return true;
        }
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    @Override
    public boolean performClick() {
        super.performClick();
        return true;
    }
}
