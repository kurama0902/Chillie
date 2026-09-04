import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { AppTheme, ChatMessage } from '@/types/types';
import MessageBubble from './Message';
import { StyleSheet, View } from 'react-native';

type ChatMessagesListProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onLoadOlder: () => void;
  ownBackground: string;
  ownText: string;
  otherBackground: string;
  otherText: string;
  onReply: (message: ChatMessage) => void;
  onLongPress: (message: ChatMessage) => void;
};

export default function ChatMessagesList({
  messages,
  isLoading,
  isFetchingNextPage,
  onLoadOlder,
  ownBackground,
  ownText,
  otherBackground,
  otherText,
  onReply,
  onLongPress,
}: ChatMessagesListProps) {
  const theme = useTheme<AppTheme>();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            item={item}
            ownBackground={ownBackground}
            ownText={ownText}
            otherBackground={otherBackground}
            otherText={otherText}
            onReply={onReply}
            onLongPress={onLongPress}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onStartReached={onLoadOlder}
        onStartReachedThreshold={0.25}
        maintainVisibleContentPosition={{
          autoscrollToTopThreshold: 0,
        }}
        ListHeaderComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : null
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            No messages yet
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  loader: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  emptyText: {
    color: '#777',
  },
});
