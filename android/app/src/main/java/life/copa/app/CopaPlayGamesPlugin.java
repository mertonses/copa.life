package life.copa.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.AchievementsClient;

@CapacitorPlugin(name = "CopaPlayGames")
public class CopaPlayGamesPlugin extends Plugin {
    private static final int ACHIEVEMENTS_REQUEST = 7101;

    private GamesSignInClient signInClient() {
        return PlayGames.getGamesSignInClient(getActivity());
    }

    private AchievementsClient achievementsClient() {
        return PlayGames.getAchievementsClient(getActivity());
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        signInClient().signIn().addOnSuccessListener(result -> {
            JSObject response = new JSObject();
            response.put("isAuthenticated", result.isAuthenticated());
            call.resolve(response);
        }).addOnFailureListener(error -> call.reject("Play Games sign-in failed", error));
    }

    @PluginMethod
    public void isAuthenticated(PluginCall call) {
        signInClient().isAuthenticated().addOnSuccessListener(result -> {
            JSObject response = new JSObject();
            response.put("isAuthenticated", result.isAuthenticated());
            call.resolve(response);
        }).addOnFailureListener(error -> call.resolve(new JSObject().put("isAuthenticated", false)));
    }

    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        String achievementId = call.getString("achievementId", "");
        if (achievementId.isEmpty()) { call.reject("achievementId is required"); return; }
        achievementsClient().unlock(achievementId);
        call.resolve();
    }

    @PluginMethod
    public void incrementAchievement(PluginCall call) {
        String achievementId = call.getString("achievementId", "");
        int steps = Math.max(1, call.getInt("steps", 1));
        if (achievementId.isEmpty()) { call.reject("achievementId is required"); return; }
        achievementsClient().increment(achievementId, steps);
        call.resolve();
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        achievementsClient().getAchievementsIntent().addOnSuccessListener(intent -> {
            getActivity().startActivityForResult(intent, ACHIEVEMENTS_REQUEST);
            call.resolve();
        }).addOnFailureListener(error -> call.reject("Could not open achievements", error));
    }
}
