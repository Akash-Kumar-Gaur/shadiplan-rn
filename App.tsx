import "./global.css";
import { useEffect } from "react";
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
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { queryClient } from "./src/lib/query-client";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { WeddingLoader } from "./src/components/WeddingLoader";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be hidden on fast refresh.
});

function AppContent() {
  const { status } = useAuth();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (status === "loading") {
    return <WeddingLoader />;
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
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AuthProvider>
              <AppContent />
              <StatusBar style="auto" />
            </AuthProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
