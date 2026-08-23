package life.copa.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
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
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAd;
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdLoader;
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdLoaderCallback;
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdRequest;
import com.google.android.libraries.ads.mobile.sdk.nativead.NativeAdView;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.Arrays;

@CapacitorPlugin(name = "CopaAds")
public class CopaAdsPlugin extends Plugin {
    private static final String PREFS = "copa_ads";
    private static final String LAST_SHOWN_RUN_KEY = "last_shown_run_key";
    private static final String LAST_SHOWN_AT_MS = "last_shown_at_ms";
    private static final String PLACEMENT_REROLL = "reroll";
    private static final String PLACEMENT_INJURY = "injury";
    private static final String PLACEMENT_MARKET = "market";
    private static final int MAX_REWARDED_REROLLS_PER_RUN = 2;
    private static final int MAX_REWARDED_INJURY_HEALS_PER_RUN = 2;
    private static final int MAX_REWARDED_MARKET_REROLLS_PER_RUN = 1;
    private static final long RUN_END_AD_COOLDOWN_MS = 10 * 60 * 1000L;

    private ConsentInformation consentInformation;
    private InterstitialAd interstitialAd;
    private RewardedAd rewardedAd;
    private final AtomicBoolean initializationStarted = new AtomicBoolean(false);
    private final AtomicBoolean mobileAdsInitialized = new AtomicBoolean(false);
    private final AtomicBoolean adLoading = new AtomicBoolean(false);
    private final AtomicBoolean rewardedAdLoading = new AtomicBoolean(false);
    private final AtomicBoolean rewardedAdShowing = new AtomicBoolean(false);
    private final AtomicBoolean nativeAdLoading = new AtomicBoolean(false);
    private NativeAd nativeListAd;
    private NativeAdView nativeListView;

