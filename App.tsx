import "./global.css";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { queryClient } from "./src/lib/query-client";
import { shouldShowIntro } from "./src/lib/intro-storage";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { WeddingLoader } from "./src/components/WeddingLoader";
import { AmountsHiddenProvider } from "./src/components/AmountText";
import { ConfirmProvider } from "./src/components/ConfirmSheet";
import { IntroCarousel } from "./src/screens/IntroCarousel";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh.
});

function AppContent() {
  const { status } = useAuth();
  const [introReady, setIntroReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const show = await shouldShowIntro();
        if (!cancelled) setShowIntro(show);
      } finally {
        if (!cancelled) {
          setIntroReady(true);
          void SplashScreen.hideAsync();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading" || !introReady) {
    return <WeddingLoader />;
  }

  // First launch only — before Login.
  if (showIntro && status === "unauthenticated") {
    return <IntroCarousel onDone={() => setShowIntro(false)} />;
  }

  return <RootNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_400Regular,
    "Fraunces-Medium": Fraunces_500Medium,
    "Fraunces-SemiBold": Fraunces_600SemiBold,
    Inter: Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AmountsHiddenProvider>
              <ConfirmProvider>
                <BottomSheetModalProvider>
                  <AppContent />
                  <StatusBar style="auto" />
                </BottomSheetModalProvider>
              </ConfirmProvider>
            </AmountsHiddenProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
