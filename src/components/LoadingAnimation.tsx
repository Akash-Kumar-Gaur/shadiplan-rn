import { StyleSheet, View } from "react-native";
import { DotLottie } from "@lottiefiles/dotlottie-react-native";
import { isDotLottieAvailable } from "../lib/dotlottie-available";
import { EmblemBadge } from "./EmblemBadge";

/** Centered Paper Plane Heart loop — no caption. Compose into any background. */
export function LoadingAnimation({ size = 200 }: { size?: number }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {isDotLottieAvailable ? (
        <DotLottie
          source={require("../../assets/paper-plane-heart.lottie")}
          style={{ width: size, height: size }}
          loop
          autoplay
        />
      ) : (
        <EmblemBadge size={size >= 160 ? "lg" : "sm"} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
