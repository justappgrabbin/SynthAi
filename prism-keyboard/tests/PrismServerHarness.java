package app.prismkeys;
import java.io.File;
public class PrismServerHarness {
 public static void main(String[] args)throws Exception{
  File folder=new File(args[0]);org.json.JSONObject settings=args.length>3?new org.json.JSONObject(PrismServer.read(new File(args[3]))):new org.json.JSONObject();PrismServer server=new PrismServer(folder,(name,fallback)->settings.optString(name,fallback),filename->new java.io.FileInputStream(new File(args[1],filename)),args.length>2?Integer.parseInt(args[2]):18770);
  Runtime.getRuntime().addShutdownHook(new Thread(()->{try{server.close();}catch(Exception ignored){}}));
  System.out.println("Embedded server ready");new java.util.concurrent.CountDownLatch(1).await();
 }
}
