package life.copa.app;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

@CapacitorPlugin(name = "CopaReview")
public class CopaReviewPlugin extends Plugin {
    @PluginMethod
    public void requestReview(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(result(false, "activity_unavailable"));
            return;
        }
        ReviewManager manager = ReviewManagerFactory.create(activity);
        manager.requestReviewFlow().addOnCompleteListener(request -> {
            if (!request.isSuccessful()) {
                call.resolve(result(false, "request_unavailable"));
                return;
            }
            ReviewInfo info = request.getResult();
            manager.launchReviewFlow(activity, info).addOnCompleteListener(flow ->
                call.resolve(result(true, "completed"))
            );
        });
    }

    private JSObject result(boolean requested, String state) {
        JSObject result = new JSObject();
        result.put("requested", requested);
        result.put("state", state);
        return result;
    }
}
