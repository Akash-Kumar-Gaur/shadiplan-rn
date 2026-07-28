import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme/tokens";
import { AppPressable } from "./AppPressable";

export type ConfirmRequest = {
  title: string;
  message?: string;
  /** Defaults to "Confirm". Use "OK" for info-only. */
  confirmLabel?: string;
  /** Omit or empty to hide cancel (info-only). Defaults to "Cancel" when onConfirm is set. */
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  /** Optional middle action (e.g. "Book only" with a destructive primary). */
  middleAction?: {
    label: string;
    onPress: () => void;
  };
};

type ConfirmContextValue = {
  requestConfirm: (request: ConfirmRequest) => void;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/** Imperative bridge for non-React modules (push, reminders). */
let imperativeConfirm: ((request: ConfirmRequest) => void) | null = null;

export function requestAppConfirm(request: ConfirmRequest): void {
  if (imperativeConfirm) {
    imperativeConfirm(request);
    return;
  }
  // Fallback only if provider not mounted yet — should be rare.
  console.warn("[Confirm] ConfirmProvider not mounted; dropping:", request.title);
}

/** Info / error toast-style dialog (single OK). */
export function showAppAlert(title: string, message?: string): void {
  requestAppConfirm({
    title,
    message,
    confirmLabel: "OK",
    cancelLabel: "",
  });
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const requestRef = useRef(request);
  requestRef.current = request;

  const requestConfirm = useCallback((next: ConfirmRequest) => {
    setRequest(next);
  }, []);

  useEffect(() => {
    imperativeConfirm = requestConfirm;
    return () => {
      if (imperativeConfirm === requestConfirm) imperativeConfirm = null;
    };
  }, [requestConfirm]);

  const dismiss = useCallback(() => setRequest(null), []);

  const handleCancel = useCallback(() => {
    const current = requestRef.current;
    dismiss();
    current?.onCancel?.();
  }, [dismiss]);

  const handleConfirm = useCallback(() => {
    const current = requestRef.current;
    dismiss();
    current?.onConfirm?.();
  }, [dismiss]);

  const value = useMemo(() => ({ requestConfirm }), [requestConfirm]);

  const showCancel = Boolean(request?.cancelLabel !== "" && (request?.onConfirm || request?.cancelLabel));
  // Info-only: no onConfirm and cancelLabel === "" → only OK
  const isInfoOnly = request != null && !request.onConfirm && request.cancelLabel === "";
  const hasMiddle = Boolean(request?.middleAction);

  const handleMiddle = useCallback(() => {
    const current = requestRef.current;
    dismiss();
    current?.middleAction?.onPress();
  }, [dismiss]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        visible={request != null}
        transparent
        animationType="fade"
        onRequestClose={isInfoOnly ? handleConfirm : handleCancel}
      >
        <Pressable style={styles.backdrop} onPress={isInfoOnly ? handleConfirm : handleCancel}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {request ? (
              <>
                <Text style={styles.title}>{request.title}</Text>
                {request.message ? <Text style={styles.body}>{request.message}</Text> : null}
                <View style={[styles.actions, hasMiddle && styles.actionsStacked]}>
                  {!isInfoOnly && showCancel !== false && request.cancelLabel !== "" ? (
                    <AppPressable
                      onPress={handleCancel}
                      style={[styles.cancelBtn, hasMiddle && styles.actionFull]}
                    >
                      <Text style={styles.cancelText}>{request.cancelLabel ?? "Cancel"}</Text>
                    </AppPressable>
                  ) : null}
                  {hasMiddle ? (
                    <AppPressable onPress={handleMiddle} style={[styles.middleBtn, styles.actionFull]}>
                      <Text style={styles.middleText}>{request.middleAction!.label}</Text>
                    </AppPressable>
                  ) : null}
                  <AppPressable
                    onPress={handleConfirm}
                    style={[
                      styles.confirmBtn,
                      request.destructive && styles.confirmBtnDestructive,
                      (isInfoOnly || request.cancelLabel === "") && !hasMiddle && styles.confirmBtnFull,
                      hasMiddle && styles.actionFull,
                    ]}
                  >
                    <Text
                      style={[
                        styles.confirmText,
                        request.destructive && styles.confirmTextOnDestructive,
                      ]}
                    >
                      {request.confirmLabel ?? (request.onConfirm ? "Confirm" : "OK")}
                    </Text>
                  </AppPressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirmAction() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirmAction must be used within ConfirmProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(60, 51, 44, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.ivory,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    color: colors.foreground,
  },
  body: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  actionsStacked: {
    flexDirection: "column",
  },
  actionFull: {
    flex: undefined,
    width: "100%",
  },
  middleBtn: {
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  middleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.terracottaDark,
  },
  confirmBtnFull: {
    flex: 1,
  },
  confirmBtnDestructive: {
    backgroundColor: colors.destructive,
  },
  confirmText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "#fff",
  },
  confirmTextOnDestructive: {
    color: "#fff",
  },
});
