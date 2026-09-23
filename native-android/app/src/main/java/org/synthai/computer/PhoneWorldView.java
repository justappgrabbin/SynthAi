package org.synthai.computer;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.view.MotionEvent;
import android.view.View;
import android.view.animation.DecelerateInterpolator;

import java.util.ArrayList;
import java.util.List;

final class PhoneWorldView extends View {
    static final class AppPlace {
        final String packageName;
        final String label;
        final Drawable icon;
        final String category;
        String experienceId;
        final RectF bounds = new RectF();

        AppPlace(String packageName, String label, Drawable icon, String category) {
            this.packageName = packageName;
            this.label = label;
            this.icon = icon;
            this.category = category == null ? "application" : category;
            this.experienceId = "pending";
        }
    }

    interface Listener {
        void onEnter(AppPlace app);
        void onPerceptionRequested();
    }

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final List<AppPlace> apps = new ArrayList<>();
    private final RectF perceptionButton = new RectF();
    private Listener listener;
    private String status = "MESH WAKING";
    private boolean perceptionEnabled = false;
    private boolean residentActive = false;
    private float density;
    private float characterX;
    private float characterY;
    private float scrollOffset = 0f;
    private float maxScroll = 0f;
    private float downX;
    private float downY;
    private float lastY;
    private boolean dragging = false;
    private ValueAnimator movementAnimator;

    PhoneWorldView(Context context) {
        super(context);
        density = getResources().getDisplayMetrics().density;
        setFocusable(true);
        setBackgroundColor(Color.rgb(7, 5, 13));
    }

    void setListener(Listener listener) {
        this.listener = listener;
    }

    void setApps(List<AppPlace> values) {
        apps.clear();
        apps.addAll(values);
        scrollOffset = Math.min(scrollOffset, maxScroll);
        invalidate();
    }

    void setExperience(String packageName, String experienceId) {
        for (AppPlace app : apps) {
            if (app.packageName.equals(packageName)) {
                app.experienceId = experienceId == null ? "application-place" : experienceId;
                invalidate();
                return;
            }
        }
    }

    void setStatus(String value) {
        status = value == null ? "" : value;
        invalidate();
    }

    void setPerceptionEnabled(boolean enabled) {
        perceptionEnabled = enabled;
        invalidate();
    }

    void setResidentActive(boolean active) {
        residentActive = active;
        invalidate();
    }

    private float dp(float value) {
        return value * density;
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        if (characterX == 0f && characterY == 0f) {
            characterX = w / 2f;
            characterY = h - dp(74);
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        drawSky(canvas);
        drawWorldHeader(canvas);
        drawTerrain(canvas);
        drawBuildings(canvas);
        drawResident(canvas);
        drawPerceptionControl(canvas);
    }

    private void drawSky(Canvas canvas) {
        paint.setColor(Color.rgb(13, 8, 24));
        canvas.drawRect(0, 0, getWidth(), getHeight(), paint);

        paint.setColor(Color.rgb(36, 19, 55));
        canvas.drawCircle(getWidth() * 0.78f, dp(105), dp(145), paint);
        paint.setColor(Color.rgb(24, 14, 40));
        canvas.drawCircle(getWidth() * 0.22f, dp(135), dp(115), paint);

        paint.setColor(Color.rgb(215, 190, 255));
        for (int i = 0; i < 22; i++) {
            float x = (i * 71f % Math.max(1, getWidth()));
            float y = dp(70) + (i * 37f % dp(170));
            canvas.drawCircle(x, y, i % 3 == 0 ? dp(1.4f) : dp(.8f), paint);
        }
    }

    private void drawWorldHeader(Canvas canvas) {
        paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        paint.setColor(Color.rgb(236, 221, 255));
        paint.setTextSize(dp(22));
        canvas.drawText("INDIVERSE", dp(18), dp(34), paint);

        paint.setTypeface(android.graphics.Typeface.DEFAULT);
        paint.setColor(Color.rgb(171, 147, 197));
        paint.setTextSize(dp(10.5f));
        canvas.drawText("PRIVATE PHONE WORLD · ANDROID BENEATH · CANONICAL PLACES ABOVE", dp(18), dp(52), paint);

        paint.setTextSize(dp(10));
        paint.setColor(status.contains("ERROR") || status.contains("UNMOUNTED")
            ? Color.rgb(255, 166, 184)
            : Color.rgb(153, 225, 198));
        canvas.drawText(status, dp(18), dp(69), paint);
    }

    private void drawTerrain(Canvas canvas) {
        float horizon = dp(205);
        paint.setColor(Color.rgb(17, 20, 27));
        canvas.drawRect(0, horizon, getWidth(), getHeight(), paint);

        paint.setColor(Color.rgb(27, 31, 38));
        Path road = new Path();
        road.moveTo(getWidth() * .45f, horizon);
        road.lineTo(getWidth() * .12f, getHeight());
        road.lineTo(getWidth() * .88f, getHeight());
        road.lineTo(getWidth() * .55f, horizon);
        road.close();
        canvas.drawPath(road, paint);

        paint.setColor(Color.rgb(71, 50, 88));
        paint.setStrokeWidth(dp(1.2f));
        for (float y = horizon + dp(45); y < getHeight(); y += dp(55)) {
            canvas.drawLine(0, y, getWidth(), y, paint);
        }
    }

    private void drawBuildings(Canvas canvas) {
        int columns = Math.max(2, Math.min(4, (int)(getWidth() / dp(175))));
        float gap = dp(18);
        float side = dp(18);
        float cellW = (getWidth() - side * 2 - gap * (columns - 1)) / columns;
        float cellH = dp(154);
        float startY = dp(225) - scrollOffset;

        int rows = (apps.size() + columns - 1) / columns;
        float contentBottom = dp(225) + rows * (cellH + gap);
        maxScroll = Math.max(0, contentBottom - (getHeight() - dp(130)));
        scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));

