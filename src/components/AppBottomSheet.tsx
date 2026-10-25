import {
  BottomSheetBackdrop,
  BottomSheetModal,
  SCROLLABLE_TYPE,
  createBottomSheetScrollableComponent,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { X } from "lucide-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConfirmedDismiss } from "../hooks/use-confirmed-dismiss";
import { colors, fonts, radius } from "../theme/tokens";
import { AppPressable } from "./AppPressable";

/** Approximate height of the sheet handle / grabber area. */
const HANDLE_AREA = 28;

/**
 * Freeze to screen height — NOT window height.
 * With adjustResize, window height shrinks when the keyboard opens and
 * recalculating snap points remounts form inputs mid-typing.
 */
const SHEET_HEIGHT = Math.round(Dimensions.get("screen").height * 0.75);

/**
 * KeyboardAwareScrollView wired into gorhom's scrollable system so sheet
 * gestures + scroll-to-focused-input both work.
 */
const BottomSheetKeyboardAwareScrollView = createBottomSheetScrollableComponent(
  SCROLLABLE_TYPE.SCROLLVIEW,
  KeyboardAwareScrollView,
) as unknown as typeof KeyboardAwareScrollView;

type AppBottomSheetProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onDismiss?: () => void;
  /**
   * When true, backdrop tap / swipe / Android back ask before closing.
   * Pass from each form via useFormDirty.
   */
  isDirty?: boolean;
};

/**
 * Shared form scroll body for custom sheets. Prefer AppBottomSheet for forms.
 */
export function SheetFormBody({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <BottomSheetKeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={24}
      keyboardOpeningTime={0}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator
      bounces
      style={styles.scroll}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </BottomSheetKeyboardAwareScrollView>
  );
}

/**
 * Shared bottom sheet for all form sheets.
 * Fixed ~75% screen height; content scrolls inside.
 *
 * IMPORTANT: enableContentPanningGesture is OFF so vertical pans go to the
 * ScrollView (gorhom otherwise steals them and the body never scrolls).
 * Dismiss works via the close icon, handle, backdrop, or Android back.
 */
