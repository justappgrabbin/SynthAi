package com.synthia.autonomy;
import org.json.*;
public final class UpdatePolicyTest {
 static final String SIGNER=new String(new char[64]).replace('\0','a'), HASH=new String(new char[64]).replace('\0','b');
 static JSONObject release()throws Exception{return new JSONObject().put("tag_name","synthia-adaptive-lite-v0.5.6-test").put("draft",false).put("assets",new JSONArray().put(new JSONObject().put("name",UpdatePolicy.ASSET).put("size",10000).put("digest","sha256:"+HASH).put("browser_download_url","https://github.com/justappgrabbin/SynthAi/releases/download/synthia-adaptive-lite-v0.5.6-test/"+UpdatePolicy.ASSET)).put(new JSONObject().put("name","update.json").put("size",1000).put("browser_download_url","https://github.com/justappgrabbin/SynthAi/releases/download/synthia-adaptive-lite-v0.5.6-test/update.json")));}
 static JSONObject manifest()throws Exception{return new JSONObject().put("package",UpdatePolicy.PACKAGE).put("channel","lite").put("releaseTag","synthia-adaptive-lite-v0.5.6-test").put("versionName","0.5.6-lite").put("versionCode",12).put("certificateSha256",SIGNER).put("sha256",HASH).put("bytes",10000);}
 static void reject(JSONObject r,JSONObject m,String label)throws Exception{try{UpdatePolicy.validate(r,m,11,SIGNER);throw new AssertionError(label);}catch(IllegalArgumentException expected){System.out.println("PASS "+label);}}
 public static void main(String[] args)throws Exception{
  if(UpdatePolicy.validate(release(),manifest(),11,SIGNER).getInt("versionCode")!=12)throw new AssertionError();System.out.println("PASS newer compatible Lite update accepted");
  reject(release(),manifest().put("versionCode",11),"same version ignored");reject(release(),manifest().put("versionCode",10),"downgrade ignored");
  reject(release(),manifest().put("package","app.lastfuck.local"),"other app rejected");reject(release(),manifest().put("channel","full"),"other channel rejected");
  reject(release(),manifest().put("certificateSha256",HASH),"incompatible signing key rejected");reject(release(),manifest().put("sha256","bad"),"missing checksum rejected");
  reject(release().put("draft",true),manifest(),"draft release ignored");reject(release().put("tag_name","majiki-preview-123"),manifest(),"unrelated repository releases ignored");
  JSONObject r=release();r.getJSONArray("assets").getJSONObject(0).put("browser_download_url","https://evil.invalid/update.apk");reject(r,manifest(),"external download rejected");
  r=release();r.getJSONArray("assets").getJSONObject(0).put("digest","sha256:"+SIGNER);reject(r,manifest(),"asset hash mismatch rejected");
  reject(release(),manifest().put("bytes",9999),"asset size mismatch rejected");reject(release().put("assets",new JSONArray()),manifest(),"missing APK rejected");
  if(UpdatePolicy.metadataUrl(release())==null)throw new AssertionError();
  r=release();r.getJSONArray("assets").getJSONObject(1).put("browser_download_url","http://evil.invalid/update.json");if(UpdatePolicy.metadataUrl(r)!=null)throw new AssertionError();System.out.println("PASS metadata restricted to exact GitHub channel");
 }
}
