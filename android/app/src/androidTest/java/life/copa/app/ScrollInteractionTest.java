package life.copa.app;

import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
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
        float x = box[0] + (box[2] * 0.5f);
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

    @Test
    public void draftAndHubRemainBidirectionallyScrollable() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> webView = activity.getBridge().getWebView());
            waitFor("typeof quickStart === 'function' && window.CopaMobileShell && window.CopaMobileExperience");

            evaluate("localStorage.clear();setLang('tr');CopaMobileShell.newRun();pickCountry('TR');beginDraft();");
            waitFor("!document.getElementById('draft').classList.contains('hidden')");
            assertTrue("setup lock survived draft entry", "false".equals(evaluate("document.body.classList.contains('mobile-game-setup-open')")));
            assertTrue("draft body remained locked", !"hidden".equals(evaluate("getComputedStyle(document.body).overflow")));
            evaluate("document.body.style.setProperty('min-height','2200px','important');scrollTo(0,0)");
            int draftStart = number("scrollY");
            swipeUpThroughContent();
            int draftDown = number("scrollY");
            assertTrue("draft did not scroll down", draftDown > draftStart + 8);
            swipeDownThroughContent();
            assertTrue("draft did not scroll back up", number("scrollY") < draftDown - 8);

            evaluate("quickAll()");
            waitFor("document.getElementById('postClubName')");
            evaluate("document.getElementById('postClubName').value='Native Scroll Test';pcGo();fastTournamentDraw();finishTournamentDraw();setCaptain(0);closeModal();CopaClubFiles.select('debt');document.body.style.setProperty('min-height','2400px','important');scrollTo(0,0)");
            waitFor("!document.getElementById('hub').classList.contains('hidden')");
            assertTrue("pitch still blocks vertical gestures", evaluate("getComputedStyle(document.querySelector('#hubPitch .roundel')).touchAction").contains("pan-y"));
            int hubStart = number("scrollY");
            swipeUpThroughContent();
            int hubDown = number("scrollY");
            assertTrue("hub did not scroll down through the pitch", hubDown > hubStart + 8);
            swipeDownThroughContent();
            assertTrue("hub did not scroll back up", number("scrollY") < hubDown - 8);
        }
    }
}
