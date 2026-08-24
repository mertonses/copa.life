package life.copa.app;

import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.lifecycle.Lifecycle;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class ScrollInteractionTest {
    private WebView webView;

    private String evaluate(String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>("null");
        webView.post(() -> webView.evaluateJavascript(script, value -> {
            result.set(value);
            latch.countDown();
        }));
        assertTrue("JavaScript evaluation timed out", latch.await(20, TimeUnit.SECONDS));
        return result.get();
    }

    private void waitFor(String expression) throws Exception {
        long deadline = System.currentTimeMillis() + 30_000L;
        while (System.currentTimeMillis() < deadline) {
            if ("true".equals(evaluate("Boolean(" + expression + ")"))) return;
            Thread.sleep(120L);
        }
        throw new AssertionError("Timed out waiting for: " + expression);
    }

    private int number(String expression) throws Exception {
        return (int) Math.round(Double.parseDouble(evaluate("Number(" + expression + ")")));
    }

    private void swipe(float startYFraction, float endYFraction) throws Exception {
        CountDownLatch boundsReady = new CountDownLatch(1);
        AtomicReference<int[]> bounds = new AtomicReference<>();
        webView.post(() -> {
            int[] location = new int[2];
            webView.getLocationOnScreen(location);
            bounds.set(new int[] { location[0], location[1], webView.getWidth(), webView.getHeight() });
            boundsReady.countDown();
        });
        assertTrue("WebView bounds timed out", boundsReady.await(20, TimeUnit.SECONDS));

        int[] box = bounds.get();
        // Swipe through the document gutter instead of an interactive player,
        // pitch or card. Real users can start a page scroll beside controls;
        // this also keeps the gesture independent from each control's tap logic.
        float x = box[0] + (box[2] * 0.88f);
        float startY = box[1] + (box[3] * startYFraction);
        float endY = box[1] + (box[3] * endYFraction);
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        long downTime = SystemClock.uptimeMillis();

        MotionEvent down = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, x, startY, 0);
        assertTrue("Failed to inject swipe start", instrumentation.getUiAutomation().injectInputEvent(down, true));
        down.recycle();

        for (int step = 1; step <= 12; step++) {
            long eventTime = SystemClock.uptimeMillis();
            float progress = step / 12f;
            float y = startY + ((endY - startY) * progress);
            MotionEvent move = MotionEvent.obtain(downTime, eventTime, MotionEvent.ACTION_MOVE, x, y, 0);
            assertTrue("Failed to inject swipe movement", instrumentation.getUiAutomation().injectInputEvent(move, true));
            move.recycle();
            SystemClock.sleep(16L);
        }

        long upTime = SystemClock.uptimeMillis();
        MotionEvent up = MotionEvent.obtain(downTime, upTime, MotionEvent.ACTION_UP, x, endY, 0);
        assertTrue("Failed to inject swipe end", instrumentation.getUiAutomation().injectInputEvent(up, true));
        up.recycle();
        SystemClock.sleep(450L);
    }

    private void swipeUpThroughContent() throws Exception {
        swipe(0.72f, 0.28f);
    }

    private void swipeDownThroughContent() throws Exception {
        swipe(0.28f, 0.72f);
    }

    private void assertRouteScrollsWhenNeeded(String route) throws Exception {
        evaluate("CopaMobileShell.activateRoute('" + route + "');scrollTo(0,0)");
        waitFor("document.getElementById('hub').dataset.mobileRoute === '" + route + "'");
        SystemClock.sleep("sidefield".equals(route) ? 700L : 250L);
        int viewportHeight = number("innerHeight");
        int contentHeight = number("document.documentElement.scrollHeight");
        assertTrue(route + " route has invalid document height", contentHeight >= viewportHeight);
        if (contentHeight <= viewportHeight + 40) return;
        int start = number("scrollY");
        swipeUpThroughContent();
        int down = number("scrollY");
        assertTrue(route + " route did not scroll down", down > start + 8);
        swipeDownThroughContent();
        assertTrue(route + " route did not scroll back up", number("scrollY") < down - 8);
    }

    private void dismissPlayGamesPromptIfPresent() {
        UiDevice device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
        UiObject2 cancel = device.wait(Until.findObject(By.text(Pattern.compile("(?i)(İptal|Iptal|Cancel)"))), 4_000L);
        if (cancel != null) {
            cancel.click();
            device.waitForIdle(2_000L);
        }
    }

    @Test
    public void draftAndHubRemainBidirectionallyScrollable() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> webView = activity.getBridge().getWebView());
            waitFor("typeof quickStart === 'function' && window.CopaMobileShell && window.CopaMobileExperience");

            evaluate("localStorage.clear();setLang('tr');CopaMobileShell.newRun();pickCountry('TR');beginDraft();");
            waitFor("!document.getElementById('draft').classList.contains('hidden')");
            dismissPlayGamesPromptIfPresent();
            assertTrue("setup lock survived draft entry", "false".equals(evaluate("document.body.classList.contains('mobile-game-setup-open')")));
            assertTrue("draft body remained locked", !"hidden".equals(evaluate("getComputedStyle(document.body).overflow")));
            int draftViewportHeight = number("innerHeight");
            int draftContentHeight = number("document.documentElement.scrollHeight");
            assertTrue("draft has invalid document height", draftContentHeight >= draftViewportHeight);
            if (draftContentHeight > draftViewportHeight + 40) {
                evaluate("scrollTo(0,0)");
                int draftStart = number("scrollY");
                swipeUpThroughContent();
                int draftDown = number("scrollY");
                assertTrue("draft did not scroll down", draftDown > draftStart + 8);
                swipeDownThroughContent();
                assertTrue("draft did not scroll back up", number("scrollY") < draftDown - 8);
            }

            evaluate("quickAll()");
            waitFor("document.getElementById('postClubName')");
            evaluate("document.getElementById('postClubName').value='Native Scroll Test';pcGo();fastTournamentDraw();finishTournamentDraw();setCaptain(0);closeModal();CopaClubFiles.select('debt');scrollTo(0,0)");
            waitFor("!document.getElementById('hub').classList.contains('hidden')");
            assertTrue("pitch still blocks vertical gestures", evaluate("getComputedStyle(document.querySelector('#hubPitch .roundel')).touchAction").contains("pan-y"));
            int hubViewportHeight = number("innerHeight");
            int hubContentHeight = number("document.documentElement.scrollHeight");
            assertTrue("hub has invalid document height", hubContentHeight >= hubViewportHeight);
            if (hubContentHeight > hubViewportHeight + 40) {
                int hubStart = number("scrollY");
                swipeUpThroughContent();
                int hubDown = number("scrollY");
                assertTrue("hub did not scroll down through the pitch", hubDown > hubStart + 8);
                swipeDownThroughContent();
                assertTrue("hub did not scroll back up", number("scrollY") < hubDown - 8);
            }

            for (String route : new String[] { "match", "market", "training", "sidefield", "career" }) {
                assertRouteScrollsWhenNeeded(route);
            }
        }
    }

    @Test
    public void durableStorageAndScrollSurviveActivityRecreation() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> webView = activity.getBridge().getWebView());
            waitFor("window.CopaPlatform && CopaPlatform.ready");
            evaluate("CopaPlatform.storage.setItem('copa_native_recreation_probe',JSON.stringify({savedAt:Date.now(),value:'alive'}))");
            waitFor("localStorage.getItem('copa_native_recreation_probe') !== null");
            evaluate("CopaPlatform.storage.flush()");
            SystemClock.sleep(500L);

            scenario.moveToState(Lifecycle.State.CREATED);
            scenario.moveToState(Lifecycle.State.RESUMED);
            scenario.recreate();
            scenario.onActivity(activity -> webView = activity.getBridge().getWebView());

            waitFor("window.CopaPlatform && CopaPlatform.ready");
            waitFor("JSON.parse(localStorage.getItem('copa_native_recreation_probe')||'null')?.value === 'alive'");
            assertTrue("activity recreation left the document locked", !"hidden".equals(evaluate("getComputedStyle(document.body).overflow")));
            evaluate("CopaPlatform.storage.removeItem('copa_native_recreation_probe')");
        }
    }
}