    @Override
    public void load() {
        consentInformation = UserMessagingPlatform.getConsentInformation(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        Activity activity = getActivity();
        if (activity != null) activity.runOnUiThread(this::destroyNativeListAd);
        super.handleOnDestroy();
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
        showRewarded(call, PLACEMENT_REROLL, MAX_REWARDED_REROLLS_PER_RUN);
    }

    @PluginMethod
    public void showRewardedInjury(PluginCall call) {
        showRewarded(call, PLACEMENT_INJURY, MAX_REWARDED_INJURY_HEALS_PER_RUN);
    }

    @PluginMethod
    public void showRewardedMarket(PluginCall call) {
        showRewarded(call, PLACEMENT_MARKET, MAX_REWARDED_MARKET_REROLLS_PER_RUN);
    }

    private void showRewarded(PluginCall call, String placement, int placementLimit) {
        Activity activity = getActivity();
        String runKey = call.getString("runKey", "").trim();
        if (activity == null || runKey.isEmpty()) {
            call.resolve(rewardResult(false, "invalid_context", 0, placementLimit, placement));
            return;
        }
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String runKeyPreference = "rewarded_" + placement + "_run_key";
        String countPreference = "rewarded_" + placement + "_count";
        String storedRunKey = preferences.getString(runKeyPreference, "");
        int earnedCount = runKey.equals(storedRunKey) ? preferences.getInt(countPreference, 0) : 0;
        if (earnedCount >= placementLimit) {
            call.resolve(rewardResult(false, "limit", earnedCount, placementLimit, placement));
            return;
        }
        if (!rewardedAdShowing.compareAndSet(false, true)) {
            call.resolve(rewardResult(false, "already_showing", earnedCount, placementLimit, placement));
            return;
        }
        if (consentInformation == null || !consentInformation.canRequestAds()) {
            rewardedAdShowing.set(false);
            call.resolve(rewardResult(false, "consent_required", earnedCount, placementLimit, placement));
            return;
        }
        RewardedAd ad = rewardedAd;
        if (ad == null) {
            rewardedAdShowing.set(false);
            loadRewardedAd();
            call.resolve(rewardResult(false, "not_ready", earnedCount, placementLimit, placement));
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
                    call.resolve(rewardResult(false, "dismissed", countBeforeShow, placementLimit, placement));
                }
                loadRewardedAd();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull FullScreenContentError error) {
                RewardedAdEventCallback.super.onAdFailedToShowFullScreenContent(error);
                rewardedAdShowing.set(false);
                if (resolved.compareAndSet(false, true)) {
                    call.resolve(rewardResult(false, "show_failed", countBeforeShow, placementLimit, placement));
                }
                loadRewardedAd();
            }
        });
        activity.runOnUiThread(() -> ad.show(activity, new OnUserEarnedRewardListener() {
            @Override
            public void onUserEarnedReward(@NonNull RewardItem rewardItem) {
                int nextCount = Math.min(placementLimit, countBeforeShow + 1);
                preferences.edit()
                    .putString(runKeyPreference, runKey)
                    .putInt(countPreference, nextCount)
                    .apply();
                if (resolved.compareAndSet(false, true)) {
                    call.resolve(rewardResult(true, "earned", nextCount, placementLimit, placement));
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
    public void showListPlacement(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || consentInformation == null || !consentInformation.canRequestAds()) {
            call.resolve(showResult(false, "consent_required"));
            return;
        }
        int x = Math.max(0, call.getInt("x", 0));
        int y = Math.max(0, call.getInt("y", 0));
        int width = Math.max(220, call.getInt("width", 320));
        int height = Math.max(82, call.getInt("height", 96));
        activity.runOnUiThread(() -> {
            if (nativeListView != null && nativeListAd != null) {
                attachNativeListView(activity, x, y, width, height);
                call.resolve(showResult(true, "shown"));
                return;
            }
            if (!nativeAdLoading.compareAndSet(false, true)) {
                call.resolve(showResult(false, "loading"));
                return;
            }
            NativeAdRequest request = new NativeAdRequest.Builder(
                BuildConfig.COPA_ADMOB_NATIVE_ID,
                Arrays.asList(NativeAd.NativeAdType.NATIVE)
            ).build();
            NativeAdLoader.load(request, new NativeAdLoaderCallback() {
                @Override
                public void onNativeAdLoaded(@NonNull NativeAd ad) {
                    nativeAdLoading.set(false);
                    activity.runOnUiThread(() -> {
                        destroyNativeListAd();
                        nativeListAd = ad;
                        nativeListView = createNativeListView(activity, ad);
                        attachNativeListView(activity, x, y, width, height);
                        call.resolve(showResult(true, BuildConfig.COPA_ADMOB_TEST_MODE ? "test_ad" : "shown"));
                    });
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError error) {
                    nativeAdLoading.set(false);
                    call.resolve(showResult(false, "not_ready"));
                }
            });
        });
    }

    @PluginMethod
    public void hideListPlacement(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) activity.runOnUiThread(() -> {
            if (nativeListView != null) nativeListView.setVisibility(View.GONE);
        });
        JSObject result = status("hidden");
        result.put("hidden", true);
        call.resolve(result);
    }

    private TextView nativeText(Context context, int color, float size, boolean bold) {
        TextView view = new TextView(context);
        view.setTextColor(color);
        view.setTextSize(size);
        view.setMaxLines(2);
        if (bold) view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        return view;
    }

    private NativeAdView createNativeListView(Context context, NativeAd ad) {
        NativeAdView container = new NativeAdView(context);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(18, 32, 41));
        background.setStroke(dp(context, 1), Color.rgb(62, 78, 88));
        background.setCornerRadius(dp(context, 12));
        container.setBackground(background);
        container.setPadding(dp(context, 12), dp(context, 10), dp(context, 12), dp(context, 10));

        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        container.addView(row, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        ImageView icon = new ImageView(context);
        icon.setScaleType(ImageView.ScaleType.CENTER_CROP);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(context, 48), dp(context, 48));
        iconParams.setMarginEnd(dp(context, 10));
        row.addView(icon, iconParams);

        LinearLayout copy = new LinearLayout(context);
        copy.setOrientation(LinearLayout.VERTICAL);
        TextView attribution = nativeText(context, Color.rgb(214, 162, 31), 9, true);
        attribution.setText("REKLAM · AD");
        TextView headline = nativeText(context, Color.rgb(243, 245, 244), 14, true);
        TextView body = nativeText(context, Color.rgb(180, 190, 194), 10, false);
        copy.addView(attribution);
        copy.addView(headline);
        copy.addView(body);
        row.addView(copy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button action = new Button(context);
        action.setAllCaps(false);
        action.setTextColor(Color.rgb(16, 29, 40));
        action.setTextSize(10);
        GradientDrawable actionBackground = new GradientDrawable();
        actionBackground.setColor(Color.rgb(214, 162, 31));
        actionBackground.setCornerRadius(dp(context, 8));
        action.setBackground(actionBackground);
        LinearLayout.LayoutParams actionParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(context, 40));
        actionParams.setMarginStart(dp(context, 10));
        row.addView(action, actionParams);

        container.setHeadlineView(headline);
        container.setBodyView(body);
        container.setCallToActionView(action);
        container.setIconView(icon);
        headline.setText(ad.getHeadline());
        if (ad.getBody() == null) body.setVisibility(View.GONE); else body.setText(ad.getBody());
        if (ad.getCallToAction() == null) action.setVisibility(View.GONE); else action.setText(ad.getCallToAction());
        if (ad.getIcon() == null) icon.setVisibility(View.GONE); else icon.setImageDrawable(ad.getIcon().getDrawable());
        container.registerNativeAd(ad, null);
        container.setElevation(dp(context, 8));
        return container;
    }

    private void attachNativeListView(Activity activity, int x, int y, int width, int height) {
        if (nativeListView == null) return;
        ViewGroup parent = (ViewGroup) nativeListView.getParent();
        if (parent != null) parent.removeView(nativeListView);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(activity, width), dp(activity, height), Gravity.TOP | Gravity.START);
        params.leftMargin = dp(activity, x);
        params.topMargin = dp(activity, y);
        activity.addContentView(nativeListView, params);
        nativeListView.setVisibility(View.VISIBLE);
    }

    private int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private void destroyNativeListAd() {
        if (nativeListView != null) {
            ViewGroup parent = (ViewGroup) nativeListView.getParent();
            if (parent != null) parent.removeView(nativeListView);
            nativeListView = null;
        }
        if (nativeListAd != null) {
            nativeListAd.destroy();
            nativeListAd = null;
        }
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

    private JSObject rewardResult(boolean earned, String reason, int earnedCount, int placementLimit, String placement) {
        JSObject result = status(reason);
        result.put("earned", earned);
        result.put("earnedCount", earnedCount);
        result.put("remaining", Math.max(0, placementLimit - earnedCount));
        result.put("placement", placement);
        return result;
    }

    private void notifyPrivacyStatus() {
        notifyListeners("privacyOptionsChanged", status("privacy_status"));
    }
}
