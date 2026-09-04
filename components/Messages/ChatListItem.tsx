import { ChatItem } from "@/types/types";
import { StyleSheet, View } from "react-native";
import { Avatar, Badge, List } from "react-native-paper";

const MessagesCounter = ({
  newMessagesQuant,
}: {
  newMessagesQuant: number;
}) => {
  return (
    <View style={styles.counterWrap}>
      <Badge>{newMessagesQuant > 99 ? "99+" : newMessagesQuant}</Badge>
    </View>
  );
};

export const ChatListItem = ({
  image_url,
  lastMessage,
  name,
  newMessagesQuant,
  onPress,
}: ChatItem & { onPress?: () => void }) => {
  return (
    <List.Item
      title={name}
      description={lastMessage.text}
      onPress={onPress}
      left={() => (
        <Avatar.Image
          size={48}
          source={{ uri: image_url }}
          style={styles.avatar}
        />
      )}
      right={() =>
        newMessagesQuant > 0 ? (
          <MessagesCounter newMessagesQuant={newMessagesQuant} />
        ) : null
      }
      titleNumberOfLines={1}
      descriptionNumberOfLines={1}
      style={styles.item}
    />
  );
};

const styles = StyleSheet.create({
  item: {
    minHeight: 72,
    paddingHorizontal: 16,
  },
  avatar: {
    marginRight: 4,
  },
  counterWrap: {
    minWidth: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
