package life.copa.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String RELEASE_PREFS = "copa_native_release";
    private static final String VERSION_CODE_KEY = "version_code";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        long currentVersion = readVersionCode();
        SharedPreferences preferences = getSharedPreferences(RELEASE_PREFS, Context.MODE_PRIVATE);
        long previousVersion = preferences.getLong(VERSION_CODE_KEY, -1L);

        super.onCreate(savedInstanceState);

        if (currentVersion >= 0L && previousVersion >= 0L && previousVersion != currentVersion && getBridge() != null) {
            getBridge().getWebView().clearCache(true);
            getBridge().getWebView().reload();
        }
        if (currentVersion >= 0L) preferences.edit().putLong(VERSION_CODE_KEY, currentVersion).apply();
    }

    private long readVersionCode() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception ignored) {
            return -1L;
        }
    }
}
