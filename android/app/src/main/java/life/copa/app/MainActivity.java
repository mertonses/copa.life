package life.copa.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Apply system-bar behavior before BridgeActivity inflates the WebView.
        // This keeps first-frame insets stable across Samsung One UI and stock Android.
        EdgeToEdge.enable(this);
        registerPlugin(CopaAdsPlugin.class);
        registerPlugin(CopaPlayGamesPlugin.class);
        registerPlugin(CopaAnalyticsPlugin.class);
        registerPlugin(CopaReviewPlugin.class);
        super.onCreate(savedInstanceState);

        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightNavigationBars(false);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            // Android 12+'s stretch overscroll can make a WebView look as if
            // it is vibrating near the page edges. The web content remains
            // normally scrollable; only the native edge effect is disabled.
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setNestedScrollingEnabled(true);
        }

        // Capacitor serves versioned files from the installed APK. Do not clear
        // and reload the WebView during an app upgrade: that creates a second
        // startup while native plugins and the splash screen are initializing.
    }
}
