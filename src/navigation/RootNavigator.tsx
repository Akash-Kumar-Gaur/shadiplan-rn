import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WeddingLoader } from "../components/WeddingLoader";
import { AppPressable } from "../components/AppPressable";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { useAuth } from "../lib/auth";
import { CollaboratorsScreen } from "../screens/CollaboratorsScreen";
import { EmergencyContactsScreen } from "../screens/EmergencyContactsScreen";
import { GiftsScreen } from "../screens/GiftsScreen";
import { InviteScreen } from "../screens/InviteScreen";
import { OutfitsScreen } from "../screens/OutfitsScreen";
import { PhotoAlbumScreen } from "../screens/PhotoAlbumScreen";
import { RunSheetScreen } from "../screens/RunSheetScreen";
import { SongsScreen } from "../screens/SongsScreen";
import { colors, fonts } from "../theme/tokens";
import { AuthStack } from "./AuthStack";
import { MainDrawer } from "./MainDrawer";
import { OnboardingStack } from "./OnboardingStack";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthenticatedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainDrawer} />
      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="Collaborators" component={CollaboratorsScreen} />
      <Stack.Screen name="Songs" component={SongsScreen} />
      <Stack.Screen name="Outfits" component={OutfitsScreen} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <Stack.Screen name="RunSheet" component={RunSheetScreen} />
      <Stack.Screen name="PhotoAlbum" component={PhotoAlbumScreen} />
      <Stack.Screen name="Gifts" component={GiftsScreen} />
    </Stack.Navigator>
  );
}

/** Routes new users (no owned/collaborator wedding) into native onboarding. */
function AuthenticatedGate() {
  const { data: wedding, isPending, isError, error, refetch, isFetching } = useWeddingMeta();

  if (isPending) {
    return <WeddingLoader />;
  }

  if (isError) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>Couldn&apos;t load your wedding</Text>
        <Text style={styles.errorBody}>
          {error instanceof Error ? error.message : "Check your connection and try again."}
        </Text>
        <AppPressable onPress={() => void refetch()} style={styles.retryBtn}>
          {isFetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.retryText}>Try again</Text>
          )}
        </AppPressable>
      </View>
    );
  }

  if (!wedding) {
    return <OnboardingStack />;
  }

  return <AuthenticatedStack />;
}

export function RootNavigator() {
  const { status } = useAuth();

  return (
    <NavigationContainer>
      {status === "authenticated" ? <AuthenticatedGate /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    backgroundColor: colors.ivory,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontFamily: fonts.headingMedium,
    fontSize: 22,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  errorBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    minWidth: 140,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primaryForeground,
  },
});
