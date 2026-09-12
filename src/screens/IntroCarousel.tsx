import { DotLottie, type Dotlottie } from "@lottiefiles/dotlottie-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MandalaRing } from "../assets/onboarding/MandalaRing";
import { AppPressable } from "../components/AppPressable";
import { usePagerScrollHandler } from "../hooks/use-pager-scroll-handler";
import { isDotLottieAvailable } from "../lib/dotlottie-available";
import { markIntroSeen } from "../lib/intro-storage";
import { colors, fonts, radius, spacing } from "../theme/tokens";

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const easeOut = Easing.out(Easing.cubic);

type SlideData = {
  title: string;
  description: string;
  /** Static require under /assets — same pattern as login envelope. */
  lottie: number;
};

const SLIDES: SlideData[] = [
  {
    title: "Plan it your way",
    description:
      "A full head start, or a blank page to fill in yourself — however you like to plan.",
    lottie: require("../../assets/onboarding/slide1.lottie"),
  },
  {
    title: "Every rupee, in its place",
    description:
      "Vendors, payments, and budgets — tracked without a single spreadsheet.",
    lottie: require("../../assets/onboarding/slide2.lottie"),
  },
  {
    title: "Every guest, remembered",
    description:
      "RSVPs, meals, plus-ones — know exactly who's coming, and what they need.",
    lottie: require("../../assets/onboarding/slide3.lottie"),
  },
  {
    title: "An invitation worthy of the day",
    description:
      "Pick a theme, choose the moments to share, and send something as considered as the occasion itself.",
    lottie: require("../../assets/onboarding/slide4.lottie"),
  },
];

function IntroSlideLottie({
  source,
  isActive,
}: {
  source: number;
  isActive: boolean;
}) {
  const ref = useRef<Dotlottie>(null);
  const resolved = useMemo(() => Image.resolveAssetSource(source), [source]);

  useEffect(() => {
    if (!isDotLottieAvailable || !isActive) return;
    // Native view mounts async — nudge play after layout.
    const t = setTimeout(() => ref.current?.play(), 50);
    return () => clearTimeout(t);
  }, [isActive]);

  if (!isDotLottieAvailable) {
    return <View style={styles.lottieFallback} />;
  }

  // Only mount the active slide's player — multiple DotLottie surfaces inside
  // PagerView often render blank in Android release builds.
  if (!isActive) {
    return <View style={styles.lottie} />;
  }

  if (!resolved?.uri) {
    console.warn("[intro] could not resolve lottie asset", source);
    return <View style={styles.lottieFallback} />;
  }

  return (
    <DotLottie
      ref={ref}
      source={{ uri: resolved.uri }}
      style={styles.lottie}
      loop
      autoplay
      onLoadError={() => {
        console.error("[intro] DotLottie failed to load", resolved.uri);
      }}
    />
  );
}

function IntroSlide({
  slide,
  index,
  scrollOffset,
  isActive,
}: {
  slide: SlideData;
  index: number;
  scrollOffset: SharedValue<number>;
  isActive: boolean;
}) {
  const titleTranslateY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const descTranslateY = useSharedValue(16);
  const descOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      titleTranslateY.value = withDelay(
        150,
        withTiming(0, { duration: 400, easing: easeOut }),
      );
      titleOpacity.value = withDelay(
        150,
        withTiming(1, { duration: 400, easing: easeOut }),
      );
      descTranslateY.value = withDelay(
        250,
        withTiming(0, { duration: 400, easing: easeOut }),
      );
      descOpacity.value = withDelay(
        250,
        withTiming(1, { duration: 400, easing: easeOut }),
      );
    } else {
      titleTranslateY.value = 20;
      titleOpacity.value = 0;
      descTranslateY.value = 16;
      descOpacity.value = 0;
    }
  }, [isActive, titleTranslateY, titleOpacity, descTranslateY, descOpacity]);

  const backgroundStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];
    const translateX = interpolate(
      scrollOffset.value,
      inputRange,
      [60, 0, -60],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX }] };
  });

  // Do NOT animate opacity on the DotLottie wrapper — on Android release,
  // opacity on a parent of DotLottie's native surface often makes it invisible
  // even when the value is 1.
  const illustrationStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];
    const translateX = interpolate(
      scrollOffset.value,
      inputRange,
      [30, 0, -30],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollOffset.value,
      inputRange,
      [0.92, 1, 0.92],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX }, { scale }] };
  });

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  const descStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: descTranslateY.value }],
    opacity: descOpacity.value,
  }));

  return (
    <View style={styles.slideContainer}>
      <Animated.View style={[styles.backgroundLayer, backgroundStyle]} pointerEvents="none">
        <MandalaRing size={300} />
      </Animated.View>

      <Animated.View style={[styles.illustrationLayer, illustrationStyle]}>
        <IntroSlideLottie source={slide.lottie} isActive={isActive} />
      </Animated.View>

      <View style={styles.textLayer}>
        <Animated.Text style={[styles.slideTitle, titleStyle]}>{slide.title}</Animated.Text>
        <Animated.Text style={[styles.slideDescription, descStyle]}>
          {slide.description}
        </Animated.Text>
      </View>
    </View>
  );
}

type Props = {
  onDone: () => void;
};

export function IntroCarousel({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const finishing = useRef(false);
  const scrollOffset = useSharedValue(0);

  const onPageScroll = usePagerScrollHandler({
    onPageScroll: (e) => {
      "worklet";
      scrollOffset.value = (e.position ?? 0) + (e.offset ?? 0);
    },
  });

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    await markIntroSeen();
    onDone();
  };

  const goNext = () => {
    if (page === SLIDES.length - 1) {
      void finish();
    } else {
      pagerRef.current?.setPage(page + 1);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <AnimatedPagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageScroll={onPageScroll}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.title} collapsable={false} style={styles.page}>
            <IntroSlide
              slide={slide}
              index={i}
              scrollOffset={scrollOffset}
              isActive={page === i}
            />
          </View>
        ))}
      </AnimatedPagerView>

      <View style={styles.dotsRow}>
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.dot, page === i && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <AppPressable onPress={() => void finish()} hitSlop={12} style={styles.skipHit}>
          <Text style={styles.skip}>Skip</Text>
        </AppPressable>
        <AppPressable onPress={goNext} style={styles.nextBtn}>
          <Text style={styles.next}>
            {page === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    overflow: "hidden",
  },
  backgroundLayer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: "12%",
    opacity: 0.9,
  },
  illustrationLayer: {
    marginBottom: 28,
    zIndex: 1,
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: {
    width: 220,
    height: 220,
  },
  lottieFallback: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.secondary,
  },
  textLayer: {
    alignItems: "center",
    zIndex: 2,
    minHeight: 120,
  },
  slideTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 30,
    lineHeight: 36,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  slideDescription: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.mutedForeground,
    textAlign: "center",
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.terracottaDark,
    width: 22,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen,
    paddingBottom: 16,
  },
  skipHit: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  skip: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  nextBtn: {
    minWidth: 132,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },
  next: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primaryForeground,
  },
});
