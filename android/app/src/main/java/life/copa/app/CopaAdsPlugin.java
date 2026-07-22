package life.copa.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.ads.mobile.sdk.MobileAds;
import com.google.android.libraries.ads.mobile.sdk.common.AdLoadCallback;
import com.google.android.libraries.ads.mobile.sdk.common.AdRequest;
import com.google.android.libraries.ads.mobile.sdk.common.AgeRestrictedTreatment;
import com.google.android.libraries.ads.mobile.sdk.common.FullScreenContentError;
import com.google.android.libraries.ads.mobile.sdk.common.LoadAdError;
import com.google.android.libraries.ads.mobile.sdk.common.RequestConfiguration;
import com.google.android.libraries.ads.mobile.sdk.initialization.InitializationConfig;
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAd;
import com.google.android.libraries.ads.mobile.sdk.interstitial.InterstitialAdEventCallback;
import com.google.android.libraries.ads.mobile.sdk.rewarded.OnUserEarnedRewardListener;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardItem;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAd;
import com.google.android.libraries.ads.mobile.sdk.rewarded.RewardedAdEventCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "CopaAds")
public class CopaAdsPlugin extends Plugin {
    private static final String PREFS = "copa_ads";
    private static final String LAST_SHOWN_RUN_KEY = "last_shown_run_key";
    private static final String LAST_SHOWN_AT_MS = "last_shown_at_ms";
    private static final String REWARDED_REROLL_RUN_KEY = "rewarded_reroll_run_key";
    private static final String REWARDED_REROLL_COUNT = "rewarded_reroll_count";
    private static final int MAX_REWARDED_REROLLS_PER_RUN = 2;
    private static final long RUN_END_AD_COOLDOWN_MS = 10 * 60 * 1000L;

    private ConsentInformation consentInformation;
    private InterstitialAd interstitialAd;
    private RewardedAd rewardedAd;
    private final AtomicBoolean initializationStarted = new AtomicBoolean(false);
    private final AtomicBoolean mobileAdsInitialized = new AtomicBoolean(false);
    private final AtomicBoolean adLoading = new AtomicBoolean(false);
    private final AtomicBoolean rewardedAdLoading = new AtomicBoolean(false);
    private final AtomicBoolean rewardedAdShowing = new AtomicBoolean(false);

