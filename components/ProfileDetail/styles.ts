import { StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

export const getStyles = (theme: AppTheme, photoHeight: number) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background,
      zIndex: 2500,
    },

    content: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 40,
    },

    photo: {
      width: "100%",
      height: photoHeight,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      backgroundColor: "#111",
    },
    closeBtn: {
      position: "absolute",
      left: 14,
      backgroundColor: "rgba(0,0,0,0.35)",
    },

    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      marginTop: -34,
    },
    skipBtn: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.dropdownBackgroundColor,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    likeBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
    },

    body: {
      paddingHorizontal: 20,
      paddingTop: 18,
      gap: 22,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    name: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.onSurface,
    },
    job: {
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    sendBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },

    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.onSurface,
    },

    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cityText: {
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    distanceChip: {
      backgroundColor: theme.colors.secondary,
    },
    distanceChipText: {
      color: theme.colors.primary,
    },

    aboutText: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.onSurfaceVariant,
    },
    readMore: {
      color: theme.colors.primary,
      fontSize: 14,
      marginTop: 4,
    },

    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    interestChip: {
      backgroundColor: theme.colors.dropdownBackgroundColor,
      borderColor: theme.colors.outline,
    },
  });
