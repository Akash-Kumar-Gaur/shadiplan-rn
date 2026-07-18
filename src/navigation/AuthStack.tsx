import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/LoginScreen";
import type { AuthStackParamList } from "./types";

/** Native stack — UINavigationController / Fragment transitions (not JS stack). */
const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Unauthenticated flow starts on Login.
 * Cold-start loading is handled by AppContent's WeddingLoader while status === "loading",
 * so we must not remount into Splash after sign-out (that left users stuck on the loader
 * when navigation.replace("Login") did not run reliably on first paint).
 */
export function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
