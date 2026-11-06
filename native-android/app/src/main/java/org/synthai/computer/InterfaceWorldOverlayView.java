package org.synthai.computer;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.MotionEvent;
import android.view.View;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

final class InterfaceWorldOverlayView extends View {
    interface Listener {
        void onBrickAction(String brickId, String affordance);
        void onRawMode();
    }

    static final class Brick {
        String id;
        String label;
        String kind;
        String affordance;
        String form;
        String material;
        int fillColor;
        int accentColor;
        boolean interactive;
        final RectF bounds = new RectF();
    }

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final List<Brick> bricks = new ArrayList<>();
    private final RectF rawButton = new RectF();
    private final float density;
    private Listener listener;
    private String title = "INDIVERSE";
    private String packageName = "";
    private String worldName = "INDIVERSE";
    private String topology = "street";
    private int skyTop = Color.rgb(20,12,38);
    private int skyBottom = Color.rgb(52,34,72);
    private int groundColor = Color.rgb(31,24,43);
    private int horizonColor = Color.rgb(73,52,91);
    private int pathColor = Color.rgb(71,51,86);
    private int brickCount = 0;

    InterfaceWorldOverlayView(Context context) {
        super(context);
        density = getResources().getDisplayMetrics().density;
        setBackgroundColor(Color.TRANSPARENT);
        setFocusable(false);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(1.5f * density);
    }

    void setListener(Listener value) {
        listener = value;
    }

    void setSurface(JSONObject surface) {
        bricks.clear();
        if (surface == null) {
            setVisibility(GONE);
            return;
        }
        title = surface.optString("title", "INDIVERSE");
        packageName = surface.optString("packageName", "");
        JSONObject profile = surface.optJSONObject("worldProfile");
        if (profile != null) {
            worldName = profile.optString("name", "INDIVERSE");
            JSONObject environment = profile.optJSONObject("environment");
            JSONObject layout = profile.optJSONObject("layout");
            if (layout != null) topology = layout.optString("topology", topology);
            if (environment != null) {
                skyTop = parseColor(environment.optString("skyTop", null), skyTop);
                skyBottom = parseColor(environment.optString("skyBottom", null), skyBottom);
                groundColor = parseColor(environment.optString("ground", null), groundColor);
                horizonColor = parseColor(environment.optString("horizon", null), horizonColor);
                pathColor = parseColor(environment.optString("path", null), pathColor);
            }
        }
        JSONArray source = surface.optJSONArray("bricks");
        brickCount = source == null ? 0 : source.length();

        if (source != null) {
            for (int i = 0; i < source.length() && bricks.size() < 30; i++) {
                JSONObject item = source.optJSONObject(i);
                if (item == null) continue;
                JSONObject state = item.optJSONObject("state");
                if (state != null && !state.optBoolean("visible", true)) continue;
                JSONObject world = item.optJSONObject("world");
                String kind = world == null ? "world-brick" : world.optString("kind", "world-brick");
                String label = item.optString("label", "").trim();
                if ("world-brick".equals(kind)) continue;
                if ("sign".equals(kind) && label.isEmpty()) continue;

                Brick brick = new Brick();
                brick.id = item.optString("id", "");
                brick.label = label.isEmpty() ? kind : label;
                brick.kind = kind;
                JSONObject expression = item.optJSONObject("expression");
                JSONObject archetype = expression == null ? null : expression.optJSONObject("archetype");
                JSONObject effects = expression == null ? null : expression.optJSONObject("effects");
                brick.form = archetype == null ? kind : archetype.optString("form", archetype.optString("shape", kind));
                brick.material = expression == null ? "resolved-interface" : expression.optString("material", "resolved-interface");
                brick.fillColor = parseColor(expression == null ? null : expression.optString("color", null), defaultBrickColor(kind, true));
                brick.accentColor = parseColor(archetype == null ? null : archetype.optString("accent", null), effects == null ? Color.rgb(174,132,207) : parseColor(effects.optString("glowColor", null), Color.rgb(174,132,207)));

                JSONArray affordances = item.optJSONArray("affordances");
                brick.affordance = chooseAffordance(kind, affordances);
                brick.interactive = brick.affordance != null;
                bricks.add(brick);
            }
        }
        setVisibility(VISIBLE);
        layoutBricks();
        invalidate();
    }

