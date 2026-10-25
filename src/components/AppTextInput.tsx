import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type Ref,
} from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius } from "../theme/tokens";

type SheetInputProps = ComponentProps<typeof BottomSheetTextInput>;
type NativeInputProps = ComponentProps<typeof TextInput>;

export type AppTextInputProps = Omit<SheetInputProps & NativeInputProps, "style"> & {
  label?: string;
  /** Applied to the outer field wrapper (e.g. `{ flex: 1 }` in a row). */
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
  /**
   * Use RN TextInput instead of BottomSheetTextInput.
   * Required for inputs outside AppBottomSheet (login, search, modals).
   */
  native?: boolean;
};

/**
 * Shared branded text field.
 *
 * Keeps a local buffer while focused so parent re-renders (keyboard layout,
 * dirty-checks, query updates) cannot wipe or drop characters mid-typing.
 * Pass `native` for screen-level inputs outside a bottom sheet.
 */
export const AppTextInput = forwardRef(function AppTextInput(
  {
    label,
    value,
    onChangeText,
    containerStyle,
    style,
    multiline,
    native = false,
    onFocus,
    onBlur,
    ...props
  }: AppTextInputProps,
  ref: Ref<ComponentRef<typeof BottomSheetTextInput> | TextInput>,
) {
  const [text, setText] = useState(value ?? "");
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!focusedRef.current) {
      setText(value ?? "");
    }
  }, [value]);

  const handleChangeText = useCallback(
    (next: string) => {
      setText(next);
      onChangeText?.(next);
    },
    [onChangeText],
  );

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<NativeInputProps["onFocus"]>>[0]) => {
      focusedRef.current = true;
      onFocus?.(e as never);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<NativeInputProps["onBlur"]>>[0]) => {
      focusedRef.current = false;
      // Pick up external resets (form clear) that happened while focused.
      setText(valueRef.current ?? "");
      onBlur?.(e as never);
    },
    [onBlur],
  );

  const inputStyle = [multiline ? styles.textarea : styles.input, style];

  return (
    <View style={[styles.fieldWrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {native ? (
        <TextInput
          ref={ref as Ref<TextInput>}
          {...(props as NativeInputProps)}
          style={inputStyle}
          value={text}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
        />
      ) : (
        <BottomSheetTextInput
          ref={ref as Ref<ComponentRef<typeof BottomSheetTextInput>>}
          {...(props as SheetInputProps)}
          style={inputStyle}
          value={text}
          onChangeText={handleChangeText}
          onFocus={handleFocus as SheetInputProps["onFocus"]}
          onBlur={handleBlur as SheetInputProps["onBlur"]}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fieldWrapper: {
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.charcoal,
    backgroundColor: "#fff",
  },
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.charcoal,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
});