        for (int i = 0; i < apps.size(); i++) {
            AppPlace app = apps.get(i);
            int row = i / columns;
            int col = i % columns;
            float left = side + col * (cellW + gap);
            float top = startY + row * (cellH + gap);
            app.bounds.set(left, top, left + cellW, top + cellH);

            if (app.bounds.bottom < dp(85) || app.bounds.top > getHeight() - dp(20)) continue;

            drawBuilding(canvas, app);
        }
    }

    private void drawBuilding(Canvas canvas, AppPlace app) {
        RectF b = app.bounds;
        float inset = dp(5);
        boolean chat = "chat-space".equals(app.experienceId);
        boolean art = "art-studio".equals(app.experienceId);

        paint.setColor(chat
            ? Color.rgb(38, 53, 58)
            : art ? Color.rgb(64, 42, 54) : Color.rgb(40, 31, 50));
        canvas.drawRoundRect(b, dp(15), dp(15), paint);

        if (chat) {
            paint.setColor(Color.rgb(104, 160, 152));
            for (int i = 0; i < 3; i++) {
                float doorW = (b.width() - dp(34)) / 3f;
                RectF door = new RectF(
                    b.left + dp(8) + i * (doorW + dp(5)),
                    b.bottom - dp(58),
                    b.left + dp(8) + i * (doorW + dp(5)) + doorW,
                    b.bottom - dp(10)
                );
                canvas.drawRoundRect(door, dp(5), dp(5), paint);
            }
        } else if (art) {
            paint.setColor(Color.rgb(151, 87, 129));
            Path roof = new Path();
            roof.moveTo(b.left + inset, b.top + dp(38));
            roof.lineTo(b.centerX(), b.top + dp(7));
            roof.lineTo(b.right - inset, b.top + dp(38));
            roof.close();
            canvas.drawPath(roof, paint);

            paint.setColor(Color.rgb(205, 168, 195));
            RectF canvasPanel = new RectF(b.centerX() - dp(24), b.bottom - dp(60), b.centerX() + dp(24), b.bottom - dp(18));
            canvas.drawRect(canvasPanel, paint);
        } else {
            paint.setColor(Color.rgb(91, 70, 111));
            RectF roof = new RectF(b.left + inset, b.top + dp(8), b.right - inset, b.top + dp(26));
            canvas.drawRoundRect(roof, dp(7), dp(7), paint);
            paint.setColor(Color.rgb(73, 57, 88));
            for (int i = 0; i < 3; i++) {
                RectF window = new RectF(b.left + dp(12 + i * 28), b.top + dp(42), b.left + dp(29 + i * 28), b.top + dp(61));
                canvas.drawRoundRect(window, dp(3), dp(3), paint);
            }
        }

        if (app.icon != null) {
            int iconSize = (int)dp(34);
            int ix = (int)(b.left + dp(10));
            int iy = (int)(b.top + dp(10));
            app.icon.setBounds(ix, iy, ix + iconSize, iy + iconSize);
            app.icon.draw(canvas);
        }

        paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        paint.setColor(Color.WHITE);
        paint.setTextSize(dp(11));
        String label = trim(app.label, 19);
        canvas.drawText(label, b.left + dp(10), b.bottom - dp(76), paint);

        paint.setTypeface(android.graphics.Typeface.DEFAULT);
        paint.setColor(Color.rgb(190, 171, 207));
        paint.setTextSize(dp(8.5f));
        canvas.drawText(experienceLabel(app), b.left + dp(10), b.bottom - dp(64), paint);
    }

    private String experienceLabel(AppPlace app) {
        if ("chat-space".equals(app.experienceId)) return "CONVERSATION HOUSE";
        if ("art-studio".equals(app.experienceId)) return "ART STUDIO";
        if ("pending".equals(app.experienceId)) return "MAPPING PLACE…";
        return "APPLICATION PLACE";
    }

    private String trim(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }

    private void drawResident(Canvas canvas) {
        if (!residentActive) {
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(dp(2));
            paint.setColor(Color.rgb(137, 105, 159));
            canvas.drawCircle(characterX, characterY, dp(19), paint);
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.rgb(137, 105, 159));
            paint.setTextSize(dp(8));
            canvas.drawText("RESIDENT DORMANT", characterX - dp(33), characterY + dp(34), paint);
            return;
        }

        paint.setColor(Color.rgb(232, 212, 247));
        canvas.drawCircle(characterX, characterY - dp(25), dp(10), paint);
        paint.setColor(Color.rgb(123, 82, 151));
        RectF body = new RectF(characterX - dp(10), characterY - dp(15), characterX + dp(10), characterY + dp(15));
        canvas.drawRoundRect(body, dp(8), dp(8), paint);
        paint.setStrokeWidth(dp(4));
        canvas.drawLine(characterX - dp(5), characterY + dp(12), characterX - dp(9), characterY + dp(29), paint);
        canvas.drawLine(characterX + dp(5), characterY + dp(12), characterX + dp(9), characterY + dp(29), paint);

        paint.setColor(Color.rgb(209, 173, 240));
        paint.setTextSize(dp(8.5f));
        canvas.drawText("SYNTHIA", characterX - dp(19), characterY + dp(43), paint);
    }

    private void drawPerceptionControl(Canvas canvas) {
        float w = dp(126);
        float h = dp(34);
        float left = getWidth() - w - dp(14);
        float top = dp(18);
        perceptionButton.set(left, top, left + w, top + h);

        paint.setColor(perceptionEnabled ? Color.rgb(32, 78, 65) : Color.rgb(74, 49, 82));
        canvas.drawRoundRect(perceptionButton, dp(17), dp(17), paint);
        paint.setColor(Color.rgb(239, 229, 247));
        paint.setTextSize(dp(9));
        canvas.drawText(perceptionEnabled ? "PERCEPTION ON" : "ENABLE PERCEPTION", left + dp(12), top + dp(21), paint);
    }

    private void walkTo(AppPlace app) {
        if (movementAnimator != null) movementAnimator.cancel();

        float startX = characterX;
        float startY = characterY;
        float targetX = app.bounds.centerX();
        float targetY = Math.min(getHeight() - dp(72), app.bounds.bottom + dp(28));

        movementAnimator = ValueAnimator.ofFloat(0f, 1f);
        movementAnimator.setDuration(650L);
        movementAnimator.setInterpolator(new DecelerateInterpolator());
        movementAnimator.addUpdateListener(animation -> {
            float t = (float)animation.getAnimatedValue();
            characterX = startX + (targetX - startX) * t;
            characterY = startY + (targetY - startY) * t;
            invalidate();
        });
        movementAnimator.addListener(new android.animation.AnimatorListenerAdapter() {
            private boolean cancelled = false;
            @Override public void onAnimationCancel(android.animation.Animator animation) { cancelled = true; }
            @Override public void onAnimationEnd(android.animation.Animator animation) {
                if (!cancelled && listener != null) listener.onEnter(app);
            }
        });
        movementAnimator.start();
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downX = event.getX();
                downY = event.getY();
                lastY = downY;
                dragging = false;
                return true;

            case MotionEvent.ACTION_MOVE:
                float dy = event.getY() - lastY;
                if (Math.abs(event.getY() - downY) > dp(8)) dragging = true;
                if (dragging && maxScroll > 0) {
                    scrollOffset = Math.max(0, Math.min(maxScroll, scrollOffset - dy));
                    lastY = event.getY();
                    invalidate();
                }
                return true;

            case MotionEvent.ACTION_UP:
                if (dragging) return true;
                if (perceptionButton.contains(event.getX(), event.getY())) {
                    if (listener != null) listener.onPerceptionRequested();
                    performClick();
                    return true;
                }
                for (AppPlace app : apps) {
                    if (app.bounds.contains(event.getX(), event.getY())) {
                        walkTo(app);
                        performClick();
                        return true;
                    }
                }
                return true;

            default:
                return true;
        }
    }

    @Override
    public boolean performClick() {
        super.performClick();
        return true;
    }
}
