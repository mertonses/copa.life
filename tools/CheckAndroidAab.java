import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

public final class CheckAndroidAab {
    private static final String PUBLIC = "base/assets/public/";
    private static final long MAX_ENTRY_BYTES = 32L * 1024 * 1024;
    private static final long MAX_TOTAL_BYTES = 160L * 1024 * 1024;
    private static final Set<String> TEXT_EXTENSIONS = Set.of(
        ".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".txt"
    );

    private static final List<String> FORBIDDEN_PATHS = List.of(
        PUBLIC + "assets/clubs/",
        PUBLIC + "assets/flags/",
        PUBLIC + "assets/icons/patreon.svg",
        PUBLIC + "src/data/logos.js",
        PUBLIC + "src/state/diagnostics.js",
        PUBLIC + "sw.js"
    );

    private static final List<String> FORBIDDEN_TEXT = List.of(
        "assets/clubs/", "patreon.com", "FM26", "Football Manager",
        "api.web3forms.com", "FA Cup", "Copa del Rey", "Coppa Italia",
        "DFB-Pokal", "Emperor's Cup", "com.android.billingclient",
        "play-services-ads", "google-mobile-ads", "admob"
    );

    private static final List<String> REQUIRED = List.of(
        PUBLIC + "index.html",
        PUBLIC + "platform-build.json",
        PUBLIC + "src/runtime/nativeApp.js",
        PUBLIC + "src/data/generic_club_visuals.js",
        PUBLIC + "assets/data/copa/player_profiles.json",
        PUBLIC + "privacy.html",
        PUBLIC + "terms.html"
    );

    private static boolean isText(String name) {
        String lower = name.toLowerCase();
        return TEXT_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private static String readText(ZipFile zip, ZipEntry entry) throws IOException {
        if (entry.getSize() > MAX_ENTRY_BYTES) {
            throw new IOException("text entry exceeds safety limit: " + entry.getName());
        }
        try (InputStream stream = zip.getInputStream(entry)) {
            return new String(stream.readNBytes((int) MAX_ENTRY_BYTES + 1), StandardCharsets.UTF_8);
        }
    }

    private static String jsonString(String json, String field) {
        Matcher matcher = Pattern.compile("\\\"" + Pattern.quote(field) + "\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").matcher(json);
        if (!matcher.find()) throw new IllegalArgumentException("missing JSON field: " + field);
        return matcher.group(1);
    }

    private static int jsonInt(String json, String field) {
        Matcher matcher = Pattern.compile("\\\"" + Pattern.quote(field) + "\\\"\\s*:\\s*(\\d+)").matcher(json);
        if (!matcher.find()) throw new IllegalArgumentException("missing JSON field: " + field);
        return Integer.parseInt(matcher.group(1));
    }

    private static String sha256(Path file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = Files.newInputStream(file); DigestInputStream stream = new DigestInputStream(input, digest)) {
            stream.transferTo(java.io.OutputStream.nullOutputStream());
        }
        return HexFormat.of().withUpperCase().formatHex(digest.digest());
    }

    public static void main(String[] args) throws Exception {
        Path root = Path.of("").toAbsolutePath().normalize();
        Path aab = root.resolve(args.length > 0 ? args[0] : "android/app/build/outputs/bundle/release/app-release.aab").normalize();
        if (!aab.startsWith(root) || !Files.isRegularFile(aab)) {
            throw new IllegalArgumentException("AAB is missing or outside the project: " + aab);
        }

        String expectedBuild = Files.readString(root.resolve("dist-android/platform-build.json"), StandardCharsets.UTF_8);
        String expectedVersion = Files.readString(root.resolve("release/android-version.json"), StandardCharsets.UTF_8);
        List<String> failures = new ArrayList<>();
        Set<String> names = new HashSet<>();
        long totalBytes = 0;
        int publicFiles = 0;
        String packagedBuild = null;
        String packagedIndex = null;

        try (ZipFile zip = new ZipFile(aab.toFile())) {
            Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName().replace('\\', '/');
                names.add(name);
                if (name.startsWith("/") || name.contains("../")) failures.add("unsafe archive path: " + name);
                if (entry.getSize() > MAX_ENTRY_BYTES) failures.add("entry exceeds safety limit: " + name);
                if (entry.getSize() > 0) totalBytes += entry.getSize();
                if (totalBytes > MAX_TOTAL_BYTES) failures.add("AAB uncompressed size exceeds safety limit");
                if (entry.isDirectory() || !name.startsWith(PUBLIC)) continue;
                publicFiles++;

                for (String forbidden : FORBIDDEN_PATHS) {
                    if (name.equals(forbidden) || name.startsWith(forbidden)) failures.add("forbidden packaged path: " + name);
                }

                if (isText(name)) {
                    String text = readText(zip, entry);
                    for (String forbidden : FORBIDDEN_TEXT) {
                        if (text.contains(forbidden)) failures.add(name + " contains " + forbidden);
                    }
                    if (name.equals(PUBLIC + "platform-build.json")) packagedBuild = text;
                    if (name.equals(PUBLIC + "index.html")) packagedIndex = text;
                }
            }
        }

        for (String required : REQUIRED) {
            if (!names.contains(required)) failures.add("required packaged file is missing: " + required);
        }
        if (packagedBuild == null) failures.add("packaged platform-build.json could not be read");
        else {
            if (!packagedBuild.equals(expectedBuild)) failures.add("packaged build manifest differs from dist-android");
            if (!jsonString(packagedBuild, "platform").equals("android")) failures.add("packaged platform is not android");
            if (jsonInt(packagedBuild, "version_code") != jsonInt(expectedVersion, "versionCode")) failures.add("packaged versionCode drift");
            if (!jsonString(packagedBuild, "version_name").equals(jsonString(expectedVersion, "versionName"))) failures.add("packaged versionName drift");
            if (!jsonString(packagedBuild, "build_fingerprint").matches("[a-f0-9]{64}")) failures.add("invalid packaged build fingerprint");
            String buildVersion = jsonString(packagedBuild, "build_version");
            if (packagedIndex == null || !packagedIndex.contains("src/runtime/nativeApp.js?v=" + buildVersion)) {
                failures.add("native runtime cache key does not match packaged build version");
            }
            if (packagedIndex == null || !packagedIndex.contains("class=\"generic-country-code\"")) {
                failures.add("generic Android country-code visuals are missing");
            }
            String visibleVersion = "v" + jsonString(expectedVersion, "versionName") + " (" + jsonInt(expectedVersion, "versionCode") + ")";
            if (packagedIndex == null || !packagedIndex.contains(visibleVersion)) failures.add("visible Android version label is missing");
            if (packagedIndex != null && Pattern.compile("\\?v=202\\d").matcher(packagedIndex).find()) {
                failures.add("stale manually-versioned URL remains in packaged Android index");
            }
        }

        if (!failures.isEmpty()) {
            failures.stream().distinct().forEach(failure -> System.err.println("[aab] " + failure));
            System.exit(1);
        }
        System.out.printf("[aab] verified %d packaged web files; v%s+%d; SHA-256 %s%n",
            publicFiles,
            jsonString(expectedVersion, "versionName"),
            jsonInt(expectedVersion, "versionCode"),
            sha256(aab));
    }
}
