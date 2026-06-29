import { Platform, StyleSheet } from "react-native";
import { AppTheme } from "@/types/types";

const dropdownFontFamily = Platform.select({
  android: "HappyMonkey_400Regular",
  ios: "HappyMonkey-Regular",
});

export const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    questionContainer: {
      marginInline: 10,
      position: "relative",
      flex: 1,
      justifyContent: "center",
      gap: 10,
    },
    questionContainerDropdown: {
      marginInline: 10,
      position: "relative",
      flex: 1,
      justifyContent: "center",
      paddingTop: 4,
      gap: 10,
    },
    questionText: {
      textAlign: "center",
    },
    input: {
      height: 50,
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

    dropdownWrapper: {
      position: "relative",
      gap: 10,
    },

    dropdown: {
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.dropdownBackgroundColor,
    },
    dropdownPlaceholder: {
      flex: 1,
      marginRight: 8,
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      fontFamily: dropdownFontFamily,
    },

    dropdownListContainer: {
      position: "absolute",
      left: 20,
      right: 20,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      padding: 8,
      backgroundColor: theme.colors.dropdownBackgroundColor,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      zIndex: 1000,
    },

    dropdownModalStyle: {
      padding: 20
    },

    dropdownSearchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 4,
      paddingBottom: 8,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    dropdownSearch: {
      flex: 1,
      height: 40,
      padding: 0,
      fontSize: 16,
      color: theme.colors.onSurface,
      fontFamily: dropdownFontFamily,
    },

    dropdownList: {
      minHeight: 50,
      maxHeight: 150,
    },
    dropdownListContent: {
      gap: 6,
      paddingVertical: 2,
    },
    dropdownItem: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 8,
    },

    dropdownItemSelected: {
      backgroundColor: theme.colors.background,
    },
    dropdownItemDisabled: {
      opacity: 0.4,
    },
    dropdownItemText: {
      flex: 1,
      marginRight: 8,
      fontSize: 16,
      color: theme.colors.onSurface,
      fontFamily: dropdownFontFamily,
    },
    dropdownEmpty: {
      padding: 16,
      alignItems: "center",
    },
    dropdownEmptyText: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: dropdownFontFamily,
    },

    btnWrap: {
      flexDirection: "row",
      marginTop: 10,
      flexWrap: "wrap",
      gap: 8,
    },

    selectedContentBtn: {
      flexDirection: "row-reverse",
      padding: 3,
    },

    labelBtn: {
      fontSize: 16,
    },
  });
