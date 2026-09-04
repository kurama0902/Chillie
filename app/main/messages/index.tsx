import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppTheme } from "@/types/types";
import Stories from "@/components/Messages/Stories";
import { ChatList } from "@/components/Messages/ChatList";
import { useGetChatsInfiniteQuery, useGetStoriesQuery } from "@/store/api";

export default function MessagesScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetStoriesQuery(undefined, { refetchOnFocus: true });
  const {
    data: chatsData,
    isLoading: areChatsLoading,
    isFetchingNextPage,
    hasNextPage,
    isError: areChatsError,
    refetch: refetchChats,
    fetchNextPage,
  } = useGetChatsInfiniteQuery();

  const chats = useMemo(
    () => chatsData?.pages.flatMap((page) => page.items) ?? [],
    [chatsData],
  );

  const loadMoreChats = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        Messages
      </Text>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Stories
        </Text>
        {isFetching && !isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.storyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Loading stories
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.storyState}>
          <Text style={{ color: theme.colors.error }}>
            Stories could not be loaded
          </Text>
          <Button compact mode="text" onPress={() => void refetch()}>
            Try again
          </Button>
        </View>
      ) : data?.users.length ? (
        <Stories users={data.users} />
      ) : (
        <View style={styles.storyState}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            No stories yet
          </Text>
        </View>
      )}

      <View style={styles.chatsSection}>
        <View style={styles.chatHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Chats
          </Text>
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : null}
        </View>

        {areChatsLoading ? (
          <View style={styles.chatState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : areChatsError ? (
          <View style={styles.chatState}>
            <Text style={{ color: theme.colors.error }}>
              Chats could not be loaded
            </Text>
            <Button compact mode="text" onPress={() => void refetchChats()}>
              Try again
            </Button>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.chatState}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No chats yet
            </Text>
          </View>
        ) : (
          <ChatList
            chats={chats}
            onChatPress={(chat) =>
              router.push({
                pathname: "/main/messages/[chatId]",
                params: {
                  chatId: chat.id,
                  name: chat.name,
                  lastname: chat.lastname ?? '',
                  image_url: chat.image_url,
                },
              })
            }
            onLoadMore={loadMoreChats}
            isLoadingMore={isFetchingNextPage}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
  },
  sectionHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "700",
  },
  storyState: {
    height: 98,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatsSection: {
    flex: 1,
    minHeight: 0,
  },
  chatHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
