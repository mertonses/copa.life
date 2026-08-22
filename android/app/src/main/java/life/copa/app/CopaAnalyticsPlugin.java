package life.copa.app;

import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.analytics.FirebaseAnalytics;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

@CapacitorPlugin(name = "CopaAnalyticsNative")
public class CopaAnalyticsPlugin extends Plugin {
    private static final Set<String> EVENTS = new HashSet<>(Arrays.asList(
        "session_started", "country_selected", "formation_selected", "chairman_selected",
        "style_selected", "draft_started", "xi_completed", "match_completed",
        "round_completed", "reward_selected", "card_acquired", "run_finished",
        "ghost_encountered", "ghost_opt_in", "meta_unlocked", "profile_open_error",
        "final_sim_completed", "group_draw_started", "group_draw_completed",
        "group_draw_skipped", "tournament_match_resolved", "sidefield_opened",
        "sidefield_view_changed", "sidefield_selection_viewed", "sidefield_pick_placed",
        "sidefield_settled", "card_effect_summary_viewed", "arena_match_completed"
    ));
    private static final Set<String> PARAMETERS = new HashSet<>(Arrays.asList(
        "platform", "locale", "game_country", "round", "outcome", "detail", "app_version",
        "model_version", "power_gap", "end_type", "tactic", "chairman", "formation",
        "style", "reward", "card_kind", "economy_band", "tournament_stage", "draw_mode",
        "qualification", "group_matchday", "sidefield_pick", "confidence", "stake_band"
    ));

    private FirebaseAnalytics analytics() {
        return FirebaseAnalytics.getInstance(getContext());
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        analytics().setAnalyticsCollectionEnabled(enabled);
        call.resolve(new JSObject().put("enabled", enabled));
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        String event = call.getString("event", "").trim();
        if (!EVENTS.contains(event)) {
            call.reject("Unsupported analytics event");
            return;
        }
        JSObject input = call.getObject("parameters", new JSObject());
        Bundle parameters = new Bundle();
        Iterator<String> keys = input.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            if (!PARAMETERS.contains(key)) continue;
            Object value = input.opt(key);
            if (value instanceof Number) parameters.putLong(key, ((Number) value).longValue());
            else if (value instanceof Boolean) parameters.putLong(key, ((Boolean) value) ? 1L : 0L);
            else if (value != null) parameters.putString(key, clean(value));
        }
        analytics().logEvent(event, parameters);
        call.resolve();
    }

    private String clean(Object value) {
        String sanitized = String.valueOf(value).replaceAll("[^a-zA-Z0-9._/-]", "");
        return sanitized.substring(0, Math.min(64, sanitized.length()));
    }
}
