import { ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { AppTheme } from "@/types/types";
import { useWebSocket } from "@/context/WebSocketContext";
import MatchesList from "@/components/Matches/MatchesList";
import { useGetMatchesQuery } from "@/store/api";

export default function MatchesScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const { data, isFetching } = useGetMatchesQuery()
  const { likedUsers } = useWebSocket();

  if (!isFocused) return null;

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + 8 }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        Matches
      </Text>

      <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
        People who liked you will appear here.
      </Text>

      {data?.length === 0 && likedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="heart-multiple-outline"
            size={56}
            color={theme.colors.primary}
          />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            No matches yet
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            Keep discovering people and your matches will show up here.
          </Text>
        </View>
      ) : (
        <MatchesList users={[...(data ? data : []) , ...likedUsers]} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
  },
  description: {
    marginTop: 8,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyText: {
    maxWidth: 280,
    textAlign: "center",
    fontSize: 15,
  },
  list: {
    gap: 12,
    marginTop: 24,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
  },
  userDetail: {
    fontSize: 14,
  },
});
