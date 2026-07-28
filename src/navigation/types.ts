import type { PlanAnswers } from "../lib/suggestion-engine";
import type { OnboardingBasics } from "../lib/onboarding-api";

export type AuthStackParamList = {
  Login: undefined;
};

export type OnboardingStackParamList = {
  Basics: undefined;
  Path: { basics: OnboardingBasics };
  Questionnaire: { basics: OnboardingBasics };
  Review: { basics: OnboardingBasics; answers: PlanAnswers };
};

export type MainTabParamList = {
  Home: undefined;
  Vendors: undefined;
  Guests: undefined;
  Checklist: undefined;
  Wallet: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Invite: { guestId?: string; groupId?: string };
  Collaborators: undefined;
  Songs: undefined;
  Outfits: undefined;
  EmergencyContacts: undefined;
  RunSheet: undefined;
  PhotoAlbum: undefined;
  Gifts: undefined;
};
