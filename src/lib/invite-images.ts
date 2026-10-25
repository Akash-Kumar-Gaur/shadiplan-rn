import type { ImageSourcePropType } from "react-native";

export const INVITE_IMAGES: ImageSourcePropType[] = [
  require("../../assets/invite/Wedding-amico.png"),
  require("../../assets/invite/Wedding-rafiki.png"),
  require("../../assets/invite/Wedding-cuate.png"),
  require("../../assets/invite/Beach-wedding-cuate.png"),
  require("../../assets/invite/Honeymoon-pana.png"),
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Stable per seed (guest id, group id, or invite id) — same invite always gets the same image. */
export function pickInviteImage(seed?: string): ImageSourcePropType {
  const index = seed
    ? Math.abs(hashString(seed)) % INVITE_IMAGES.length
    : Math.floor(Math.random() * INVITE_IMAGES.length);
  return INVITE_IMAGES[index];
}
