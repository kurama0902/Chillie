import { StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

export const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      gap: 28,
    },
    title: {
      fontSize: 34,
      fontWeight: "700",
      color: theme.colors.onSurface,
      marginBottom: 4,
    },

    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    fieldInput: {
      flex: 1,
    },

    dobRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dobInput: {
      flex: 1,
    },

    readonlyInput: {
      backgroundColor: theme.dark ? "#2A2A2A" : "#ECECEC",
    },

    section: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    profileImagesFooter: {
      gap: 8,
    },
    profileImagesCount: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "right",
    },

    applyBtn: {
      marginTop: 4,
      borderRadius: 12,
    },
    applyLabel: {
      fontSize: 18,
      lineHeight: 24,
    },

    logoutBtn: {
      borderRadius: 12,
      borderColor: theme.colors.error,
    },
    logoutLabel: {
      fontSize: 18,
      lineHeight: 24,
      color: theme.colors.error,
    },

    pickerModal: {
      backgroundColor: theme.colors.dropdownBackgroundColor,
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 12,
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    pickerCloseBtn: {
      margin: 0,
    },
  });
