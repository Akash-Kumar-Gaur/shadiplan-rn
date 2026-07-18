import { LinearGradient } from "expo-linear-gradient";
import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { InviteEventDetail, InviteThemeId } from "../../lib/invite-utils";
import { fonts } from "../../theme/tokens";

export type { InviteEventDetail };

export interface InviteCardProps {
  coupleNames: string;
  events: InviteEventDetail[];
  location: string;
}

const EVENT_BLOCK_GAP = 22;

function InviteEventList({
  events,
  nameColor,
  metaColor,
}: {
  events: InviteEventDetail[];
  nameColor: string;
  metaColor: string;
}) {
  if (events.length === 0) {
    return (
      <Text style={[styles.emptyEvents, { color: metaColor }]}>Wedding celebrations</Text>
    );
  }

  return (
    <View style={styles.eventList}>
      {events.map((event) => (
        <View key={`${event.name}-${event.dateLabel}-${event.venue}`} style={styles.eventBlock}>
          <Text style={[styles.eventName, { color: nameColor }]}>{event.name}</Text>
          <Text style={[styles.eventMeta, { color: metaColor }]}>
            {event.dateLabel}
            {event.venue ? ` · ${event.venue}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LocationLine({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.location, { color }]}>{text}</Text>;
}

export function FloralInviteCard({ coupleNames, events, location }: InviteCardProps) {
  return (
    <LinearGradient
      colors={["#FBF7F0", "#F5E6D8", "#E8C4A8"]}
      locations={[0, 0.45, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.card}
    >
      <Text style={[styles.eyebrow, { color: "#8B5E3C" }]}>You're invited</Text>
      <Text style={[styles.title, { color: "#3D2914", marginTop: 32 }]}>{coupleNames}</Text>
      <View style={[styles.divider, { backgroundColor: "#C17F59" }]} />
      <InviteEventList events={events} nameColor="#5C4033" metaColor="#6F4F3C" />
      <View style={[styles.divider, { backgroundColor: "#C17F59" }]} />
      <LocationLine text={location} color="#6F4F3C" />
    </LinearGradient>
  );
}

export function MinimalInviteCard({ coupleNames, events, location }: InviteCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: "#FBF7F0" }]}>
      <Text style={[styles.eyebrowTight, { color: "#9A8B7A" }]}>Wedding invitation</Text>
      <Text style={[styles.title, { color: "#2C2418", marginTop: 48 }]}>{coupleNames}</Text>
      <View style={{ marginTop: 40 }}>
        <InviteEventList events={events} nameColor="#5C5348" metaColor="#6E6256" />
      </View>
      <View style={{ marginTop: 48 }}>
        <LocationLine text={location} color="#6E6256" />
      </View>
    </View>
  );
}

export function RoyalInviteCard({ coupleNames, events, location }: InviteCardProps) {
  return (
    <LinearGradient
      colors={["#4A0E1A", "#2D0810", "#1A0508"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.card, { padding: 48 }]}
    >
      <View style={styles.royalInner}>
        <Text style={[styles.eyebrowTight, { color: "#D4AF37" }]}>Shubh Vivah</Text>
        <Text style={[styles.titleSemibold, { color: "#F5E6C8", marginTop: 32 }]}>
          {coupleNames}
        </Text>
        <LinearGradient
          colors={["transparent", "#C9A227", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.goldDivider}
        />
        <InviteEventList events={events} nameColor="#E8D5B5" metaColor="#D4C2A4" />
        <LinearGradient
          colors={["transparent", "#C9A227", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.goldDivider}
        />
        <LocationLine text={location} color="#D4C2A4" />
      </View>
    </LinearGradient>
  );
}

export function PastelInviteCard({ coupleNames, events, location }: InviteCardProps) {
  return (
    <LinearGradient
      colors={["#FDF2F8", "#F3E8FF", "#EDE9FE"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.card, { padding: 40 }]}
    >
      <View style={styles.pastelInner}>
        <Text style={[styles.eyebrowLight, { color: "#9B7BB8" }]}>Save the date</Text>
        <Text style={[styles.title, { color: "#4A3F55", marginTop: 32, fontWeight: "400" }]}>
          {coupleNames}
        </Text>
        <View style={{ marginTop: 40 }}>
          {/* High-contrast meta colors — Pastel legibility fix from web */}
          <InviteEventList events={events} nameColor="#6B5B73" metaColor="#7E6E86" />
        </View>
        <View style={{ marginTop: 40 }}>
          <LocationLine text={location} color="#7E6E86" />
        </View>
      </View>
    </LinearGradient>
  );
}

export const INVITE_THEMES: Record<
  InviteThemeId,
  {
    label: string;
    swatchColors: readonly [string, string, ...string[]];
    Component: ComponentType<InviteCardProps>;
  }
> = {
  floral: {
    label: "Floral",
    swatchColors: ["#FBF7F0", "#E8C4A8"],
    Component: FloralInviteCard,
  },
  minimal: {
    label: "Minimal",
    swatchColors: ["#FBF7F0", "#F5E6D8"],
    Component: MinimalInviteCard,
  },
  royal: {
    label: "Royal",
    swatchColors: ["#4A0E1A", "#C9A227"],
    Component: RoyalInviteCard,
  },
  pastel: {
    label: "Pastel",
    swatchColors: ["#FDF2F8", "#EDE9FE"],
    Component: PastelInviteCard,
  },
};

export const INVITE_THEME_IDS = Object.keys(INVITE_THEMES) as InviteThemeId[];

const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 64,
  },
  royalInner: {
    flex: 1,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(201, 162, 39, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingVertical: 64,
  },
  pastelInner: {
    flex: 1,
    width: "100%",
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingVertical: 56,
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 4.5,
    textAlign: "center",
  },
  eyebrowTight: {
    fontFamily: fonts.body,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 5.5,
    textAlign: "center",
  },
  eyebrowLight: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: "300",
    textTransform: "uppercase",
    letterSpacing: 4,
    textAlign: "center",
  },
  title: {
    fontFamily: fonts.headingMedium,
    fontSize: 72,
    lineHeight: 82,
    textAlign: "center",
  },
  titleSemibold: {
    fontFamily: fonts.headingMedium,
    fontSize: 72,
    lineHeight: 82,
    textAlign: "center",
  },
  divider: {
    height: 1,
    width: 96,
    marginVertical: 32,
  },
  goldDivider: {
    height: 1,
    width: 128,
    marginVertical: 32,
  },
  eventList: {
    width: "100%",
    maxWidth: 520,
    gap: EVENT_BLOCK_GAP,
    alignItems: "center",
  },
  eventBlock: {
    alignItems: "center",
    width: "100%",
  },
  eventName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 28,
    lineHeight: 38,
    textAlign: "center",
  },
  eventMeta: {
    fontFamily: fonts.body,
    fontSize: 21,
    lineHeight: 29,
    textAlign: "center",
    marginTop: 4,
  },
  emptyEvents: {
    fontFamily: fonts.body,
    fontSize: 30,
    lineHeight: 40,
    textAlign: "center",
  },
  location: {
    fontFamily: fonts.body,
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
  },
});
