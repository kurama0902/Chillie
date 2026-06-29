import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  containerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  sliderWrap: {
    height: 150,
    marginTop: 50,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignSelf: "flex-end",
    marginTop: 35,
    gap: 10,
  },
  buttonLabel: {
    fontSize: 18,
  },
});
