import {
  createDrawerNavigator,
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import {
  Camera,
  ClipboardList,
  Eye,
  EyeOff,
  Gift,
  LogOut,
  Music,
  Phone,
  Shirt,
  UserPlus,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPressable } from "../components/AppPressable";
import { requestAppConfirm } from "../components/ConfirmSheet";
import { useAmountsHiddenPreference } from "../components/AmountText";
import { useWeddingMeta } from "../hooks/use-wedding-meta";
import { useAuth } from "../lib/auth";
import { colors, fonts } from "../theme/tokens";
import type { RootStackParamList } from "./types";
import { MainTabs } from "./MainTabs";

const Drawer = createDrawerNavigator();

type DrawerRow = {
  key: string;
  label: string;
  icon: typeof Music;
  route: keyof RootStackParamList;
};

const FEATURE_ROWS: DrawerRow[] = [
  { key: "collaborators", label: "Collaborators", icon: UserPlus, route: "Collaborators" },
  { key: "songs", label: "Songs", icon: Music, route: "Songs" },
  { key: "outfits", label: "Outfit Planner", icon: Shirt, route: "Outfits" },
  { key: "contacts", label: "Emergency Contacts", icon: Phone, route: "EmergencyContacts" },
  { key: "run-sheet", label: "Day-of Run Sheet", icon: ClipboardList, route: "RunSheet" },
  { key: "album", label: "Photo Album", icon: Camera, route: "PhotoAlbum" },
  { key: "gifts", label: "Gift Tracker", icon: Gift, route: "Gifts" },
];

function ProfileDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { data: wedding } = useWeddingMeta();
  const { amountsHidden, toggleAmountsHidden } = useAmountsHiddenPreference();

  const close = () => props.navigation.closeDrawer();

  const openRoute = (route: keyof RootStackParamList) => {
    close();
    props.navigation.getParent()?.navigate(route as never);
  };

  const handleSignOut = () => {
    requestAppConfirm({
      title: "Sign out",
      message: "Sign out of ShadiPlan?",
      confirmLabel: "Sign out",
      destructive: true,
      onConfirm: () => {
        close();
        void signOut();
      },
    });
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.drawerScroll, { paddingTop: insets.top + 8 }]}
      style={styles.drawer}
    >
      <View style={styles.header}>
        <Text style={styles.couple} numberOfLines={2}>
          {wedding?.coupleNames || "Your wedding"}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user?.email ?? ""}
        </Text>
      </View>

      <View style={styles.list}>
        {FEATURE_ROWS.map((row) => {
          const Icon = row.icon;
          return (
            <AppPressable
              key={row.key}
              onPress={() => openRoute(row.route)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={row.label}
            >
              <Icon size={18} color={colors.foreground} />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </AppPressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <AppPressable
          onPress={toggleAmountsHidden}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={amountsHidden ? "Show amounts" : "Hide amounts"}
        >
          {amountsHidden ? (
            <EyeOff size={18} color={colors.foreground} />
          ) : (
            <Eye size={18} color={colors.foreground} />
          )}
          <Text style={styles.rowLabel}>
            {amountsHidden ? "Show amounts" : "Hide amounts"}
          </Text>
        </AppPressable>
        <AppPressable
          onPress={handleSignOut}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <LogOut size={18} color={colors.destructive} />
          <Text style={[styles.rowLabel, styles.signOutLabel]}>Sign Out</Text>
        </AppPressable>
      </View>
    </DrawerContentScrollView>
  );
}

export function MainDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(60, 51, 44, 0.35)",
        drawerStyle: {
          width: 280,
          backgroundColor: colors.ivory,
        },
        swipeEnabled: true,
      }}
      drawerContent={(props) => <ProfileDrawerContent {...props} />}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.ivory,
  },
  drawerScroll: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  couple: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  email: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  list: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  rowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
    paddingBottom: 12,
  },
  signOutLabel: {
    color: colors.destructive,
  },
});