    private String chooseAffordance(String kind, JSONArray list) {
        if (list == null || list.length() == 0) return null;
        if ("writing-desk".equals(kind)) {
            for (int i = 0; i < list.length(); i++) {
                JSONObject a = list.optJSONObject(i);
                if (a != null && "focus".equals(a.optString("id"))) return "focus";
            }
        }
        for (int i = 0; i < list.length(); i++) {
            JSONObject a = list.optJSONObject(i);
            if (a == null) continue;
            String id = a.optString("id", "");
            if (!id.isEmpty() && !"inspect".equals(id) && !"read".equals(id)) return id;
        }
        JSONObject first = list.optJSONObject(0);
        return first == null ? null : first.optString("id", null);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        layoutBricks();
    }

    private void layoutBricks() {
        float w = Math.max(1, getWidth());
        float h = Math.max(1, getHeight());
        float top = 100f * density;
        float bottom = h - 70f * density;
        float center = w / 2f;
        int count = Math.max(1, bricks.size());

        for (int i = 0; i < bricks.size(); i++) {
            Brick brick = bricks.get(i);
            float t = count == 1 ? 0.5f : i / (float)(count - 1);
            float y = top + (bottom - top) * (0.15f + 0.82f * t);
            float depthScale = 0.55f + 0.45f * t;
            float bw = 108f * density * depthScale;
            float bh = 66f * density * depthScale;
            boolean left = (i % 2) == 0;
            float lane = (70f + 72f * t) * density;
            float x = left ? center - lane - bw : center + lane;
            brick.bounds.set(x, y - bh, x + bw, y);
        }
        rawButton.set(w - 82f*density, 18f*density, w - 14f*density, 54f*density);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float w = getWidth();
        float h = getHeight();

        LinearGradient sky = new LinearGradient(0,0,0,h,
            skyTop, skyBottom, Shader.TileMode.CLAMP);
        paint.setShader(sky);
        canvas.drawRect(0,0,w,h,paint);
        paint.setShader(null);

        // Distant wall / horizon.
        paint.setColor(horizonColor);
        canvas.drawRect(0, 72f*density, w, 150f*density, paint);

        // Perspective floor.
        Path floor = new Path();
        floor.moveTo(w*0.19f,h);
        floor.lineTo(w*0.42f,145f*density);
        floor.lineTo(w*0.58f,145f*density);
        floor.lineTo(w*0.81f,h);
        floor.close();
        paint.setColor(groundColor);
        canvas.drawPath(floor,paint);

        // Central path.
        Path path = new Path();
        path.moveTo(w*0.42f,h);
        path.lineTo(w*0.485f,145f*density);
        path.lineTo(w*0.515f,145f*density);
        path.lineTo(w*0.58f,h);
        path.close();
        paint.setColor(pathColor);
        canvas.drawPath(path,paint);

        // Horizon portal identifying the current interface/building.
        paint.setColor(Color.rgb(37,25,52));
        RectF portal = new RectF(w/2f-45f*density,88f*density,w/2f+45f*density,150f*density);
        canvas.drawRoundRect(portal,20f*density,20f*density,paint);
        stroke.setColor(Color.rgb(177,135,213));
        canvas.drawRoundRect(portal,20f*density,20f*density,stroke);

        for (Brick brick : bricks) drawBrick(canvas, brick);

        // World header.
        paint.setColor(Color.argb(225,9,6,18));
        canvas.drawRoundRect(new RectF(12f*density,12f*density,w-96f*density,64f*density),16f*density,16f*density,paint);
        paint.setColor(Color.rgb(232,211,248));
        paint.setTextSize(15f*density);
        paint.setFakeBoldText(true);
        canvas.drawText(trim(worldName+" · "+title,28),24f*density,35f*density,paint);
        paint.setFakeBoldText(false);
        paint.setColor(Color.rgb(166,139,188));
        paint.setTextSize(8.5f*density);
        canvas.drawText(brickCount+" interface pieces → "+bricks.size()+" world bricks",24f*density,53f*density,paint);

        // Temporary raw-interface escape.
        paint.setColor(Color.rgb(60,43,78));
        canvas.drawRoundRect(rawButton,12f*density,12f*density,paint);
        stroke.setColor(Color.rgb(150,113,180));
        canvas.drawRoundRect(rawButton,12f*density,12f*density,stroke);
        paint.setColor(Color.rgb(232,211,248));
        paint.setTextSize(9f*density);
        paint.setFakeBoldText(true);
        canvas.drawText("RAW",rawButton.left+22f*density,rawButton.centerY()+3f*density,paint);
        paint.setFakeBoldText(false);

        paint.setColor(Color.argb(210,12,8,22));
        canvas.drawRoundRect(new RectF(14f*density,h-48f*density,w-14f*density,h-14f*density),15f*density,15f*density,paint);
        paint.setColor(Color.rgb(202,180,221));
        paint.setTextSize(9f*density);
        canvas.drawText(packageName.isEmpty()?"Resolved device interface":trim(packageName,42),24f*density,h-27f*density,paint);
    }

