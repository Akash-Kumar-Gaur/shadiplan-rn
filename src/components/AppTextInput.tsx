import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { forwardRef, type ComponentProps, type ComponentRef, type Ref } from "react";
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
 * Shared branded text field. Defaults to BottomSheetTextInput so focus scrolls
 * correctly inside AppBottomSheet forms. Pass `native` for screen-level inputs.
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
    ...props
  }: AppTextInputProps,
  ref: Ref<ComponentRef<typeof BottomSheetTextInput> | TextInput>,
) {
  const inputStyle = [multiline ? styles.textarea : styles.input, style];

  return (
    <View style={[styles.fieldWrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {native ? (
        <TextInput
          ref={ref as Ref<TextInput>}
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          {...(props as NativeInputProps)}
        />
      ) : (
        <BottomSheetTextInput
          ref={ref as Ref<ComponentRef<typeof BottomSheetTextInput>>}
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          {...(props as SheetInputProps)}
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
