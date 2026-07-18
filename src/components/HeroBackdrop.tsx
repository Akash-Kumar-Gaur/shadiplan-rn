import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { colors, heroGradient } from "../theme/tokens";

type HeroBackdropProps = {
  children?: ReactNode;
  style?: ViewStyle;
};

export function HeroBackdrop({ children, style }: HeroBackdropProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[...heroGradient.colors]}
        locations={[...heroGradient.locations]}
        start={heroGradient.start}
        end={heroGradient.end}
        style={StyleSheet.absoluteFill}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 300 300"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Circle
          cx="230"
          cy="60"
          r="90"
          fill="none"
          stroke={colors.mandala}
          strokeWidth={1}
          opacity={0.2}
        />
        <Circle
          cx="230"
          cy="60"
          r="60"
          fill="none"
          stroke={colors.mandala}
          strokeWidth={1}
          opacity={0.25}
        />
        <Circle cx="36" cy="48" r="2.5" fill={colors.mandala} opacity={0.45} />
        <Circle cx="60" cy="200" r="2" fill={colors.mandala} opacity={0.45} />
        <Circle cx="20" cy="150" r="2.5" fill={colors.mandala} opacity={0.45} />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
