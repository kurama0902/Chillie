import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTheme } from "@/types/types";

export default function MessagesScreen() {
  const theme = useTheme<AppTheme>();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="message"
        size={48}
        color={theme.colors.primary}
      />
      <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Your messages will appear here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
});
