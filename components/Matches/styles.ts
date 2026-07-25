import { StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

export const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
      paddingHorizontal: 16,
    },

    header: {
      marginBottom: 4,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 34,
      fontWeight: "700",
      color: theme.colors.onSurface,
    },
    logo: {
      width: 34,
      height: 34,
      borderRadius: 8,
    },
    description: {
      marginTop: 4,
      fontSize: 15,
      lineHeight: 20,
      color: theme.colors.onSurfaceVariant,
    },

    sectionTitle: {
      color: theme.colors.onSurface,
      fontSize: 20,
      fontWeight: "700",
      marginTop: 20,
      marginBottom: 12,
    },

    dateDivider: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
      marginTop: 14,
      marginBottom: 12,
    },

    row: {
      flexDirection: "row",
      marginBottom: 12,
    },

    card: {
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: "#111",
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    scrim: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "55%",
      backgroundColor: "rgba(0,0,0,0.30)",
    },
    name: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 62,
      color: "#fff",
      fontSize: 18,
      fontWeight: "700",
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },

    actionRow: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actionBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
    },

    matchBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    sendBtn: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      height: 42,
      borderRadius: 21,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    sendText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
