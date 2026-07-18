import { UIManager } from "react-native";

/** False in Expo Go; true in a prebuild / EAS / dev-client binary. */
export const isDotLottieAvailable =
  UIManager.getViewManagerConfig("DotlottieReactNativeView") != null;
