import { Platform } from "react-native";
import {
  configureFonts,
  MD3DarkTheme,
  MD3LightTheme,
} from "react-native-paper";
import { AppTheme } from "./types/types";

const fontConfig = {
  fontFamily: Platform.select({
    android: "HappyMonkey_400Regular",
    ios: "HappyMonkey-Regular",
    default: "HappyMonkey_400Regular",
  }),
};

const fonts = configureFonts({ config: fontConfig });

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#E94057",
    onPrimary: "#FFFFFF",
    secondary: "#FDECEF",
    background: "#ffecec",
    onSurfaceVariant: "#575757",
    outline: "#fd5f74",
    dropdownBackgroundColor: "#fff",
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#E94057",
    onPrimary: "#FFFFFF",
    secondary: "#FDECEF",
    background: "#010a11",
    outline: "#E94057",
    dropdownBackgroundColor: "#031320",
  },
};
