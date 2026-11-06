package org.synthai.computer;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import java.util.HashMap;
import java.util.Map;

/**
 * Native projection of Synthia 5.7's canonical deep-surface reference body.
 * Coordinates/colors/pose deltas are taken from
 * src/morph/browser/vendor/deep-surface-morph.js in the canonical 0.5.7 package.
 * The user mirror image replaces only the head texture; identity/body state stay
 * owned by the mounted Synthia runtime.
 */
final class Synthia57MirrorRenderer {
    private static final float CANON_W = 256f;
    private static final float CANON_H = 320f;

    private static final Map<String,float[]> BASE = new HashMap<>();
    private static final Map<String,float[]> REACH = new HashMap<>();
    static {
        BASE.put("head",p(128,42)); BASE.put("hair",p(128,22)); BASE.put("neck",p(128,62));
        BASE.put("shoulder_l",p(98,78)); BASE.put("shoulder_r",p(158,78));
        BASE.put("elbow_l",p(78,118)); BASE.put("elbow_r",p(178,118));
        BASE.put("wrist_l",p(68,158)); BASE.put("wrist_r",p(188,158));
        BASE.put("torso",p(128,118)); BASE.put("joint_core",p(128,108)); BASE.put("waist",p(128,158));
        BASE.put("hip_l",p(110,168)); BASE.put("hip_r",p(146,168));
        BASE.put("knee_l",p(108,218)); BASE.put("knee_r",p(148,218));
        BASE.put("ankle_l",p(106,268)); BASE.put("ankle_r",p(150,268));
        BASE.put("skirt_l",p(96,188)); BASE.put("skirt_r",p(160,188));

        REACH.put("shoulder_r",p(-6,4)); REACH.put("elbow_r",p(-52,-8)); REACH.put("wrist_r",p(-78,18));
        REACH.put("shoulder_l",p(4,-10)); REACH.put("elbow_l",p(-8,-48)); REACH.put("wrist_l",p(10,-88));
        REACH.put("hair",p(16,4)); REACH.put("head",p(4,2)); REACH.put("neck",p(2,2));
        REACH.put("torso",p(-4,2)); REACH.put("joint_core",p(-4,2)); REACH.put("waist",p(-6,2));
        REACH.put("hip_l",p(-10,4)); REACH.put("hip_r",p(-4,2));
        REACH.put("knee_l",p(-14,0)); REACH.put("knee_r",p(8,-6));
        REACH.put("ankle_l",p(-16,0)); REACH.put("ankle_r",p(14,-4));
        REACH.put("skirt_l",p(-22,8)); REACH.put("skirt_r",p(8,10));
    }

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

    private static float[] p(float x,float y){ return new float[]{x,y}; }

    private float[] point(String name,float phase,float ox,float oy,float scale,boolean flip){
        float[] b=BASE.get(name);
        float[] d=REACH.get(name);
        float x=b[0]+(d==null?0:d[0]*phase);
        float y=b[1]+(d==null?0:d[1]*phase);
        if(flip) x=CANON_W-x;
        return new float[]{ox+x*scale,oy+y*scale};
    }

