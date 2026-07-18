import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  CheckSquare,
  Home,
  Store,
  Users,
  Wallet,
} from "lucide-react-native";
import { ChecklistScreen } from "../screens/ChecklistScreen";
import { GuestsScreen } from "../screens/GuestsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { VendorsScreen } from "../screens/VendorsScreen";
import { WalletScreen } from "../screens/WalletScreen";
import { colors, fonts } from "../theme/tokens";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICON_SIZE = 22;

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Home size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Vendors"
        component={VendorsScreen}
        options={{
          tabBarLabel: "Vendors",
          tabBarIcon: ({ color }) => <Store size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Guests"
        component={GuestsScreen}
        options={{
          tabBarLabel: "Guests",
          tabBarIcon: ({ color }) => <Users size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{
          tabBarLabel: "Checklist",
          tabBarIcon: ({ color }) => <CheckSquare size={TAB_ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: "Wallet",
          tabBarIcon: ({ color }) => <Wallet size={TAB_ICON_SIZE} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