    @Override
    public void load() {
        consentInformation = UserMessagingPlatform.getConsentInformation(getContext());
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(status("activity_unavailable"));
            return;
        }
        if (!initializationStarted.compareAndSet(false, true)) {
            call.resolve(status("already_started"));
            return;
        }
        activity.runOnUiThread(() -> requestConsent(activity, call));
    }

    private void requestConsent(Activity activity, PluginCall call) {
        ConsentRequestParameters parameters = new ConsentRequestParameters.Builder().build();
        consentInformation.requestConsentInfoUpdate(
            activity,
            parameters,
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                maybeInitializeAds();
                notifyPrivacyStatus();
                call.resolve(status(formError == null ? "ready" : "consent_form_error"));
            }),
            requestError -> {
                // A previous valid choice can still permit requests after a transient refresh error.
                maybeInitializeAds();
                notifyPrivacyStatus();
                call.resolve(status("consent_update_error"));
            }
        );
    }

    private void maybeInitializeAds() {
        if (consentInformation == null || !consentInformation.canRequestAds()) return;
        if (!mobileAdsInitialized.compareAndSet(false, true)) return;
        RequestConfiguration requestConfiguration = new RequestConfiguration.Builder()
            .setAgeRestrictedTreatment(AgeRestrictedTreatment.TEEN)
            .setMaxAdContentRating(RequestConfiguration.MaxAdContentRating.MAX_AD_CONTENT_RATING_T)
            .build();
        new Thread(() -> MobileAds.initialize(
            getContext(),
            new InitializationConfig.Builder(BuildConfig.COPA_ADMOB_APP_ID)
                .setRequestConfiguration(requestConfiguration)
                .build(),
            initializationStatus -> {
                Activity activity = getActivity();
                if (activity != null) activity.runOnUiThread(() -> {
                    loadInterstitial();
                    loadRewardedAd();
                });
            }
        )).start();
    }

    private void loadInterstitial() {
        if (!mobileAdsInitialized.get() || interstitialAd != null || !adLoading.compareAndSet(false, true)) return;
        InterstitialAd.load(
            new AdRequest.Builder(BuildConfig.COPA_ADMOB_INTERSTITIAL_ID).build(),
            new AdLoadCallback<InterstitialAd>() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    AdLoadCallback.super.onAdLoaded(ad);
                    adLoading.set(false);
                    interstitialAd = ad;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError error) {
                    AdLoadCallback.super.onAdFailedToLoad(error);
                    adLoading.set(false);
                    interstitialAd = null;
                }
            }
        );
    }

    private void loadRewardedAd() {
        if (!mobileAdsInitialized.get() || rewardedAd != null || !rewardedAdLoading.compareAndSet(false, true)) return;
        RewardedAd.load(
            new AdRequest.Builder(BuildConfig.COPA_ADMOB_REWARDED_ID).build(),
            new AdLoadCallback<RewardedAd>() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    AdLoadCallback.super.onAdLoaded(ad);
                    rewardedAdLoading.set(false);
                    rewardedAd = ad;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError error) {
                    AdLoadCallback.super.onAdFailedToLoad(error);
                    rewardedAdLoading.set(false);
                    rewardedAd = null;
                }
            }
        );
    }

    @PluginMethod
    public void showRewardedReroll(PluginCall call) {
        Activity activity = getActivity();
        String runKey = call.getString("runKey", "").trim();
        if (activity == null || runKey.isEmpty()) {
            call.resolve(rewardResult(false, "invalid_context", 0));
            return;
        }
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String storedRunKey = preferences.getString(REWARDED_REROLL_RUN_KEY, "");
        int earnedCount = runKey.equals(storedRunKey) ? preferences.getInt(REWARDED_REROLL_COUNT, 0) : 0;
        if (earnedCount >= MAX_REWARDED_REROLLS_PER_RUN) {
            call.resolve(rewardResult(false, "limit", earnedCount));
            return;
        }
        if (!rewardedAdShowing.compareAndSet(false, true)) {
            call.resolve(rewardResult(false, "already_showing", earnedCount));
            return;
        }
        if (consentInformation == null || !consentInformation.canRequestAds()) {
            rewardedAdShowing.set(false);
            call.resolve(rewardResult(false, "consent_required", earnedCount));
            return;
        }
        RewardedAd ad = rewardedAd;
        if (ad == null) {
            rewardedAdShowing.set(false);
            loadRewardedAd();
            call.resolve(rewardResult(false, "not_ready", earnedCount));
            return;
        }

        rewardedAd = null;
        AtomicBoolean resolved = new AtomicBoolean(false);
        int countBeforeShow = earnedCount;
        ad.setAdEventCallback(new RewardedAdEventCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                RewardedAdEventCallback.super.onAdDismissedFullScreenContent();
                rewardedAdShowing.set(false);
                if (resolved.compareAndSet(false, true)) {
                    call.resolve(rewardResult(false, "dismissed", countBeforeShow));
                }
                loadRewardedAd();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull FullScreenContentError error) {
                RewardedAdEventCallback.super.onAdFailedToShowFullScreenContent(error);
                rewardedAdShowing.set(false);
                if (resolved.compareAndSet(false, true)) {
                    call.resolve(rewardResult(false, "show_failed", countBeforeShow));
                }
                loadRewardedAd();
            }
        });
        activity.runOnUiThread(() -> ad.show(activity, new OnUserEarnedRewardListener() {
            @Override
            public void onUserEarnedReward(@NonNull RewardItem rewardItem) {
                int nextCount = Math.min(MAX_REWARDED_REROLLS_PER_RUN, countBeforeShow + 1);
                preferences.edit()
                    .putString(REWARDED_REROLL_RUN_KEY, runKey)
                    .putInt(REWARDED_REROLL_COUNT, nextCount)
                    .apply();
                if (resolved.compareAndSet(false, true)) {
                    call.resolve(rewardResult(true, "earned", nextCount));
                }
            }
        }));
    }

    @PluginMethod
    public void showRunEnd(PluginCall call) {
        Activity activity = getActivity();
        String runKey = call.getString("runKey", "").trim();
        if (activity == null || runKey.isEmpty()) {
            call.resolve(showResult(false, "invalid_context"));
            return;
        }
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (runKey.equals(preferences.getString(LAST_SHOWN_RUN_KEY, ""))) {
            call.resolve(showResult(false, "duplicate_run"));
            return;
        }
        long now = System.currentTimeMillis();
        if (now - preferences.getLong(LAST_SHOWN_AT_MS, 0L) < RUN_END_AD_COOLDOWN_MS) {
            call.resolve(showResult(false, "cooldown"));
            return;
        }
        if (consentInformation == null || !consentInformation.canRequestAds()) {
            call.resolve(showResult(false, "consent_required"));
            return;
        }
        InterstitialAd ad = interstitialAd;
        if (ad == null) {
            loadInterstitial();
            call.resolve(showResult(false, "not_ready"));
            return;
        }

        interstitialAd = null;
        preferences.edit()
            .putString(LAST_SHOWN_RUN_KEY, runKey)
            .putLong(LAST_SHOWN_AT_MS, now)
            .apply();
        ad.setAdEventCallback(new InterstitialAdEventCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                InterstitialAdEventCallback.super.onAdDismissedFullScreenContent();
                notifyListeners("runEndAdDismissed", new JSObject());
                loadInterstitial();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull FullScreenContentError error) {
                InterstitialAdEventCallback.super.onAdFailedToShowFullScreenContent(error);
                loadInterstitial();
            }
        });
        activity.runOnUiThread(() -> ad.show(activity));
        call.resolve(showResult(true, BuildConfig.COPA_ADMOB_TEST_MODE ? "test_ad" : "shown"));
    }

    @PluginMethod
    public void showPrivacyOptions(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || !privacyOptionsRequired()) {
            call.resolve(status("privacy_options_unavailable"));
            return;
        }
        activity.runOnUiThread(() -> UserMessagingPlatform.showPrivacyOptionsForm(activity, formError -> {
            maybeInitializeAds();
            notifyPrivacyStatus();
            call.resolve(status(formError == null ? "privacy_options_closed" : "privacy_options_error"));
        }));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status("status"));
    }

    private boolean privacyOptionsRequired() {
        return consentInformation != null && consentInformation.getPrivacyOptionsRequirementStatus()
            == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    private JSObject status(String state) {
        JSObject result = new JSObject();
        result.put("state", state);
        result.put("canRequestAds", consentInformation != null && consentInformation.canRequestAds());
        result.put("privacyOptionsRequired", privacyOptionsRequired());
        result.put("testMode", BuildConfig.COPA_ADMOB_TEST_MODE);
        return result;
    }

    private JSObject showResult(boolean shown, String reason) {
        JSObject result = status(reason);
        result.put("shown", shown);
        return result;
    }

    private JSObject rewardResult(boolean earned, String reason, int earnedCount) {
        JSObject result = status(reason);
        result.put("earned", earned);
        result.put("earnedCount", earnedCount);
        result.put("remaining", Math.max(0, MAX_REWARDED_REROLLS_PER_RUN - earnedCount));
        return result;
    }

    private void notifyPrivacyStatus() {
        notifyListeners("privacyOptionsChanged", status("privacy_status"));
    }
}
