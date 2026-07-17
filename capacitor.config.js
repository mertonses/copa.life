const base = require("./capacitor.config.json");

module.exports = {
  ...base,
  webDir: process.env.COPA_NATIVE_PLATFORM === "ios" ? "dist-ios" : "dist-android",
};
