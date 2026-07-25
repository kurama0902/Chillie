import { StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

export const TAB_CONTENT_HEIGHT = 62;

export const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: theme.colors.dropdownBackgroundColor,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline,
      elevation: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },

    item: {
      flex: 1,
      height: TAB_CONTENT_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },

    iconStack: {
      alignItems: "center",
      justifyContent: "center",
    },

    iconLayer: {
      position: "absolute",
    },

    indicator: {
      position: "absolute",
      top: 0,
      height: 3,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
  });
