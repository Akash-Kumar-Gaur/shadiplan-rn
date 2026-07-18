export type AuthStackParamList = {
  Login: undefined;
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
