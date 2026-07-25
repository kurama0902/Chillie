import { StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

export const CROSS_COLOR = "#F5A623";

export const getStyles = (theme: AppTheme, width: number, height: number) =>
  StyleSheet.create({
    stack: {
      width,
      height,
      alignItems: "center",
      justifyContent: "center",
    },

    card: {
      position: "absolute",
      width,
      height,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: "#111",
    },

    image: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },

    pill: {
      position: "absolute",
      top: 14,
      left: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    pillText: {
      color: "#fff",
      fontSize: 13,
      lineHeight: 16,
    },

    scrim: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 70,
      backgroundColor: "rgba(0,0,0,0.35)",
    },

    info: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 18,
    },
    name: {
      color: "#fff",
      fontSize: 22,
      fontWeight: "700",
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    job: {
      color: "#fff",
      fontSize: 15,
      opacity: 0.9,
      marginTop: 2,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },

    badgeLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },

    empty: {
      width,
      height,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 16,
    },
  });
