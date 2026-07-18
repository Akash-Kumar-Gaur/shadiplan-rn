import { StyleSheet, View } from "react-native";
import { LoadingAnimation } from "./LoadingAnimation";

/** In-screen loading state — animation only, no caption. */
export function ScreenLoader() {
  return (
    <View style={styles.wrap}>
      <LoadingAnimation size={160} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 160,
  },
});
