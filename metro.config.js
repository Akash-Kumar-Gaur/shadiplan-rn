const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Apply NativeWind first, then register .lottie as an asset (wrap can replace resolver).
const metroConfig = withNativeWind(config, { input: "./global.css" });

metroConfig.resolver.assetExts = Array.from(
  new Set([...(metroConfig.resolver.assetExts ?? []), "lottie"]),
);
metroConfig.resolver.sourceExts = (metroConfig.resolver.sourceExts ?? []).filter(
  (ext) => ext !== "lottie",
);

module.exports = metroConfig;
