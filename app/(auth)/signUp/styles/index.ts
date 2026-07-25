import { StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

export const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },

    topSpacer: {
      flex: 1,
    },

    title: {
      textAlign: "center",
      color: theme.colors.primary,
      marginBottom: 10,
    },

    sliderWrap: {
      height: 360,
      marginTop: 20,
    },

    slide: {
      flex: 1,
      justifyContent: "center",
      gap: 14,
    },

    input: {
      width: "100%",
    },

    registerBtn: {
      marginTop: 10,
    },

    btnLabel: {
      fontSize: 18,
      lineHeight: 24,
    },

    otpSlide: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 20,
    },

    otpHint: {
      textAlign: "center",
      color: theme.colors.onSurfaceVariant,
    },

    timerText: {
      fontSize: 22,
      color: theme.colors.primary,
    },

    expiredText: {
      color: theme.colors.error,
      textAlign: "center",
    },

    verifyBtn: {
      width: "100%",
      maxWidth: 250,
    },

    pinContainer: {
      borderWidth: 1,
      borderRadius: 8,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.dropdownBackgroundColor,
    },

    pinFocused: {
      borderColor: theme.colors.primary,
    },

    pinText: {
      color: theme.colors.onSurface,
    },

    modalContainer: {
      backgroundColor: theme.colors.dropdownBackgroundColor,
      marginHorizontal: 24,
      borderRadius: 16,
      padding: 24,
      gap: 16,
      alignItems: "center",
    },

    modalText: {
      textAlign: "center",
      color: theme.colors.onSurface,
    },
  });
