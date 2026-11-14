package com.synthia.autonomy;

import android.content.Context;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.lang.reflect.*;

/** First-use model delivery; inference stays in the existing local engine. */
public final class ModelDownload {
    static final String MODEL="qwen2.5-coder-1.5b-q4_k_m.gguf";
    static final String HASH="cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046";
    static final long SIZE=1117320768L;
    static final String URL_TEXT="https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/f86cb2c1fa58255f8052cc32aeede1b7482d4361/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf?download=true";
    interface Progress { void report(String message) throws Exception; }
    interface Check { void run() throws Exception; }
    interface Open { HttpURLConnection open(URL url) throws IOException; }

    public static synchronized File ensure(final Context service) throws Exception {
        File root=new File(service.getFilesDir(),"embedded-model");
        if(!root.isDirectory() && !root.mkdirs()) throw new IOException("Cannot create model folder");
        File target=new File(root,MODEL);
        android.content.SharedPreferences prefs=service.getSharedPreferences("synthia-embedded-model",0);
        if(target.isFile() && target.length()==SIZE && HASH.equals(prefs.getString("verified-"+MODEL,""))) return target;
        final Method state=service.getClass().getDeclaredMethod("state",String.class,boolean.class,String.class);
        final Method check=service.getClass().getDeclaredMethod("check");
        state.setAccessible(true); check.setAccessible(true);
        Progress progress=message->invoke(state,service,message,false,null);
        Check cancel=()->invoke(check,service);
        File result=fetch(target,new URL(URL_TEXT+"&synthia_request="+System.currentTimeMillis()),SIZE,HASH,progress,cancel,url->{
            if(!"https".equals(url.getProtocol())) throw new IOException("Model download requires HTTPS");
            return (HttpURLConnection)url.openConnection();
        });
        prefs.edit().putString("verified-"+MODEL,HASH).commit();
        return result;
    }
    private static void invoke(Method method,Object target,Object... args) throws Exception {
        try { method.invoke(target,args); }
        catch(InvocationTargetException e) { Throwable cause=e.getCause(); if(cause instanceof Exception) throw (Exception)cause; throw e; }
    }
    static File fetch(File target,URL url,long size,String hash,Progress progress,Check cancel,Open open) throws Exception {
        cancel.run();
        File partial=new File(target.getPath()+".download");
        if(target.isFile() && target.length()==size) {
            progress.report("Verifying downloaded model…");
            if(hash.equals(digest(target,cancel))) return target;
        }
        long offset=partial.isFile()?partial.length():0;
        if(offset>size) { if(!partial.delete()) throw new IOException("Cannot reset oversized download"); offset=0; }
        if(offset==size) {
            progress.report("Verifying downloaded model…");
            if(hash.equals(digest(partial,cancel))) return commit(partial,target);
            if(!partial.delete()) throw new IOException("Cannot reset invalid download"); offset=0;
        }
        if(target.getParentFile().getUsableSpace()<size-offset+16L*1024*1024)
            throw new IOException("Not enough free storage for model; allow at least 1.2 GB");
        progress.report((offset>0?"Resuming":"Downloading")+" model · "+offset/1048576+" / "+size/1048576+" MB. Keep this app open; Stop pauses the download.");
        HttpURLConnection con=null;
        try {
            URL next=url;
            for(int redirects=0;;redirects++) {
                cancel.run();
                con=open.open(next);
                con.setInstanceFollowRedirects(false);con.setConnectTimeout(30000);con.setReadTimeout(60000);
                con.setRequestProperty("Accept-Encoding","identity");con.setRequestProperty("User-Agent","Synthia-Adaptive-Lite/0.5.4");
                if(offset>0) con.setRequestProperty("Range","bytes="+offset+"-");
                int code=con.getResponseCode();
                if(code>=300 && code<=399) {
                    String location=con.getHeaderField("Location");con.disconnect();con=null;
                    if(location==null || redirects>=5) throw new IOException("Model download redirect failed");
                    next=new URL(next,location);
                    if(!next.getProtocol().equals(url.getProtocol())) throw new IOException("Insecure model redirect");
                    continue;
                }
                if(code!=200 && code!=206) throw new IOException("Model download HTTP "+code+". Retry Start model to resume.");
                if(code==206) {
                    String range=con.getHeaderField("Content-Range");
                    if(range==null || !range.startsWith("bytes "+offset+"-") || !range.endsWith("/"+size)) throw new IOException("Invalid model resume response");
                } else { offset=0; }
                break;
            }
            long length=con.getContentLengthLong();
            if(length>size-offset) throw new IOException("Model response exceeds expected size");
            long done=offset,last=0;
            byte[] buffer=new byte[256*1024];
            try(InputStream in=con.getInputStream();FileOutputStream out=new FileOutputStream(partial,offset>0)) {
                int n;
                while((n=in.read(buffer))!=-1) {
                    cancel.run();
                    if(done+n>size) throw new IOException("Model download exceeds expected size");
                    out.write(buffer,0,n);done+=n;
                    long now=System.currentTimeMillis();
                    if(now-last>=1000) { progress.report("Downloading model · "+(100*done/size)+"% · "+done/1048576+" / "+size/1048576+" MB");last=now; }
                }
                out.getFD().sync();
            }
            if(done!=size) throw new IOException("Model download interrupted; tap Start model to resume");
        } finally { if(con!=null) con.disconnect(); }
        cancel.run();progress.report("Verifying model checksum…");
        if(!hash.equals(digest(partial,cancel))) {
            if(!partial.delete()) throw new IOException("Checksum failed; cannot clear invalid download");
            throw new IOException("Model checksum failed. Tap Start model to download again");
        }
        return commit(partial,target);
    }
    static String digest(File file,Check cancel) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream in=new FileInputStream(file)) { byte[] b=new byte[256*1024];int n;while((n=in.read(b))!=-1) { cancel.run();digest.update(b,0,n); } }
        StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return hex.toString();
    }
    private static File commit(File partial,File target) throws IOException {
        if(target.exists() && !target.delete()) throw new IOException("Cannot replace invalid model cache");
        if(!partial.renameTo(target)) throw new IOException("Cannot commit verified model");
        return target;
    }
}
