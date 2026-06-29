import { MD3Theme } from "react-native-paper";
import { MD3Colors } from "react-native-paper/lib/typescript/types";

export type User = {
  name: string;
  lastname: string;
  email: string;
  date_of_birth: string;
  profile_photos: string[];
  interests: string[];
  languages: string[];
  location: UserLocation | null;
  preferableLocation: string;
  accessToken: string | null;
  isNew: boolean
};

export type UserState = Partial<User> | null;

export type UserLocation = { lat: number; lng: number };

export type AppTheme = MD3Theme & {
  colors: MD3Colors & {
    dropdownBackgroundColor: string
  }
}
