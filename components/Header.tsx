import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Header() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[style.headerWrap, { top: insets.top }]} />
  );
}

const style = StyleSheet.create({
  headerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 50,
    zIndex: 100,
    elevation: 100,
  },
});
