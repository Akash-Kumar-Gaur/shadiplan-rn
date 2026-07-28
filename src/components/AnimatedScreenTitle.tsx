import { useEffect, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts } from "../theme/tokens";

type Props = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  /** Delay before entrance starts (ms). */
  delay?: number;
};

/**
 * Subtle fade + slide-up for screen titles on first mount.
 * Keep duration short (150–250ms) — polish, not spectacle.
 */
export function AnimatedScreenTitle({ children, style, delay = 40 }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 240 }));
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.title, style, animatedStyle]}>{children}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 28,
    color: colors.foreground,
  },
});
