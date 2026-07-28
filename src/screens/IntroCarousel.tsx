import { useEffect, useRef, useState, type ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import type { SvgProps } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MandalaRing } from "../assets/onboarding/MandalaRing";
import { Slide1Illustration } from "../assets/onboarding/Slide1Illustration";
import { Slide2Illustration } from "../assets/onboarding/Slide2Illustration";
import { Slide3Illustration } from "../assets/onboarding/Slide3Illustration";
import { Slide4Illustration } from "../assets/onboarding/Slide4Illustration";
import { AppPressable } from "../components/AppPressable";
import { usePagerScrollHandler } from "../hooks/use-pager-scroll-handler";
import { markIntroSeen } from "../lib/intro-storage";
import { colors, fonts, radius, spacing } from "../theme/tokens";

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

type SlideData = {
  title: string;
  description: string;
  Illustration: ComponentType<SvgProps>;
};

const SLIDES: SlideData[] = [
  {
    title: "Plan your way",
    description:
      "Add everything yourself, or get AI-assisted checklist suggestions — your choice from the start.",
    Illustration: Slide1Illustration,
  },
  {
    title: "Vendors & budget, organized",
    description:
      "Track payments, due dates, and real spending in one place — no more scattered notes.",
    Illustration: Slide2Illustration,
  },
  {
    title: "Guests, without the spreadsheet",
    description:
      "RSVPs, meal preferences, and real headcounts including plus-ones — all in one list.",
    Illustration: Slide3Illustration,
  },
  {
    title: "Invites that look like you sent them",
    description:
      "Themed, shareable invites for specific events — straight to WhatsApp when you're ready.",
    Illustration: Slide4Illustration,
  },
];

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
  const Illustration = slide.Illustration;

  const titleTranslateY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const descTranslateY = useSharedValue(16);
  const descOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      titleTranslateY.value = withDelay(150, withSpring(0, { damping: 14 }));
      titleOpacity.value = withDelay(150, withTiming(1, { duration: 350 }));
      descTranslateY.value = withDelay(250, withSpring(0, { damping: 14 }));
      descOpacity.value = withDelay(250, withTiming(1, { duration: 380 }));
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
      [0.85, 1, 0.85],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollOffset.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX }, { scale }], opacity };
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
        <Illustration width={240} height={240} />
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
      scrollOffset.value = e.position + e.offset;
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
          <View key={slide.title} collapsable={false}>
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
