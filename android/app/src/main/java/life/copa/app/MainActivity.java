package life.copa.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.ActionBar;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private WebView copaWebView;
    private int safeAreaTop;
    private int safeAreaRight;
    private int safeAreaBottom;
    private int safeAreaLeft;

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

        // The game renders its own complete header inside the WebView. Theme
        // qualifiers must never leave a native AppCompat title bar above it;
        // keep this runtime guard for OEM and future dependency regressions.
        ActionBar supportActionBar = getSupportActionBar();
        if (supportActionBar != null) {
            supportActionBar.hide();
        }
        android.app.ActionBar platformActionBar = getActionBar();
        if (platformActionBar != null) {
            platformActionBar.hide();
        }
        int actionBarContainerId = getResources().getIdentifier("action_bar_container", "id", "android");
        if (actionBarContainerId != 0) {
            View actionBarContainer = findViewById(actionBarContainerId);
            if (actionBarContainer != null) {
                actionBarContainer.setVisibility(View.GONE);
            }
        }

        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightNavigationBars(false);

        copaWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (copaWebView != null) {
            // Android 12+'s stretch overscroll can make a WebView look as if
            // it is vibrating near the page edges. The web content remains
            // normally scrollable; only the native edge effect is disabled.
            copaWebView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            copaWebView.setVerticalScrollBarEnabled(false);
            copaWebView.setHorizontalScrollBarEnabled(false);
            copaWebView.setNestedScrollingEnabled(true);
            configureSafeAreaInsets();
        }

        // Capacitor serves versioned files from the installed APK. Do not clear
        // and reload the WebView during an app upgrade: that creates a second
        // startup while native plugins and the splash screen are initializing.
    }

    private void configureSafeAreaInsets() {
        View decorView = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            int insetTypes = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets visibleInsets = windowInsets.getInsets(insetTypes);
            Insets stableInsets = windowInsets.getInsetsIgnoringVisibility(insetTypes);

            safeAreaTop = Math.max(visibleInsets.top, stableInsets.top);
            safeAreaRight = Math.max(visibleInsets.right, stableInsets.right);
            safeAreaBottom = Math.max(visibleInsets.bottom, stableInsets.bottom);
            safeAreaLeft = Math.max(visibleInsets.left, stableInsets.left);
            injectSafeAreaCss();
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(decorView);

        // The first inset event can arrive before WebView creates its document.
        // Re-apply after the initial page commit window without reloading it.
        copaWebView.post(this::injectSafeAreaCss);
        copaWebView.postDelayed(this::refreshSafeAreaInsets, 250);
        copaWebView.postDelayed(this::refreshSafeAreaInsets, 1000);
    }

    private void refreshSafeAreaInsets() {
        if (copaWebView == null) {
            return;
        }
        ViewCompat.requestApplyInsets(getWindow().getDecorView());
        injectSafeAreaCss();
    }

    private void injectSafeAreaCss() {
        if (copaWebView == null) {
            return;
        }
        float density = getResources().getDisplayMetrics().density;
        int top = Math.round(safeAreaTop / density);
        int right = Math.round(safeAreaRight / density);
        int bottom = Math.round(safeAreaBottom / density);
        int left = Math.round(safeAreaLeft / density);
        String script = String.format(
            Locale.US,
            "(() => { const root = document.documentElement; if (!root) return; " +
                "root.style.setProperty('--safe-area-inset-top','%dpx');" +
                "root.style.setProperty('--safe-area-inset-right','%dpx');" +
                "root.style.setProperty('--safe-area-inset-bottom','%dpx');" +
                "root.style.setProperty('--safe-area-inset-left','%dpx');" +
                "root.dataset.copaSafeArea='native'; })();",
            top,
            right,
            bottom,
            left
        );
        copaWebView.post(() -> copaWebView.evaluateJavascript(script, null));
    }

    @Override
    public void onResume() {
        super.onResume();
        if (copaWebView != null) {
            copaWebView.postDelayed(this::refreshSafeAreaInsets, 80);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && copaWebView != null) {
            copaWebView.postDelayed(this::refreshSafeAreaInsets, 80);
        }
    }
}
