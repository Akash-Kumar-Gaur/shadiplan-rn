export const INVITE_WIDTH = 1080;

export interface InviteCardDimensions {
  width: number;
  height: number;
}

/** Dynamic height: more events → taller card (same formula as web). Fonts stay fixed. */
export function getCardDimensions(eventCount: number): InviteCardDimensions {
  const baseHeight = 1160;
  const heightPerExtraEvent = 110;
  const extraEvents = Math.max(0, eventCount - 3);
  return {
    width: INVITE_WIDTH,
    height: baseHeight + extraEvents * heightPerExtraEvent,
  };
}
