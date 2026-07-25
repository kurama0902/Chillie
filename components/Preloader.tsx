import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { AppTheme } from "@/types/types";

type Props = {
  label?: string;
};

export default function Preloader({ label }: Props) {
  const theme = useTheme<AppTheme>();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ActivityIndicator animating size="large" color={theme.colors.primary} />
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  label: {
    fontSize: 15,
  },
});
