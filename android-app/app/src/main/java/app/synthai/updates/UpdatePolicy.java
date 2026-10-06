package app.synthai.updates;

import java.util.Arrays;

public final class UpdatePolicy {
    private UpdatePolicy() {}
    public static boolean accepts(String installedPackage, long installedVersion, String updatePackage,
                                  long updateVersion, String[] installedKeys, String[] updateKeys) {
        if (installedPackage == null || !installedPackage.equals(updatePackage) || updateVersion <= installedVersion
                || installedKeys == null || updateKeys == null || installedKeys.length == 0
                || installedKeys.length != updateKeys.length) return false;
        String[] a = installedKeys.clone(), b = updateKeys.clone();
        for (String key : a) if (key == null || key.isEmpty()) return false;
        for (String key : b) if (key == null || key.isEmpty()) return false;
        Arrays.sort(a); Arrays.sort(b);
        return Arrays.equals(a, b);
    }
}