export const AppBottomSheet = forwardRef<BottomSheetModal, AppBottomSheetProps>(
  function AppBottomSheet({ title, subtitle, children, onDismiss, isDirty = false }, ref) {
    const insets = useSafeAreaInsets();
    const snapPoints = useMemo(() => [SHEET_HEIGHT], []);
    const bodyHeight = SHEET_HEIGHT - HANDLE_AREA;

    const sheetRef = useRef<BottomSheetModal>(null);
    const [isOpen, setIsOpen] = useState(false);
    const allowCloseRef = useRef(false);

    useImperativeHandle(
      ref,
      () =>
        ({
          present: (...args: Parameters<BottomSheetModal["present"]>) =>
            sheetRef.current?.present(...args),
          dismiss: (...args: Parameters<BottomSheetModal["dismiss"]>) => {
            allowCloseRef.current = true;
            return sheetRef.current?.dismiss(...args);
          },
          snapToIndex: (...args: Parameters<BottomSheetModal["snapToIndex"]>) =>
            sheetRef.current?.snapToIndex(...args),
          snapToPosition: (...args: Parameters<BottomSheetModal["snapToPosition"]>) =>
            sheetRef.current?.snapToPosition(...args),
          expand: (...args: Parameters<BottomSheetModal["expand"]>) =>
            sheetRef.current?.expand(...args),
          collapse: (...args: Parameters<BottomSheetModal["collapse"]>) =>
            sheetRef.current?.collapse(...args),
          close: (...args: Parameters<BottomSheetModal["close"]>) => {
            allowCloseRef.current = true;
            return sheetRef.current?.close(...args);
          },
          forceClose: (...args: Parameters<BottomSheetModal["forceClose"]>) => {
            allowCloseRef.current = true;
            return sheetRef.current?.forceClose(...args);
          },
        }) as BottomSheetModal,
      [],
    );

    const performClose = useCallback(() => {
      allowCloseRef.current = true;
      sheetRef.current?.dismiss();
    }, []);

    const { attemptDismiss, showConfirm, confirmDiscard, cancelDismiss } = useConfirmedDismiss(
      isDirty,
      performClose,
    );

    const handleDismiss = useCallback(() => {
      const wasForced = allowCloseRef.current;
      allowCloseRef.current = false;

      // Keyboard can push the sheet to an invalid detent (index -1) on Android.
      // Reopen without resetting form state.
      if (!wasForced && Keyboard.isVisible()) {
        requestAnimationFrame(() => {
          sheetRef.current?.present();
        });
        return;
      }

      if (isDirty && !wasForced) {
        requestAnimationFrame(() => {
          sheetRef.current?.present();
          attemptDismiss();
        });
        return;
      }

      onDismiss?.();
    }, [isDirty, onDismiss, attemptDismiss]);

    const handleChange = useCallback<NonNullable<BottomSheetModalProps["onChange"]>>((index) => {
      setIsOpen(index >= 0);
    }, []);

    useEffect(() => {
      if (!isOpen) return;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        attemptDismiss();
        return true;
      });
      return () => subscription.remove();
    }, [isOpen, attemptDismiss]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.45}
          pressBehavior="none"
          onPress={attemptDismiss}
        />
      ),
      [attemptDismiss],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose
        // Critical: sheet must NOT own vertical pans — ScrollView does.
        enableContentPanningGesture={false}
        enableHandlePanningGesture
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        onChange={handleChange}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior={Platform.OS === "ios" ? "interactive" : "extend"}
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        enableBlurKeyboardOnGesture
      >
        <View style={[styles.sheetBody, { height: bodyHeight }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <AppPressable
              onPress={attemptDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={18} color={colors.mutedForeground} />
            </AppPressable>
          </View>
          <BottomSheetKeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={{
              paddingTop: 8,
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + (showConfirm ? 160 : 80),
            }}
            enableOnAndroid
            extraScrollHeight={40}
            extraHeight={24}
            keyboardOpeningTime={0}
            enableAutomaticScroll
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator
            bounces
          >
            <View style={styles.content}>{children}</View>
          </BottomSheetKeyboardAwareScrollView>

          {showConfirm ? (
            <View
              style={[
                discardStyles.overlay,
                { paddingBottom: Math.max(insets.bottom, 12) + 8 },
              ]}
            >
              <View style={discardStyles.card}>
                <Text style={discardStyles.title}>Discard changes?</Text>
                <Text style={discardStyles.body}>
                  You have unsaved edits. Close this form and lose them?
                </Text>
                <View style={discardStyles.actions}>
                  <AppPressable onPress={cancelDismiss} style={discardStyles.cancelBtn}>
                    <Text style={discardStyles.cancelText}>Cancel</Text>
                  </AppPressable>
                  <AppPressable onPress={confirmDiscard} style={discardStyles.discardBtn}>
                    <Text style={discardStyles.discardText}>Discard</Text>
                  </AppPressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </BottomSheetModal>
    );
  },
);

/** Optional helper if a screen needs a typed ref for the back-handler pattern. */
export type AppBottomSheetRef = RefObject<BottomSheetModal | null>;

export const formStyles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.charcoal,
    justifyContent: "center",
  },
  textarea: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.charcoal,
    textAlignVertical: "top",
  },
  row2: {
    flexDirection: "row",
    gap: 12,
  },
  row2col: {
    flex: 1,
  },
  error: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.destructive,
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primaryForeground,
  },
  outlineBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
});

const discardStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.ivory,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(196,74,58,0.35)",
    backgroundColor: "rgba(196,74,58,0.08)",
    borderRadius: radius.lg,
    padding: 16,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  body: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  discardBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.destructive,
  },
  discardText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#fff",
  },
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.ivory,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    backgroundColor: colors.border,
    width: 40,
  },
  sheetBody: {
    width: "100%",
  },
  scroll: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 22,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  content: {
    paddingBottom: 8,
  },
});
