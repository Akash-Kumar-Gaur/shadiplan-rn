import Svg, { Circle } from "react-native-svg";
import { colors } from "../../theme/tokens";

type Props = {
  size?: number;
};

/** Soft decorative backdrop for intro parallax — moves slowest. */
export function MandalaRing({ size = 320 }: Props) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={c}
        cy={c}
        r={c * 0.72}
        fill="none"
        stroke={colors.mandala}
        strokeWidth={1.5}
        opacity={0.55}
      />
      <Circle
        cx={c}
        cy={c}
        r={c * 0.55}
        fill="none"
        stroke={colors.gold}
        strokeWidth={1}
        opacity={0.35}
      />
      <Circle
        cx={c}
        cy={c}
        r={c * 0.38}
        fill="none"
        stroke={colors.terracotta}
        strokeWidth={1}
        opacity={0.22}
      />
      <Circle cx={c + c * 0.55} cy={c - c * 0.2} r={3} fill={colors.gold} opacity={0.5} />
      <Circle cx={c - c * 0.5} cy={c + c * 0.35} r={2.5} fill={colors.terracotta} opacity={0.4} />
      <Circle cx={c - c * 0.15} cy={c - c * 0.62} r={2} fill={colors.flame} opacity={0.45} />
    </Svg>
  );
}
