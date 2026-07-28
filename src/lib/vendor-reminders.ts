import { isRunningInExpoGo } from "expo";
import { Linking, Platform } from "react-native";
import * as Device from "expo-device";
import { requestAppConfirm } from "../components/ConfirmSheet";
import type { Vendor } from "../types/wedding";
import { formatINR } from "./format";

/**
 * Expo Go (SDK 53+) does not support expo-notifications fully and logs ERROR/WARN on import.
 * Skip the module entirely there; reminders work in a development / production build.
 */
const notificationsAvailable = !isRunningInExpoGo();

type NotificationsModule = typeof import("expo-notifications");

let notificationsPromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsAvailable) return null;
  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications").then((Notifications) => {
      if (!handlerConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        handlerConfigured = true;
      }
      return Notifications;
    });
  }
  return notificationsPromise;
}

function reminderId(vendorId: string): string {
  return `vendor-payment-${vendorId}`;
}

function subDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

/** Parse YYYY-MM-DD as local morning to avoid timezone edge cases. */
function parseDueDateLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d, 9, 0, 0, 0);
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  if (!Device.isDevice) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  if (current.status === "denied" && !current.canAskAgain) {
    requestAppConfirm({
      title: "Notifications disabled",
      message: "Enable notifications in Settings to get reminded before vendor payments are due.",
      cancelLabel: "Not now",
      confirmLabel: "Open Settings",
      onConfirm: () => void Linking.openSettings(),
    });
    return false;
  }

  return await new Promise<boolean>((resolve) => {
    requestAppConfirm({
      title: "Payment reminders",
      message:
        "Get reminded before vendor payments are due — we'll notify you one day ahead.",
      cancelLabel: "Not now",
      onCancel: () => resolve(false),
      confirmLabel: "Allow",
      onConfirm: () => {
        void Notifications.requestPermissionsAsync().then((result) => {
          resolve(result.granted);
        });
      },
    });
  });
}

export async function cancelVendorReminder(vendorId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId(vendorId));
  } catch {
    // Already cancelled or never scheduled
  }
}

export async function scheduleVendorReminder(vendor: Vendor): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await cancelVendorReminder(vendor.id);

  if (vendor.status === "Paid") return;
  if (!vendor.dueDate) return;

  const balance = vendor.totalCost - vendor.advancePaid;
  if (balance <= 0) return;

  const due = parseDueDateLocal(vendor.dueDate);
  const triggerDate = subDays(due, 1);
  if (triggerDate.getTime() <= Date.now()) return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("vendor-payments", {
      name: "Vendor payments",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(vendor.id),
    content: {
      title: "Payment due tomorrow",
      body: `${vendor.name} — ${formatINR(balance)} due ${vendor.dueDate}`,
      data: { vendorId: vendor.id },
      ...(Platform.OS === "android" ? { channelId: "vendor-payments" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

/** Reschedule all unpaid vendors with future due dates (e.g. after fetch). */
export async function syncVendorReminders(vendors: Vendor[]): Promise<void> {
  if (!notificationsAvailable) return;
  for (const vendor of vendors) {
    if (vendor.status === "Paid" || vendor.totalCost - vendor.advancePaid <= 0) {
      await cancelVendorReminder(vendor.id);
    } else if (vendor.dueDate) {
      await scheduleVendorReminder(vendor);
    }
  }
}
