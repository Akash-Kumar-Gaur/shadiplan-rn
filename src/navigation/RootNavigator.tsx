import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth";
import { CollaboratorsScreen } from "../screens/CollaboratorsScreen";
import { EmergencyContactsScreen } from "../screens/EmergencyContactsScreen";
import { GiftsScreen } from "../screens/GiftsScreen";
import { InviteScreen } from "../screens/InviteScreen";
import { OutfitsScreen } from "../screens/OutfitsScreen";
import { PhotoAlbumScreen } from "../screens/PhotoAlbumScreen";
import { RunSheetScreen } from "../screens/RunSheetScreen";
import { SongsScreen } from "../screens/SongsScreen";
import { AuthStack } from "./AuthStack";
import { MainDrawer } from "./MainDrawer";
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

export function RootNavigator() {
  const { status } = useAuth();

  return (
    <NavigationContainer>
      {status === "authenticated" ? <AuthenticatedStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
