import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppPressable } from "./AppPressable";
import { colors, fonts, spacing } from "../theme/tokens";

type Props = {
  title: string;
  right?: ReactNode;
};

export function StackScreenHeader({ title, right }: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <AppPressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
        <ArrowLeft size={20} color={colors.foreground} />
      </AppPressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right ? <View style={styles.right}>{right}</View> : <View style={styles.rightSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.screen,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.foreground,
  },
  right: {
    marginLeft: "auto",
  },
  rightSpacer: {
    width: 28,
  },
});
