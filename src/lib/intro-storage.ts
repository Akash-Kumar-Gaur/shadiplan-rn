import AsyncStorage from "@react-native-async-storage/async-storage";

export const HAS_SEEN_INTRO_KEY = "has-seen-intro-carousel";

export async function shouldShowIntro(): Promise<boolean> {
  const seen = await AsyncStorage.getItem(HAS_SEEN_INTRO_KEY);
  return seen !== "true";
}

export async function markIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(HAS_SEEN_INTRO_KEY, "true");
}
