import { MD3Theme } from "react-native-paper";
import { MD3Colors } from "react-native-paper/lib/typescript/types";

export type User = {
  name: string;
  lastname: string;
  avatar_url: string,
  email: string;
  date_of_birth: string;
  profileDescription: string;
  profile_photos: string[];
  sexualOrientation: string[];
  interests: string[];
  languages: string[];
  location: UserLocation;
  preferableLocation: string[];
  isNew: boolean
};

export type UserState = Partial<User> | null;

export type UserLocation = {
  lat: number | string;
  lng: number | string;
  city: string;
  country: string;
};

export type AppTheme = MD3Theme & {
  colors: MD3Colors & {
    dropdownBackgroundColor: string
  }
}

export type MatchUser = {
  userID: string;
  name: string;
  lastname: string;
  age: string;
  job: string;
  image_url: string;
  additionalProfileImageUrls: string[];
  description: string;
  city: string;
  distance: string;
  hobbies: string[];
};

export type InterestedIn = "men" | "women" | "both";

export type Filters = {
  interestedIn: InterestedIn;
  cities: string[];
  hobbies: string[];
  languages: string[];
  orientations: string[];
  distance: number;
  ageRange: [number, number];
};

export const DEFAULT_FILTERS: Filters = {
  interestedIn: "both",
  cities: [],
  hobbies: [],
  languages: [],
  orientations: [],
  distance: 40,
  ageRange: [20, 28],
};

export type ChatItem =  {
  id: string;
  image_url: string;
  lastMessage: {
    text: string;
    date: string;
  };
  name: string;
  lastname?: string;
  newMessagesQuant: number;
};

export type ChatPage = {
  items: ChatItem[];
  nextCursor: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName?: string;
  };
};

export type ChatMessagesPage = {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore?: boolean;
};
