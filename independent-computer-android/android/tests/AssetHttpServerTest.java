package org.independentcomputer.local;
import java.io.*;import java.net.*;import java.nio.charset.StandardCharsets;import java.util.*;
public final class AssetHttpServerTest {
 static int checks;
 static void check(boolean condition,String message){if(!condition)throw new AssertionError(message);checks++;}
 static byte[] read(InputStream in)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toByteArray();}
 static String raw(int port,String request)throws IOException{try(Socket s=new Socket("127.0.0.1",port)){s.getOutputStream().write(request.getBytes(StandardCharsets.US_ASCII));return new String(read(s.getInputStream()),StandardCharsets.ISO_8859_1);}}
 public static void main(String[] args)throws Exception{
  final byte[] binary=new byte[262144];for(int i=0;i<binary.length;i++)binary[i]=(byte)(i%251);
  final Map<String,byte[]> files=new HashMap<>();files.put("foundation.html","<h1>Actual local computer</h1>".getBytes(StandardCharsets.UTF_8));files.put("model.bin",binary);files.put("worker.mjs","export const value=42;".getBytes(StandardCharsets.UTF_8));files.put("model.wasm",new byte[]{0,97,115,109});
  try(AssetHttpServer server=new AssetHttpServer(0,new AssetHttpServer.Source(){public InputStream open(String p)throws IOException{if(!files.containsKey(p))throw new IOException();return new ByteArrayInputStream(files.get(p));}public long size(String p)throws IOException{if(!files.containsKey(p))throw new IOException();return files.get(p).length;}})){
   server.start();String base="http://127.0.0.1:"+server.port();
   HttpURLConnection page=(HttpURLConnection)new URL(base+"/").openConnection();check(page.getResponseCode()==200,"Root failed");check(new String(read(page.getInputStream()),StandardCharsets.UTF_8).contains("Actual local computer"),"Root bytes changed");
   HttpURLConnection model=(HttpURLConnection)new URL(base+"/model.bin").openConnection();check(Arrays.equals(read(model.getInputStream()),binary),"Model bytes changed");check(model.getContentLengthLong()==binary.length,"Content length wrong");
   HttpURLConnection module=(HttpURLConnection)new URL(base+"/worker.mjs").openConnection();check(module.getContentType().startsWith("text/javascript"),"Module MIME wrong");module.disconnect();
   HttpURLConnection wasm=(HttpURLConnection)new URL(base+"/model.wasm").openConnection();check(wasm.getContentType().equals("application/wasm"),"WASM MIME wrong");wasm.disconnect();
   String host="Host: 127.0.0.1:"+server.port()+"\r\n\r\n";
   check(raw(server.port(),"GET /missing HTTP/1.1\r\n"+host).startsWith("HTTP/1.1 404"),"Missing file not rejected");
   check(raw(server.port(),"GET /%2e%2e/secret HTTP/1.1\r\n"+host).startsWith("HTTP/1.1 403"),"Traversal not rejected");
   check(raw(server.port(),"GET / HTTP/1.1\r\nHost: evil.example\r\n\r\n").startsWith("HTTP/1.1 403"),"Foreign host accepted");
   check(raw(server.port(),"GET / HTTP/1.1\r\nOrigin: https://evil.example\r\n"+host).startsWith("HTTP/1.1 403"),"Foreign origin accepted");
   check(raw(server.port(),"POST / HTTP/1.1\r\n"+host).startsWith("HTTP/1.1 405"),"Write allowed");
   String head=raw(server.port(),"HEAD /model.bin HTTP/1.1\r\n"+host);check(head.startsWith("HTTP/1.1 200")&&head.endsWith("\r\n\r\n"),"HEAD body wrong");
  }
  System.out.println("PASS "+checks+" actual Java HTTP server checks");
 }
}
