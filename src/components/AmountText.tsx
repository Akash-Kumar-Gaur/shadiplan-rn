import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { formatINR } from "../lib/format";

const STORAGE_KEY = "shadiplan.amountsHidden";

type AmountsHiddenContextValue = {
  amountsHidden: boolean;
  setAmountsHidden: (hidden: boolean) => void;
  toggleAmountsHidden: () => void;
  ready: boolean;
};

const AmountsHiddenContext = createContext<AmountsHiddenContextValue | null>(null);

export function AmountsHiddenProvider({ children }: { children: ReactNode }) {
  const [amountsHidden, setAmountsHiddenState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (cancelled) return;
      setAmountsHiddenState(value === "1");
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAmountsHidden = useCallback((hidden: boolean) => {
    setAmountsHiddenState(hidden);
    void AsyncStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
  }, []);

  const toggleAmountsHidden = useCallback(() => {
    setAmountsHiddenState((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ amountsHidden, setAmountsHidden, toggleAmountsHidden, ready }),
    [amountsHidden, setAmountsHidden, toggleAmountsHidden, ready],
  );

  return (
    <AmountsHiddenContext.Provider value={value}>{children}</AmountsHiddenContext.Provider>
  );
}

export function useAmountsHiddenPreference(): AmountsHiddenContextValue {
  const ctx = useContext(AmountsHiddenContext);
  if (!ctx) {
    throw new Error("useAmountsHiddenPreference must be used within AmountsHiddenProvider");
  }
  return ctx;
}

type AmountTextProps = {
  value: number;
  style?: StyleProp<TextStyle>;
};

/** Masks monetary figures when the hide-amounts preference is on. */
export function AmountText({ value, style }: AmountTextProps) {
  const { amountsHidden } = useAmountsHiddenPreference();
  return <Text style={style}>{amountsHidden ? "••••••" : formatINR(value)}</Text>;
}
