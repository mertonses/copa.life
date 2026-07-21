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
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "CopaAds")
public class CopaAdsPlugin extends Plugin {
    private static final String PREFS = "copa_ads";
    private static final String LAST_SHOWN_RUN_KEY = "last_shown_run_key";
    private static final String LAST_SHOWN_AT_MS = "last_shown_at_ms";
    private static final long RUN_END_AD_COOLDOWN_MS = 10 * 60 * 1000L;

    private ConsentInformation consentInformation;
    private InterstitialAd interstitialAd;
    private final AtomicBoolean initializationStarted = new AtomicBoolean(false);
    private final AtomicBoolean mobileAdsInitialized = new AtomicBoolean(false);
    private final AtomicBoolean adLoading = new AtomicBoolean(false);

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
                if (activity != null) activity.runOnUiThread(this::loadInterstitial);
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

    private void notifyPrivacyStatus() {
        notifyListeners("privacyOptionsChanged", status("privacy_status"));
    }
}
