import { StyleSheet, View } from "react-native";
import { HeroBackdrop } from "./HeroBackdrop";
import { LoadingAnimation } from "./LoadingAnimation";

/** Full-screen auth/bootstrap loader — hero backdrop + animation only. */
export function WeddingLoader() {
  return (
    <View style={styles.root}>
      <HeroBackdrop style={styles.backdrop}>
        <LoadingAnimation />
      </HeroBackdrop>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
  },
});
