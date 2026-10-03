/* Browser-global bridge derived from the preserved SpriteRuntime.mjs.
 * Exact donor is kept in ../original-modules/SpriteRuntime.mjs.
 */
(function(root){
  'use strict';

  async function loadBitmap(file){
    if (typeof createImageBitmap === 'function') return createImageBitmap(file);
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=(e)=>{URL.revokeObjectURL(url);reject(e)};
      img.src=url;
    });
  }

  function inferGrid(width,height,preferredFrameCount=0){
    if(preferredFrameCount>0 && width%preferredFrameCount===0){
      return {cols:preferredFrameCount,rows:1,frameWidth:width/preferredFrameCount,frameHeight:height};
    }
    const candidates=[];
    for(let cols=1;cols<=16;cols++) for(let rows=1;rows<=16;rows++){
      if(width%cols || height%rows) continue;
      const fw=width/cols, fh=height/rows;
      const ratio=Math.max(fw/fh,fh/fw);
      const count=cols*rows;
      if(ratio<=2.5 && count<=128) candidates.push({cols,rows,frameWidth:fw,frameHeight:fh,score:Math.abs(1-ratio)+(count===1?3:0)});
    }
    candidates.sort((a,b)=>a.score-b.score || b.cols*b.rows-a.cols*a.rows);
    return candidates[0] || {cols:1,rows:1,frameWidth:width,frameHeight:height};
  }

  function sliceSheet(bitmap,grid){
    const frames=[];
    for(let r=0;r<grid.rows;r++) for(let c=0;c<grid.cols;c++){
      frames.push({sx:c*grid.frameWidth,sy:r*grid.frameHeight,sw:grid.frameWidth,sh:grid.frameHeight});
    }
    return frames;
  }

  function drawInterpolated(ctx,bitmap,a,b,t,x=0,y=0,opts={}){
    const w=opts.width||a.sw,h=opts.height||a.sh;
    const bob=(opts.walk||0)*Math.sin((opts.phase??t)*Math.PI*2)*h*0.025;
    const sway=(opts.walk||0)*Math.sin((opts.phase??t)*Math.PI*2)*0.035;
    const squash=(opts.express||0)*Math.sin(t*Math.PI)*0.035;
    const flip=opts.flipX===-1?-1:1;
    ctx.save();
    ctx.translate(x+w/2,y+h/2+bob);
    ctx.scale(flip,1);
    ctx.rotate(sway*flip);
    ctx.scale(1+squash,1-squash);
    ctx.globalAlpha=1-t;
    ctx.drawImage(bitmap,a.sx,a.sy,a.sw,a.sh,-w/2,-h/2,w,h);
    ctx.globalAlpha=t;
    ctx.drawImage(bitmap,b.sx,b.sy,b.sw,b.sh,-w/2,-h/2,w,h);
    ctx.globalAlpha=1;
    if(opts.talk){
      const open=(0.15+0.85*Math.abs(Math.sin((opts.time||0)*14)))*opts.talk;
      ctx.beginPath();
      ctx.ellipse(0,h*0.18,w*0.055,h*(0.008+0.025*open),0,0,Math.PI*2);
      ctx.fillStyle='rgba(20,10,14,.72)';ctx.fill();
    }
    ctx.restore();
  }

  root.SynthiaSpriteRuntime={loadBitmap,inferGrid,sliceSheet,drawInterpolated};
})(typeof window!=='undefined'?window:globalThis);
