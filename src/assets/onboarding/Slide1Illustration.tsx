import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  type SvgProps,
} from "react-native-svg";
import { colors } from "../../theme/tokens";

/** Plan your way — choice / planning paths. Brand terracotta + gold. */
export function Slide1Illustration(props: SvgProps) {
  return (
    <Svg viewBox="0 0 240 240" width={240} height={240} fill="none" {...props}>
      <Circle cx="120" cy="120" r="100" fill={colors.cream} />
      <Ellipse cx="120" cy="198" rx="70" ry="10" fill={colors.mandala} opacity={0.55} />

      {/* Left path card */}
      <Rect x="38" y="72" width="68" height="88" rx="12" fill="#fff" stroke={colors.border} strokeWidth={1.5} />
      <Circle cx="72" cy="100" r="14" fill={colors.secondary} />
      <Path
        d="M66 100h12M72 94v12"
        stroke={colors.terracotta}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Rect x="50" y="124" width="44" height="6" rx="3" fill={colors.mandala} />
      <Rect x="50" y="136" width="32" height="5" rx="2.5" fill={colors.border} />
      <Rect x="50" y="146" width="38" height="5" rx="2.5" fill={colors.border} />

      {/* Right path card — highlighted */}
      <Rect
        x="134"
        y="64"
        width="72"
        height="96"
        rx="12"
        fill="#fff"
        stroke={colors.terracotta}
        strokeWidth={2}
      />
      <Circle cx="170" cy="96" r="16" fill={colors.gold} opacity={0.35} />
      <Path
        d="M162 96l5 5 11-12"
        stroke={colors.terracottaDark}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="148" y="122" width="44" height="6" rx="3" fill={colors.terracotta} opacity={0.35} />
      <Rect x="148" y="134" width="36" height="5" rx="2.5" fill={colors.gold} opacity={0.55} />
      <Rect x="148" y="144" width="40" height="5" rx="2.5" fill={colors.border} />

      {/* Sparkle accents */}
      <Path
        d="M112 52l2.5 6.5L121 61l-6.5 2.5L112 70l-2.5-6.5L103 61l6.5-2.5L112 52z"
        fill={colors.gold}
      />
      <Circle cx="48" cy="58" r="3" fill={colors.flame} opacity={0.7} />
      <Circle cx="196" cy="170" r="4" fill={colors.terracotta} opacity={0.4} />
    </Svg>
  );
}
