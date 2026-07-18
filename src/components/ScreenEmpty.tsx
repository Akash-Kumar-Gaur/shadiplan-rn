import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme/tokens";

export function ScreenEmpty({
  title,
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={[styles.description, !title && styles.descriptionOnly]}>{description}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    color: colors.foreground,
    textAlign: "center",
  },
  description: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  descriptionOnly: {
    marginTop: 0,
  },
});
