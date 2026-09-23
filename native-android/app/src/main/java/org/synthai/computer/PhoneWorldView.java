package org.synthai.computer;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
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
    private final List<AppPlace> apps = new ArrayList<>();
    private Listener listener;
    private String status = "MESH WAKING";

    PhoneWorldView(Context context) {
        super(context);
        setFocusable(true);
        setBackgroundColor(Color.rgb(10, 5, 20));
    }

    void setListener(Listener listener) {
        this.listener = listener;
    }

    void setApps(List<AppPlace> values) {
        apps.clear();
        apps.addAll(values);
        invalidate();
    }

    void setStatus(String value) {
        status = value;
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float density = getResources().getDisplayMetrics().density;
        float width = getWidth();
        int columns = Math.max(2, (int)(width / (150f * density)));
        float gap = 12f * density;
        float cellW = (width - gap * (columns + 1)) / columns;
        float cellH = 128f * density;
        float top = 70f * density;

        paint.setColor(Color.rgb(213, 180, 255));
        paint.setTextSize(19f * density);
        canvas.drawText("INDIVERSE", 18f * density, 32f * density, paint);

        paint.setColor(Color.rgb(155, 130, 185));
        paint.setTextSize(11f * density);
        canvas.drawText(status, 18f * density, 52f * density, paint);

        for (int i = 0; i < apps.size(); i++) {
            AppPlace app = apps.get(i);
            int row = i / columns;
            int col = i % columns;
            float left = gap + col * (cellW + gap);
            float y = top + row * (cellH + gap);
            app.bounds.set(left, y, left + cellW, y + cellH);

            paint.setColor(Color.rgb(42, 25, 63));
            canvas.drawRoundRect(app.bounds, 18f * density, 18f * density, paint);

            paint.setColor(Color.rgb(91, 57, 125));
            RectF roof = new RectF(left + 6f*density, y + cellH - 25f*density, left + cellW - 6f*density, y + cellH - 7f*density);
            canvas.drawRoundRect(roof, 8f*density, 8f*density, paint);

            if (app.icon != null) {
                int iconSize = (int)(45f * density);
                int cx = (int)(left + cellW / 2);
                int iy = (int)(y + 19f * density);
                app.icon.setBounds(cx - iconSize/2, iy, cx + iconSize/2, iy + iconSize);
                app.icon.draw(canvas);
            }

            paint.setColor(Color.WHITE);
            paint.setTextSize(12f * density);
            String label = app.label.length() > 18 ? app.label.substring(0, 17) + "…" : app.label;
            canvas.drawText(label, left + 10f*density, y + cellH - 37f*density, paint);
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (event.getAction() != MotionEvent.ACTION_UP) return true;
        for (AppPlace app : apps) {
            if (app.bounds.contains(event.getX(), event.getY())) {
                if (listener != null) listener.onEnter(app);
                performClick();
                return true;
            }
        }
        return true;
    }

    @Override
    public boolean performClick() {
        super.performClick();
        return true;
    }
}
