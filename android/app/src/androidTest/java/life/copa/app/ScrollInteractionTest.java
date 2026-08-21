package life.copa.app;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.GeneralLocation.CENTER;
import static androidx.test.espresso.action.GeneralLocation.TOP_CENTER;
import static androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.action.GeneralSwipeAction;
import androidx.test.espresso.action.Press;
import androidx.test.espresso.action.Swipe;
import androidx.test.ext.junit.runners.AndroidJUnit4;
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
        assertTrue("JavaScript evaluation timed out", latch.await(8, TimeUnit.SECONDS));
        return result.get();
    }

    private void waitFor(String expression) throws Exception {
        long deadline = System.currentTimeMillis() + 15_000L;
        while (System.currentTimeMillis() < deadline) {
            if ("true".equals(evaluate("Boolean(" + expression + ")"))) return;
            Thread.sleep(120L);
        }
        throw new AssertionError("Timed out waiting for: " + expression);
    }

    private int number(String expression) throws Exception {
        return (int) Math.round(Double.parseDouble(evaluate("Number(" + expression + ")")));
    }

    private void swipeUpThroughContent() {
        onView(isAssignableFrom(WebView.class)).perform(
            new GeneralSwipeAction(Swipe.SLOW, CENTER, TOP_CENTER, Press.FINGER)
        );
    }

    private void swipeDownThroughContent() {
        onView(isAssignableFrom(WebView.class)).perform(
            new GeneralSwipeAction(Swipe.SLOW, TOP_CENTER, CENTER, Press.FINGER)
        );
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
