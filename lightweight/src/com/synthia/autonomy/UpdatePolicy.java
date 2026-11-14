package com.synthia.autonomy;
import org.json.*;

/** Only compatible, newer Lite packages from the configured repository qualify. */
public final class UpdatePolicy {
    static final String REPO="justappgrabbin/SynthAi";
    static final String PACKAGE="com.synthia.adaptive.lite";
    static final String PREFIX="synthia-adaptive-lite-";
    static final String ASSET="Synthia-Adaptive-Lite.apk";
    static JSONObject validate(JSONObject release,JSONObject manifest,int current,String signer) throws Exception {
        String tag=release.getString("tag_name");
        if(release.optBoolean("draft") || !tag.startsWith(PREFIX) || !tag.matches("[A-Za-z0-9._-]+"))throw new IllegalArgumentException("Not a published Lite update");
        if(!PACKAGE.equals(manifest.getString("package")) || !"lite".equals(manifest.getString("channel")) || !tag.equals(manifest.getString("releaseTag")))throw new IllegalArgumentException("Wrong update channel");
        int code=manifest.getInt("versionCode");
        if(code<=current)throw new IllegalArgumentException("Already current or older");
        String cert=manifest.getString("certificateSha256"),hash=manifest.getString("sha256");
        if(!cert.matches("[a-f0-9]{64}") || !cert.equals(signer))throw new IllegalArgumentException("Different signing key");
        if(!hash.matches("[a-f0-9]{64}"))throw new IllegalArgumentException("Missing APK checksum");
        long size=manifest.getLong("bytes");if(size<1024 || size>300L*1024*1024)throw new IllegalArgumentException("Wrong APK size");
        JSONArray assets=release.getJSONArray("assets");
        for(int i=0;i<assets.length();i++) {
            JSONObject asset=assets.getJSONObject(i);
            if(!ASSET.equals(asset.optString("name")))continue;
            String expected="https://github.com/"+REPO+"/releases/download/"+tag+"/"+ASSET;
            if(!expected.equals(asset.getString("browser_download_url")) || asset.getLong("size")!=size)throw new IllegalArgumentException("Invalid APK asset");
            String digest=asset.optString("digest","");
            if(!digest.isEmpty()&&!digest.equals("sha256:"+hash))throw new IllegalArgumentException("APK digest mismatch");
            return new JSONObject().put("versionCode",code).put("versionName",manifest.getString("versionName"))
                .put("url",expected).put("sha256",hash).put("bytes",size).put("releaseTag",tag).put("certificateSha256",cert);
        }
        throw new IllegalArgumentException("Release APK missing");
    }
    static String metadataUrl(JSONObject release) throws Exception {
        String tag=release.getString("tag_name");
        if(release.optBoolean("draft")||!tag.startsWith(PREFIX)||!tag.matches("[A-Za-z0-9._-]+"))return null;
        String expected="https://github.com/"+REPO+"/releases/download/"+tag+"/update.json";
        JSONArray assets=release.getJSONArray("assets");
        for(int i=0;i<assets.length();i++) {
            JSONObject a=assets.getJSONObject(i);
            if("update.json".equals(a.optString("name"))&&expected.equals(a.optString("browser_download_url"))&&a.optLong("size")>0&&a.optLong("size")<=32768)return expected;
        }
        return null;
    }
}
