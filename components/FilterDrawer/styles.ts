import { StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

export const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    drawerAnimationShell: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2000,
    },
    drawer: {
      flexShrink: 1,
      paddingHorizontal: 20,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: theme.colors.dropdownBackgroundColor,
      gap: 18,
      elevation: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    dragArea: {
      marginHorizontal: -20,
      paddingTop: 10,
      paddingHorizontal: 20,
    },

    handle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.onSurfaceVariant,
      opacity: 0.4,
      marginBottom: 8,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerSide: {
      width: 64,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
    },
    clearBtnLabel: {
      color: theme.colors.primary,
      fontSize: 16,
    },

    section: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },

    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    valueText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 15,
    },

    slider: {
      width: "100%",
      height: 36,
    },

    scrollArea: {
      flexGrow: 0,
      flexShrink: 1,
      marginHorizontal: -20,
    },
    scrollContent: {
      gap: 18,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },

    applyBtn: {
      marginTop: 4,
      borderRadius: 12,
    },
    applyBtnLabel: {
      fontSize: 18,
      lineHeight: 24,
    },
  });
