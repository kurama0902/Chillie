import { FlashList } from "@shopify/flash-list";
import { ChatItem } from "@/types/types";
import { ActivityIndicator } from "react-native-paper";
import { ChatListItem } from "./ChatListItem";

type ChatListProps = {
  chats: ChatItem[];
  onChatPress: (chat: ChatItem) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
};

export const ChatList = ({
  chats,
  onChatPress,
  onLoadMore,
  isLoadingMore = false,
}: ChatListProps) => {
  return (
    <FlashList
      data={chats}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? <ActivityIndicator style={{ padding: 16 }} /> : null
      }
      renderItem={({ item }) => (
        <ChatListItem
          {...item}
          onPress={() => onChatPress(item)}
        />
      )}
    />
  );
};
