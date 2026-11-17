package org.independentcomputer.local;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** Read-only, loopback-only asset server. No remote proxy, writes, or model service. */
public final class AssetHttpServer implements Closeable {
 public interface Source {InputStream open(String path)throws IOException;long size(String path)throws IOException;}
 private final ServerSocket server;private final Source source;private final ExecutorService clients=Executors.newFixedThreadPool(4);
 private volatile boolean closed;
 public AssetHttpServer(int port,Source source)throws IOException{this.source=source;server=new ServerSocket();server.setReuseAddress(true);server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"),port));}
 public int port(){return server.getLocalPort();}
 public void start(){Thread acceptor=new Thread(()->{while(!closed){try{Socket socket=server.accept();clients.execute(()->serve(socket));}catch(IOException|RejectedExecutionException e){if(!closed)close();}}},"computer-assets");acceptor.setDaemon(true);acceptor.start();}
 private String line(InputStream in)throws IOException{ByteArrayOutputStream b=new ByteArrayOutputStream();for(int n=0;n<8192;n++){int c=in.read();if(c<0)return b.size()==0?null:new String(b.toByteArray(),StandardCharsets.US_ASCII);if(c=='\n')return new String(b.toByteArray(),StandardCharsets.US_ASCII).trim();b.write(c);}throw new IOException("Header line too long");}
 private void serve(Socket socket){try(Socket s=socket){s.setSoTimeout(15000);InputStream in=s.getInputStream();OutputStream out=s.getOutputStream();String request=line(in);if(request==null)return;String[] parts=request.split(" ");if(parts.length!=3){error(out,400,"Bad request");return;}
  String host=null,origin=null,header;int headers=0;while((header=line(in))!=null&&!header.isEmpty()){if(++headers>100)throw new IOException("Too many headers");int split=header.indexOf(':');if(split>0){String key=header.substring(0,split).trim().toLowerCase(Locale.ROOT),value=header.substring(split+1).trim();if(key.equals("host"))host=value;if(key.equals("origin"))origin=value;}}
  String authority="127.0.0.1:"+port(),alternate="localhost:"+port();if(!authority.equals(host)&&!alternate.equals(host)){error(out,403,"Invalid local host");return;}
  if(origin!=null&&!origin.equals("http://"+authority)&&!origin.equals("http://"+alternate)){error(out,403,"Foreign origin");return;}
  boolean head=parts[0].equals("HEAD");if(!head&&!parts[0].equals("GET")){error(out,405,"Read-only server");return;}
  String raw=parts[1].split("\\?",2)[0];if(!raw.startsWith("/")||raw.startsWith("//")){error(out,400,"Invalid path");return;}
  String path=URLDecoder.decode(raw.replace("+","%2B"),"UTF-8").substring(1);if(path.isEmpty())path="foundation.html";
  if(path.indexOf('\\')>=0||path.indexOf('\0')>=0){error(out,403,"Invalid path");return;}
  for(String segment:path.split("/",-1))if(segment.isEmpty()||segment.equals(".")||segment.equals("..")||segment.startsWith(".")){error(out,403,"Invalid path");return;}
  long length;try{length=source.size(path);}catch(IOException e){error(out,404,"Asset not found");return;}
  try(InputStream asset=source.open(path)){String response="HTTP/1.1 200 OK\r\nContent-Type: "+mime(path)+"\r\nContent-Length: "+length+"\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";out.write(response.getBytes(StandardCharsets.US_ASCII));if(!head){byte[] buffer=new byte[65536];int count;while((count=asset.read(buffer))!=-1)out.write(buffer,0,count);}out.flush();}
 }catch(IOException|IllegalArgumentException ignored){/* Disconnects and invalid client requests do not stop the service. */}}
 private static String mime(String p){if(p.endsWith(".html"))return "text/html; charset=utf-8";if(p.endsWith(".js")||p.endsWith(".mjs"))return "text/javascript; charset=utf-8";if(p.endsWith(".json"))return "application/json";if(p.endsWith(".wasm"))return "application/wasm";if(p.endsWith(".css"))return "text/css";if(p.endsWith(".svg"))return "image/svg+xml";if(p.endsWith(".png"))return "image/png";return "application/octet-stream";}
 private static void error(OutputStream out,int status,String text)throws IOException{byte[] body=text.getBytes(StandardCharsets.UTF_8);out.write(("HTTP/1.1 "+status+" Error\r\nContent-Type: text/plain\r\nContent-Length: "+body.length+"\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));out.write(body);out.flush();}
 public void close(){closed=true;try{server.close();}catch(IOException ignored){}clients.shutdownNow();}
}
