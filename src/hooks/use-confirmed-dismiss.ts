import { useCallback, useState } from "react";

/**
 * Dirty-check gate for bottom sheet dismiss (backdrop, swipe, Android back).
 * Shows an inline confirm when the form has unsaved changes.
 */
export function useConfirmedDismiss(isDirty: boolean, onDismiss: () => void) {
  const [showConfirm, setShowConfirm] = useState(false);

  const attemptDismiss = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onDismiss();
    }
  }, [isDirty, onDismiss]);

  const confirmDiscard = useCallback(() => {
    setShowConfirm(false);
    onDismiss();
  }, [onDismiss]);

  const cancelDismiss = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return { attemptDismiss, showConfirm, confirmDiscard, cancelDismiss };
}
