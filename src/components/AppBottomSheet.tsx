import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useMemo, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius } from "../theme/tokens";

type AppBottomSheetProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onDismiss?: () => void;
};

/**
 * Shared bottom sheet for all form sheets. Keyboard handling lives here so every
 * Add/Edit form (vendor, guest, expense, event, etc.) gets the same behavior —
 * do not wrap children in KeyboardAwareScrollView (conflicts with gorhom).
 */
export const AppBottomSheet = forwardRef<BottomSheetModal, AppBottomSheetProps>(
  function AppBottomSheet({ title, subtitle, children, onDismiss }, ref) {
    const insets = useSafeAreaInsets();
    const snapPoints = useMemo(() => ["90%"], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onDismiss={onDismiss}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 48,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.content}>{children}</View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

/** Use inside AppBottomSheet forms so focus notifies the sheet and scrolls the field above the keyboard. */
export const SheetTextInput = forwardRef<
  ComponentRef<typeof BottomSheetTextInput>,
  ComponentProps<typeof BottomSheetTextInput>
>(function SheetTextInput(props, ref) {
  return <BottomSheetTextInput ref={ref} {...props} />;
});

export const formStyles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.foreground,
  },
  textarea: {
    minHeight: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.foreground,
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
    height: 44,
    borderRadius: radius.sm,
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
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
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
    gap: 12,
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
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 22,
    color: colors.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  content: {
    marginTop: 16,
  },
});
