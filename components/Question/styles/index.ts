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
    dropdownPressed: {
      opacity: 0.82,
    },
    dropdownPlaceholder: {
      flex: 1,
      marginRight: 8,
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      fontFamily: dropdownFontFamily,
    },
    dropdownCount: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 7,
      marginRight: 6,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    dropdownCountText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      lineHeight: 16,
      fontFamily: dropdownFontFamily,
    },

    drawerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.48)",
      zIndex: 3000,
    },
    drawerBackdropPressable: {
      flex: 1,
    },
    drawerLayer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      zIndex: 3001,
    },
    drawerAnimationShell: {
      width: "100%",
    },
    drawer: {
      flex: 1,
      width: "100%",
      paddingHorizontal: 20,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline,
      backgroundColor: theme.colors.dropdownBackgroundColor,
      elevation: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
    },
    drawerDragArea: {
      marginHorizontal: -20,
      paddingTop: 10,
      paddingHorizontal: 20,
    },
    drawerHandle: {
      alignSelf: "center",
      width: 46,
      height: 5,
      marginBottom: 8,
      borderRadius: 3,
      backgroundColor: theme.colors.onSurfaceVariant,
      opacity: 0.38,
    },
    drawerHeader: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    drawerHeaderCopy: {
      flex: 1,
      paddingRight: 8,
    },
    drawerTitle: {
      color: theme.colors.onSurface,
    },
    drawerSelectionCount: {
      marginTop: 2,
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
      fontFamily: dropdownFontFamily,
    },

    drawerSearchRow: {
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
    },
    drawerSearch: {
      flex: 1,
      height: 48,
      padding: 0,
      fontSize: 16,
      color: theme.colors.onSurface,
      fontFamily: dropdownFontFamily,
    },

    drawerList: {
      flex: 1,
      marginTop: 12,
    },
    drawerListContent: {
      flexGrow: 1,
      gap: 8,
      paddingBottom: 12,
    },
    drawerItem: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 14,
    },
    drawerItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.dark
        ? "rgba(233, 64, 87, 0.18)"
        : theme.colors.secondary,
    },
    drawerItemDisabled: {
      opacity: 0.38,
    },
    drawerItemPressed: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    drawerItemText: {
      flex: 1,
      marginRight: 12,
      fontSize: 16,
      color: theme.colors.onSurface,
      fontFamily: dropdownFontFamily,
    },
    drawerItemTextSelected: {
      color: theme.colors.primary,
    },
    drawerDoneButton: {
      marginTop: 4,
      borderRadius: 14,
    },
    drawerDoneLabel: {
      fontSize: 17,
      lineHeight: 24,
    },

    dropdownEmpty: {
      flex: 1,
      minHeight: 140,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
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
