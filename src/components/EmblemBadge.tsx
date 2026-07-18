import { View } from "react-native";
import Svg, { Line, Path, Polygon } from "react-native-svg";
import { colors } from "../theme/tokens";

function DiyaIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Polygon points="24,12 27.2,23.2 24,27.2 20.8,23.2" fill={colors.gold} />
      <Path
        d="M 12.8 30.4 A 11.2 11.2 0 0 0 35.2 30.4"
        stroke={colors.cream}
        strokeWidth={2.8}
        strokeLinecap="round"
        fill="none"
      />
      <Line
        x1="10.4"
        y1="28.8"
        x2="7.2"
        y2="25.6"
        stroke={colors.cream}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <Line
        x1="37.6"
        y1="28.8"
        x2="40.8"
        y2="25.6"
        stroke={colors.cream}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const sizeMap = {
  lg: { outer: 96, icon: 52 },
  sm: { outer: 64, icon: 36 },
} as const;

export function EmblemBadge({ size = "lg" }: { size?: keyof typeof sizeMap }) {
  const { outer, icon } = sizeMap[size];

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: outer,
        height: outer,
        backgroundColor: "rgba(255,255,255,0.14)",
      }}
    >
      <DiyaIcon size={icon} />
    </View>
  );
}
