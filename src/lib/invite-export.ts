export const INVITE_WIDTH = 1080;

export interface InviteCardDimensions {
  width: number;
  height: number;
}

/** Dynamic height: more events → taller card (same formula as web). Fonts stay fixed. */
export function getCardDimensions(eventCount: number): InviteCardDimensions {
  // Extra room for the Storyset illustration above the couple names.
  const baseHeight = 1380;
  const heightPerExtraEvent = 110;
  const extraEvents = Math.max(0, eventCount - 3);
  return {
    width: INVITE_WIDTH,
    height: baseHeight + extraEvents * heightPerExtraEvent,
  };
}
