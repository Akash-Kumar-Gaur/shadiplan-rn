import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Alert, Linking, Platform } from "react-native";
import { isSupabaseConfigured, supabase } from "./supabase";

/**
 * Expo Go (SDK 53+) does not support remote push fully.
 * Registration runs in development / production builds only.
 */
const pushAvailable = !isRunningInExpoGo();

type NotificationsModule = typeof import("expo-notifications");

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let deniedSettingsPrompted = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!pushAvailable) return null;
  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications").then((m) => m);
  }
  return notificationsPromise;
}

function easProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

function promptOpenSettingsOnce() {
  if (deniedSettingsPrompted) return;
  deniedSettingsPrompted = true;
  Alert.alert(
    "Notifications disabled",
    "ShadiPlan needs notification permission to receive broadcasts. Enable it in system settings.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Open Settings", onPress: () => void Linking.openSettings() },
    ],
  );
}

/**
 * Request permission (if needed), fetch the Expo push token, and upsert into
 * device_push_tokens so broadcasts can reach this device.
 */
let registerInFlight: Promise<string | null> | null = null;

export async function registerDevicePushToken(userId: string): Promise<string | null> {
  console.log("[PUSH] registerPushToken called", { userId: userId.slice(0, 8) });

  if (!isSupabaseConfigured || !userId) {
    console.log("[PUSH] STOP: supabase/userId missing");
    return null;
  }
  if (registerInFlight) {
    console.log("[PUSH] early exit: already in flight");
    return registerInFlight;
  }

  registerInFlight = (async () => {
    if (!pushAvailable) {
      console.log("[PUSH] STOP: Expo Go — use a dev/production EAS build");
      return null;
    }

    const Notifications = await getNotifications();
    if (!Notifications) {
      console.log("[PUSH] STOP: notifications module unavailable");
      return null;
    }

    if (!Device.isDevice) {
      console.log("[PUSH] STOP: not a physical device");
      return null;
    }

    const current = await Notifications.getPermissionsAsync();
    console.log("[PUSH] permission status:", current.status, "granted:", current.granted);

    let granted = current.granted;
    if (!granted) {
      if (current.status === "denied" && current.canAskAgain === false) {
        console.log("[PUSH] STOP: previously denied — enable in Settings or reinstall");
        promptOpenSettingsOnce();
        return null;
      }
      const requested = await Notifications.requestPermissionsAsync();
      console.log("[PUSH] requestPermissionsAsync:", requested.status, requested.granted);
      granted = requested.granted;
    }

    if (!granted) {
      console.log("[PUSH] STOP: permission not granted");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = easProjectId();
    console.log("[PUSH] projectId for getExpoPushTokenAsync:", projectId);
    if (!projectId) {
      console.log("[PUSH] STOP: missing EAS projectId");
      return null;
    }

    let pushToken: string;
    try {
      const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
      pushToken = tokenResult.data;
      console.log("[PUSH] got token:", pushToken);
    } catch (err) {
      console.log("[PUSH] getExpoPushTokenAsync FAILED:", err);
      return null;
    }
    if (!pushToken) {
      console.log("[PUSH] STOP: empty token from getExpoPushTokenAsync");
      return null;
    }

    // Use the live session user id — avoids RLS reject if the passed id is stale.
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUserId = sessionData.session?.user?.id ?? null;
    console.log("[PUSH] session user vs passed user:", {
      sessionUserId: sessionUserId?.slice(0, 8) ?? null,
      passedUserId: userId.slice(0, 8),
      match: sessionUserId === userId,
      hasAccessToken: Boolean(sessionData.session?.access_token),
    });

    if (!sessionUserId) {
      console.log("[PUSH] STOP: no live session — auth.uid() would be null, RLS would block");
      return null;
    }

    const { data, error } = await supabase
      .from("device_push_tokens")
      .upsert(
        {
          user_id: sessionUserId,
          push_token: pushToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "push_token" },
      )
      .select("id, user_id, push_token, updated_at")
      .maybeSingle();

    console.log("[PUSH] upsert result:", {
      data,
      error: error
        ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
        : null,
    });

    if (error) return null;

    console.log("[PUSH] SUCCESS — token saved");
    return pushToken;
  })().finally(() => {
    registerInFlight = null;
  });

  return registerInFlight;
}

/** Alias used by auth wiring / docs. */
export const registerPushToken = registerDevicePushToken;
