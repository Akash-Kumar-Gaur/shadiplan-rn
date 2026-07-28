import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  type SvgProps,
} from "react-native-svg";
import { colors } from "../../theme/tokens";

/** Vendors & budget — invoice / finance scene. Brand terracotta + gold. */
export function Slide2Illustration(props: SvgProps) {
  return (
    <Svg viewBox="0 0 240 240" width={240} height={240} fill="none" {...props}>
      <Circle cx="120" cy="120" r="100" fill={colors.cream} />
      <Ellipse cx="120" cy="200" rx="72" ry="10" fill={colors.mandala} opacity={0.55} />

      {/* Invoice card */}
      <Rect
        x="58"
        y="48"
        width="124"
        height="148"
        rx="14"
        fill="#fff"
        stroke={colors.border}
        strokeWidth={1.5}
      />
      <Rect x="58" y="48" width="124" height="28" rx="14" fill={colors.terracottaDark} />
      <Rect x="58" y="62" width="124" height="14" fill={colors.terracottaDark} />
      <Rect x="74" y="58" width="56" height="8" rx="4" fill={colors.gold} opacity={0.85} />

      {/* Line items */}
      <Rect x="74" y="92" width="72" height="7" rx="3.5" fill={colors.mandala} />
      <Rect x="154" y="92" width="12" height="7" rx="3.5" fill={colors.gold} />
      <Rect x="74" y="110" width="60" height="7" rx="3.5" fill={colors.border} />
      <Rect x="154" y="110" width="12" height="7" rx="3.5" fill={colors.terracotta} opacity={0.45} />
      <Rect x="74" y="128" width="66" height="7" rx="3.5" fill={colors.border} />
      <Rect x="154" y="128" width="12" height="7" rx="3.5" fill={colors.gold} opacity={0.7} />

      {/* Total bar */}
      <Rect x="74" y="154" width="92" height="22" rx="8" fill={colors.secondary} />
      <Rect x="84" y="161" width="40" height="8" rx="4" fill={colors.terracotta} opacity={0.5} />
      <Rect x="132" y="161" width="24" height="8" rx="4" fill={colors.terracottaDark} />

      {/* Coin accents */}
      <Circle cx="48" cy="150" r="18" fill={colors.gold} />
      <Circle cx="48" cy="150" r="12" fill="none" stroke={colors.flame} strokeWidth={2} />
      <Path
        d="M48 142v16M44 146h8c2 0 3.5 1.5 3.5 3.5S54 153 52 153h-8"
        stroke={colors.terracottaDark}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Circle cx="196" cy="88" r="12" fill={colors.gold} opacity={0.75} />
      <Circle cx="196" cy="88" r="7" fill="none" stroke={colors.flame} strokeWidth={1.5} />
    </Svg>
  );
}