    void draw(Canvas canvas,float centerX,float feetY,float height,boolean walking,boolean facingRight,Bitmap mirrorFace){
        float scale=height/CANON_H;
        float ox=centerX-(CANON_W*scale)/2f;
        float oy=feetY-CANON_H*scale;
        float phase=walking?(float)((Math.sin(System.nanoTime()/180_000_000.0)+1.0)*0.18):0f;
        boolean flip=!facingRight;

        float[] hipL=point("hip_l",phase,ox,oy,scale,flip), hipR=point("hip_r",phase,ox,oy,scale,flip);
        float[] kneeL=point("knee_l",phase,ox,oy,scale,flip), kneeR=point("knee_r",phase,ox,oy,scale,flip);
        float[] ankleL=point("ankle_l",phase,ox,oy,scale,flip), ankleR=point("ankle_r",phase,ox,oy,scale,flip);
        float[] waist=point("waist",phase,ox,oy,scale,flip), torso=point("torso",phase,ox,oy,scale,flip);
        float[] neck=point("neck",phase,ox,oy,scale,flip), head=point("head",phase,ox,oy,scale,flip), hair=point("hair",phase,ox,oy,scale,flip);
        float[] shL=point("shoulder_l",phase,ox,oy,scale,flip), shR=point("shoulder_r",phase,ox,oy,scale,flip);
        float[] elL=point("elbow_l",phase,ox,oy,scale,flip), elR=point("elbow_r",phase,ox,oy,scale,flip);
        float[] wrL=point("wrist_l",phase,ox,oy,scale,flip), wrR=point("wrist_r",phase,ox,oy,scale,flip);
        float[] skL=point("skirt_l",phase,ox,oy,scale,flip), skR=point("skirt_r",phase,ox,oy,scale,flip);
        float[] core=point("joint_core",phase,ox,oy,scale,flip);

        drawLimb(canvas,hipL,kneeL,16*scale,Color.rgb(80,95,130));
        drawLimb(canvas,kneeL,ankleL,14*scale,Color.rgb(80,95,130));
        drawLimb(canvas,hipR,kneeR,16*scale,Color.rgb(80,95,130));
        drawLimb(canvas,kneeR,ankleR,14*scale,Color.rgb(80,95,130));
        disk(canvas,ankleL,11*scale,Color.rgb(36,36,48)); disk(canvas,ankleR,11*scale,Color.rgb(36,36,48));

        drawLimb(canvas,shL,elL,14*scale,Color.rgb(90,150,200));
        drawLimb(canvas,elL,wrL,12*scale,Color.rgb(70,130,185));
        disk(canvas,wrL,8*scale,Color.rgb(232,196,164));

        paint.setColor(Color.rgb(160,70,120));
        Path skirt=new Path();
        skirt.moveTo(hipL[0],hipL[1]); skirt.lineTo(skL[0],skL[1]);
        skirt.lineTo((skL[0]+skR[0])/2f,Math.max(skL[1],skR[1])+18*scale);
        skirt.lineTo(skR[0],skR[1]); skirt.lineTo(hipR[0],hipR[1]); skirt.lineTo(waist[0],waist[1]); skirt.close();
        canvas.drawPath(skirt,paint);

        paint.setColor(Color.rgb(70,110,170));
        float hx=28*scale;
        Path body=new Path();
        body.moveTo(torso[0]-hx,neck[1]+8*scale); body.lineTo(torso[0]+hx,neck[1]+8*scale);
        body.lineTo(waist[0]+hx-4*scale,waist[1]); body.lineTo(waist[0]-hx+4*scale,waist[1]); body.close();
        canvas.drawPath(body,paint);
        paint.setColor(Color.rgb(240,230,210));
        canvas.drawRect(torso[0]-18*scale,torso[1]-10*scale,torso[0]+18*scale,torso[1]+6*scale,paint);
        disk(canvas,core,7*scale,Color.rgb(220,190,70)); disk(canvas,waist,6*scale,Color.rgb(220,190,70));

        drawLimb(canvas,neck,head,12*scale,Color.rgb(210,170,140));
        disk(canvas,hair,18*scale,Color.rgb(48,28,78));
        disk(canvas,head,20*scale,Color.rgb(232,196,164));
        if(mirrorFace!=null) drawMirrorFace(canvas,head,19*scale,mirrorFace);
        else {
            disk(canvas,new float[]{head[0]-7*scale,head[1]-2*scale},3*scale,Color.rgb(30,30,40));
            disk(canvas,new float[]{head[0]+7*scale,head[1]-2*scale},3*scale,Color.rgb(30,30,40));
        }

        disk(canvas,shL,8*scale,Color.rgb(220,190,70)); disk(canvas,shR,8*scale,Color.rgb(220,190,70));
        drawLimb(canvas,shR,elR,14*scale,Color.rgb(90,150,200));
        drawLimb(canvas,elR,wrR,12*scale,Color.rgb(70,130,185));
        disk(canvas,wrR,8*scale,Color.rgb(232,196,164));
        disk(canvas,elR,6*scale,Color.rgb(220,190,70));
    }

    private void drawMirrorFace(Canvas canvas,float[] center,float radius,Bitmap face){
        int side=Math.min(face.getWidth(),face.getHeight());
        int left=(face.getWidth()-side)/2;
        int top=Math.max(0,(face.getHeight()-side)/3);
        top=Math.min(top,face.getHeight()-side);
        Rect src=new Rect(left,top,left+side,top+side);
        RectF dst=new RectF(center[0]-radius,center[1]-radius,center[0]+radius,center[1]+radius);
        int save=canvas.save();
        Path clip=new Path(); clip.addCircle(center[0],center[1],radius,Path.Direction.CW);
        canvas.clipPath(clip);
        canvas.drawBitmap(face,src,dst,paint);
        canvas.restoreToCount(save);
    }

    private void drawLimb(Canvas canvas,float[] a,float[] b,float width,int color){
        paint.setColor(color); paint.setStrokeWidth(Math.max(1f,width)); paint.setStrokeCap(Paint.Cap.ROUND);
        canvas.drawLine(a[0],a[1],b[0],b[1],paint);
    }

    private void disk(Canvas canvas,float[] p,float radius,int color){
        paint.setColor(color); canvas.drawCircle(p[0],p[1],Math.max(1f,radius),paint);
    }
}
