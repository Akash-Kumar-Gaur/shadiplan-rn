import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  type SvgProps,
} from "react-native-svg";
import { colors } from "../../theme/tokens";

/** Guests — celebration / guest list scene. Brand terracotta + gold. */
export function Slide3Illustration(props: SvgProps) {
  return (
    <Svg viewBox="0 0 240 240" width={240} height={240} fill="none" {...props}>
      <Circle cx="120" cy="120" r="100" fill={colors.cream} />
      <Ellipse cx="120" cy="200" rx="74" ry="10" fill={colors.mandala} opacity={0.55} />

      {/* Guest list card */}
      <Rect
        x="52"
        y="56"
        width="136"
        height="128"
        rx="14"
        fill="#fff"
        stroke={colors.border}
        strokeWidth={1.5}
      />
      <Rect x="68" y="72" width="70" height="8" rx="4" fill={colors.terracotta} opacity={0.35} />
      <Rect x="68" y="86" width="48" height="5" rx="2.5" fill={colors.border} />

      {/* Avatar rows */}
      <Circle cx="78" cy="118" r="12" fill={colors.gold} opacity={0.55} />
      <Circle cx="78" cy="114" r="5" fill={colors.terracottaDark} opacity={0.5} />
      <Path
        d="M68 128c2-6 6-9 10-9s8 3 10 9"
        fill={colors.terracotta}
        opacity={0.45}
      />
      <Rect x="98" y="112" width="54" height="6" rx="3" fill={colors.mandala} />
      <Rect x="98" y="122" width="36" height="5" rx="2.5" fill={colors.border} />

      <Circle cx="78" cy="158" r="12" fill={colors.secondary} />
      <Circle cx="78" cy="154" r="5" fill={colors.terracotta} opacity={0.55} />
      <Path
        d="M68 168c2-6 6-9 10-9s8 3 10 9"
        fill={colors.terracottaDark}
        opacity={0.4}
      />
      <Rect x="98" y="152" width="48" height="6" rx="3" fill={colors.mandala} />
      <Rect x="98" y="162" width="40" height="5" rx="2.5" fill={colors.border} />

      {/* Check badge */}
      <Circle cx="168" cy="120" r="16" fill={colors.success} opacity={0.15} />
      <Circle cx="168" cy="120" r="12" fill={colors.success} />
      <Path
        d="M162 120l4 4 8-9"
        stroke="#fff"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Confetti */}
      <Rect x="42" y="48" width="6" height="10" rx="2" fill={colors.gold} />
      <Rect x="190" y="64" width="5" height="9" rx="2" fill={colors.terracotta} />
      <Circle cx="200" cy="150" r="3.5" fill={colors.flame} />
      <Circle cx="46" cy="170" r="3" fill={colors.gold} />
      <Path
        d="M186 44l2 5.5L194 52l-6 2L186 60l-2-6L178 52l6-2.5L186 44z"
        fill={colors.gold}
      />
    </Svg>
  );
}
