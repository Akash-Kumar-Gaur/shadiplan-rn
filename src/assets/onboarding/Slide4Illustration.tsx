import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  type SvgProps,
} from "react-native-svg";
import { colors } from "../../theme/tokens";

/** Invites — envelope / invitation scene. Brand terracotta + gold. */
export function Slide4Illustration(props: SvgProps) {
  return (
    <Svg viewBox="0 0 240 240" width={240} height={240} fill="none" {...props}>
      <Circle cx="120" cy="120" r="100" fill={colors.cream} />
      <Ellipse cx="120" cy="200" rx="72" ry="10" fill={colors.mandala} opacity={0.55} />

      {/* Back envelope flap shadow */}
      <Path
        d="M48 92l72-36 72 36v68c0 8-6 14-14 14H62c-8 0-14-6-14-14V92z"
        fill={colors.secondary}
      />

      {/* Envelope body */}
      <Path
        d="M52 100h136v72c0 8-6 14-14 14H66c-8 0-14-6-14-14v-72z"
        fill="#fff"
        stroke={colors.border}
        strokeWidth={1.5}
      />

      {/* Open flap */}
      <Path
        d="M52 100l68 44 68-44"
        fill={colors.cream}
        stroke={colors.terracotta}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M52 100l68-34 68 34"
        fill={colors.secondary}
        stroke={colors.border}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Invitation card peeking out */}
      <Rect
        x="78"
        y="58"
        width="84"
        height="70"
        rx="6"
        fill="#fff"
        stroke={colors.gold}
        strokeWidth={1.75}
      />
      <Rect x="94" y="74" width="52" height="6" rx="3" fill={colors.terracotta} opacity={0.45} />
      <Rect x="102" y="88" width="36" height="4" rx="2" fill={colors.mandala} />
      <Rect x="98" y="98" width="44" height="4" rx="2" fill={colors.border} />
      <Circle cx="120" cy="114" r="6" fill={colors.gold} opacity={0.7} />
      <Path
        d="M120 110c2 2.5 4 4 4 6.5 0 2-1.5 3.5-4 3.5s-4-1.5-4-3.5c0-2.5 2-4 4-6.5z"
        fill={colors.terracottaDark}
      />

      {/* Wax seal */}
      <Circle cx="120" cy="148" r="14" fill={colors.terracottaDark} />
      <Circle cx="120" cy="148" r="9" fill={colors.terracotta} />
      <Path
        d="M120 143v10M115 148h10"
        stroke={colors.gold}
        strokeWidth={1.75}
        strokeLinecap="round"
      />

      {/* Accents */}
      <Circle cx="44" cy="70" r="4" fill={colors.gold} opacity={0.7} />
      <Circle cx="196" cy="168" r="3.5" fill={colors.flame} opacity={0.65} />
      <Path
        d="M188 56l2.2 5.8L196 64l-5.8 2.2L188 72l-2.2-5.8L180 64l5.8-2.2L188 56z"
        fill={colors.gold}
      />
    </Svg>
  );
}
