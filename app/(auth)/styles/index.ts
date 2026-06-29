import { Platform, StyleSheet } from "react-native";
import { MD3Theme } from "react-native-paper";

export const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 20,
    },

    title: {
      color: theme.colors.primary,
    },

    slide: {
      flex: 1,
    },

    imageWrap: {
      flex: 1,
      borderRadius: 8,
      overflow: "hidden",
      width: "100%",
    },

    image: {
      height: "100%",
      width: "100%",
    },

    textBlock: {
      paddingTop: 25,
      gap: 20,
    },

    headerText: {
      textAlign: "center",
      color: theme.colors.primary,
    },

    descriptionText: {
      textAlign: "center",
    },

    btnWrap: {
      alignItems: "center",
      width: "100%",
      gap: 15,
    },

    btnStyle: {
      maxWidth: 250,
      width: "100%",
      maxHeight: "auto",
    },

    btnTextStyle: {
      fontSize: 20,
      lineHeight: 24,
    },

    mainText: {
      fontSize: 40,
      fontFamily: Platform.select({
        android: "HappyMonkey_400Regular",
        ios: "HappyMonkey-Regular",
      }),
      fontWeight: "400",
    },
  });
