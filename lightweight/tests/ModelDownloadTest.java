package com.synthia.autonomy;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;

public final class ModelDownloadTest {
 static final byte[] DATA="The original model bytes for downloader regression.".getBytes(java.nio.charset.StandardCharsets.UTF_8);
 static final URL URL_VALUE;
 static { try { URL_VALUE=new URL("https://example.invalid/model"); }catch(Exception e){throw new RuntimeException(e);} }
 static class Reply extends HttpURLConnection {
  final byte[] data; final int code; final String range;
  Reply(byte[] data,int code,String range){super(URL_VALUE);this.data=data;this.code=code;this.range=range;}
  public void connect(){} public void disconnect(){} public boolean usingProxy(){return false;}
  public int getResponseCode(){return code;}
  public String getHeaderField(String name){return "Content-Range".equals(name)?range:null;}
  public long getContentLengthLong(){return data.length;}
  public InputStream getInputStream(){return new ByteArrayInputStream(data);}
 }
 static void ok(boolean value,String label){if(!value)throw new AssertionError(label);System.out.println("PASS "+label);}
 static String hash(File f)throws Exception{return ModelDownload.digest(f,()->{});}
 static File fetch(File f,String hash,ModelDownload.Open open)throws Exception{return ModelDownload.fetch(f,URL_VALUE,DATA.length,hash,s->{},()->{},open);}
 static void fails(File f,String hash,ModelDownload.Open open)throws Exception{try{fetch(f,hash,open);throw new AssertionError("expected failure");}catch(IOException expected){}}
 public static void main(String[] args)throws Exception{
  File root=Files.createTempDirectory("adaptive-model-test").toFile(),reference=new File(root,"reference");Files.write(reference.toPath(),DATA);String digest=hash(reference);
  File file=new File(root,"model"),part=new File(root,"model.download");
  fetch(file,digest,u->new Reply(DATA,200,null));ok(Arrays.equals(Files.readAllBytes(file.toPath()),DATA),"complete model verifies and commits");
  fetch(file,digest,u->{throw new AssertionError("cache caused download");});ok(!part.exists(),"verified model reused offline");file.delete();
  Files.write(part.toPath(),Arrays.copyOf(DATA,12));
  fetch(file,digest,u->new Reply(Arrays.copyOfRange(DATA,12,DATA.length),206,"bytes 12-"+(DATA.length-1)+"/"+DATA.length){public int getResponseCode(){ok("bytes=12-".equals(getRequestProperty("Range")),"resume requests saved offset");return 206;}});
  ok(hash(file).equals(digest),"resumed model verifies");file.delete();
  Files.write(part.toPath(),Arrays.copyOf(DATA,12));fetch(file,digest,u->new Reply(DATA,200,null));ok(hash(file).equals(digest),"server ignoring range safely restarts");file.delete();
  fails(file,digest,u->new Reply(Arrays.copyOf(DATA,12),200,null));ok(part.length()==12&&!file.exists(),"truncated download remains resumable and cannot run");part.delete();
  byte[] corrupt=DATA.clone();corrupt[0]^=1;fails(file,digest,u->new Reply(corrupt,200,null));ok(!file.exists()&&!part.exists(),"checksum mismatch rejects and clears corrupt model");
  fails(file,digest,u->new Reply(new byte[DATA.length+1],200,null));ok(!file.exists(),"oversized response rejected");
  Files.write(part.toPath(),Arrays.copyOf(DATA,12));fails(file,digest,u->new Reply(Arrays.copyOfRange(DATA,12,DATA.length),206,"bytes 0-1/2"));ok(part.length()==12,"wrong resume response leaves saved bytes intact");part.delete();
  fails(file,digest,u->new Reply(new byte[0],403,null));ok(!file.exists(),"HTTP failure cannot install model");
  Files.write(part.toPath(),DATA);fetch(file,digest,u->{throw new AssertionError("finished partial downloaded");});ok(hash(file).equals(digest),"finished verified partial recovers without network");file.delete();
  Files.write(file.toPath(),corrupt);fetch(file,digest,u->new Reply(DATA,200,null));ok(hash(file).equals(digest),"corrupt final cache replaced only by verified bytes");file.delete();
  final int[] checks={0};try{ModelDownload.fetch(file,URL_VALUE,DATA.length,digest,s->{},()->{if(++checks[0]>=3)throw new IOException("stopped");},u->new Reply(DATA,200,null));throw new AssertionError("stop ignored");}catch(IOException expected){}ok(!file.exists(),"cancellation prevents installation");
  System.out.println("Downloader checks passed");
 }
}
