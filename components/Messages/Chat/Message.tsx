import { useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { ChatMessage } from '@/types/types';

type MessageBubbleProps = {
  item: ChatMessage;
  ownBackground: string;
  ownText: string;
  otherBackground: string;
  otherText: string;
  onReply: (message: ChatMessage) => void;
  onLongPress: (message: ChatMessage) => void;
};

export default function MessageBubble({
  item,
  ownBackground,
  ownText,
  otherBackground,
  otherText,
  onReply,
  onLongPress,
}: MessageBubbleProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx > 8 &&
          gestureState.dx > Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          translateX.setValue(Math.min(gestureState.dx, 84));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx >= 56) onReply(item);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [item, onReply, translateX],
  );

  const backgroundColor = item.isMine ? ownBackground : otherBackground;
  const textColor = item.isMine ? ownText : otherText;

  return (
    <View
      style={[
        styles.messageRow,
        item.isMine ? styles.messageRowMine : styles.messageRowTheirs,
      ]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.messageSwipe,
          { transform: [{ translateX }] },
        ]}
      >
        <Pressable
          delayLongPress={350}
          onLongPress={() => onLongPress(item)}
          style={[
            styles.messagePressable,
            item.isMine
              ? styles.messagePressableMine
              : styles.messagePressableTheirs,
          ]}
        >
          <View
            style={[
              styles.bubble,
              item.isMine ? styles.bubbleMine : styles.bubbleTheirs,
              { backgroundColor },
            ]}
          >
            {item.replyTo ? (
              <View
                style={[
                  styles.replyQuote,
                  {
                    borderLeftColor: textColor,
                    backgroundColor: item.isMine
                      ? 'rgba(0, 0, 0, 0.08)'
                      : 'rgba(255, 255, 255, 0.12)',
                  },
                ]}
              >
                <Text style={[styles.replyQuoteAuthor, { color: textColor }]}>
                  {item.replyTo.senderName ?? 'Reply'}
                </Text>
                <Text numberOfLines={2} style={{ color: textColor }}>
                  {item.replyTo.text || 'Attachment'}
                </Text>
              </View>
            ) : null}
            <Text style={{ color: textColor }}>{item.text}</Text>
            <Text
              style={{
                color: textColor,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <View
              style={[
                styles.bubbleTail,
                item.isMine ? styles.bubbleTailMine : styles.bubbleTailTheirs,
                { borderTopColor: backgroundColor },
              ]}
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    width: '100%',
    marginVertical: 5,
  },
  messageRowMine: {
    alignItems: 'flex-end',
  },
  messageRowTheirs: {
    alignItems: 'flex-start',
  },
  messageSwipe: {
    width: '100%',
  },
  messagePressable: {
    maxWidth: '82%',
  },
  messagePressableMine: {
    alignSelf: 'flex-end',
  },
  messagePressableTheirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    position: 'relative',
    maxWidth: '100%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    borderBottomRightRadius: 3,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 3,
  },
  replyQuote: {
    borderLeftWidth: 3,
    borderRadius: 5,
    marginBottom: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  replyQuoteAuthor: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 1,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubbleTailMine: {
    right: -5,
    transform: [{ rotate: '-45deg' }],
  },
  bubbleTailTheirs: {
    left: -5,
    transform: [{ rotate: '45deg' }],
  },
});