    private void drawBrick(Canvas canvas, Brick brick) {
        RectF b = brick.bounds;
        int base = brick.fillColor != 0 ? brick.fillColor : defaultBrickColor(brick.kind, brick.interactive);
        paint.setColor(Color.argb(100,0,0,0));
        canvas.drawRoundRect(new RectF(b.left+4f*density,b.top+5f*density,b.right+4f*density,b.bottom+5f*density),10f*density,10f*density,paint);

        String visual = brick.form == null ? brick.kind : brick.form.toLowerCase();
        if (visual.contains("gumdrop") || visual.contains("bubble") || visual.contains("orb")) {
            paint.setColor(base);
            canvas.drawOval(b,paint);
            paint.setColor(withAlpha(brick.accentColor,90));
            canvas.drawOval(new RectF(b.left+b.width()*0.18f,b.top+b.height()*0.12f,b.right-b.width()*0.18f,b.top+b.height()*0.38f),paint);
        } else if (visual.contains("cloud")) {
            paint.setColor(base);
            float cy=b.centerY();
            canvas.drawCircle(b.left+b.width()*0.28f,cy,Math.min(b.width(),b.height())*0.28f,paint);
            canvas.drawCircle(b.centerX(),cy-b.height()*0.12f,Math.min(b.width(),b.height())*0.35f,paint);
            canvas.drawCircle(b.right-b.width()*0.28f,cy,Math.min(b.width(),b.height())*0.28f,paint);
        } else if (visual.contains("tree") || visual.contains("flower")) {
            paint.setColor(brick.accentColor);
            canvas.drawRect(b.centerX()-3f*density,b.centerY(),b.centerX()+3f*density,b.bottom,paint);
            paint.setColor(base);
            canvas.drawCircle(b.centerX(),b.centerY()-b.height()*0.12f,Math.min(b.width(),b.height())*0.34f,paint);
        } else switch (brick.kind) {
            case "door":
            case "room":
            case "district":
                paint.setColor(base);
                canvas.drawRoundRect(b,13f*density,13f*density,paint);
                paint.setColor(Color.rgb(29,20,40));
                RectF opening = new RectF(b.centerX()-b.width()*0.22f,b.top+b.height()*0.25f,b.centerX()+b.width()*0.22f,b.bottom);
                canvas.drawRoundRect(opening,8f*density,8f*density,paint);
                break;
            case "writing-desk":
            case "counter":
                paint.setColor(base);
                canvas.drawRoundRect(new RectF(b.left,b.centerY(),b.right,b.bottom),8f*density,8f*density,paint);
                paint.setColor(Color.rgb(126,88,151));
                canvas.drawRect(b.left,b.centerY()-5f*density,b.right,b.centerY()+4f*density,paint);
                break;
            case "lever":
                paint.setColor(base);
                canvas.drawRoundRect(b,10f*density,10f*density,paint);
                stroke.setColor(Color.rgb(195,155,225));
                stroke.setStrokeWidth(4f*density);
                canvas.drawLine(b.centerX(),b.centerY()+12f*density,b.centerX()+15f*density,b.centerY()-14f*density,stroke);
                stroke.setStrokeWidth(1.5f*density);
                break;
            case "dial":
                paint.setColor(base);
                canvas.drawOval(b,paint);
                stroke.setColor(Color.rgb(195,155,225));
                canvas.drawLine(b.centerX(),b.centerY(),b.centerX(),b.top+10f*density,stroke);
                break;
            case "mural":
                paint.setColor(Color.rgb(118,87,139));
                canvas.drawRoundRect(b,8f*density,8f*density,paint);
                paint.setColor(Color.rgb(34,26,45));
                canvas.drawRoundRect(new RectF(b.left+6f*density,b.top+6f*density,b.right-6f*density,b.bottom-6f*density),5f*density,5f*density,paint);
                break;
            case "shelf-wall":
                paint.setColor(base);
                canvas.drawRoundRect(b,8f*density,8f*density,paint);
                paint.setColor(Color.rgb(145,106,166));
                for(int i=1;i<3;i++) canvas.drawRect(b.left+5f*density,b.top+b.height()*i/3f,b.right-5f*density,b.top+b.height()*i/3f+2f*density,paint);
                break;
            case "corridor":
                paint.setColor(Color.rgb(48,37,61));
                canvas.drawRoundRect(b,16f*density,16f*density,paint);
                break;
            case "sign":
                paint.setColor(Color.rgb(92,68,108));
                canvas.drawRoundRect(b,6f*density,6f*density,paint);
                break;
            default:
                paint.setColor(base);
                canvas.drawRoundRect(b,10f*density,10f*density,paint);
        }

        stroke.setColor(brick.interactive?brick.accentColor:withAlpha(brick.accentColor,150));
        canvas.drawRoundRect(b,10f*density,10f*density,stroke);
        paint.setColor(Color.rgb(239,224,248));
        paint.setTextSize(Math.max(7f*density,Math.min(10f*density,b.width()/11f)));
        paint.setFakeBoldText(brick.interactive);
        canvas.drawText(trim(brick.label,18),b.left+6f*density,b.top+14f*density,paint);
        paint.setFakeBoldText(false);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (event.getActionMasked()!=MotionEvent.ACTION_UP) return true;
        float x=event.getX(), y=event.getY();
        if(rawButton.contains(x,y)){
            if(listener!=null) listener.onRawMode();
            performClick();
            return true;
        }
        for(int i=bricks.size()-1;i>=0;i--){
            Brick brick=bricks.get(i);
            if(brick.interactive && brick.bounds.contains(x,y)){
                if(listener!=null) listener.onBrickAction(brick.id,brick.affordance);
                performClick();
                return true;
            }
        }
        performClick();
        return true;
    }

    @Override
    public boolean performClick(){
        super.performClick();
        return true;
    }

    private static int defaultBrickColor(String kind, boolean interactive) {
        if ("mural".equals(kind)) return Color.rgb(118,87,139);
        if ("sign".equals(kind)) return Color.rgb(92,68,108);
        if ("corridor".equals(kind)) return Color.rgb(48,37,61);
        return interactive ? Color.rgb(79,54,101) : Color.rgb(56,43,70);
    }

    private static int parseColor(String value, int fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        try { return Color.parseColor(value.trim()); }
        catch (Exception ignored) { return fallback; }
    }

    private static int withAlpha(int color, int alpha) {
        return Color.argb(Math.max(0,Math.min(255,alpha)),Color.red(color),Color.green(color),Color.blue(color));
    }

    private static String trim(String value,int max){
        if(value==null) return "";
        String clean=value.replace("\n"," ").trim();
        return clean.length()<=max?clean:clean.substring(0,Math.max(1,max-1))+"…";
    }
}
