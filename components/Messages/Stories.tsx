import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { AppTheme } from "@/types/types";
import { StoryMedia, StoryUser } from "@/types/stories";
import StoryViewer from "./StoryViewer";

export type { StoryMedia, StoryUser } from "@/types/stories";

const STORY_SIZE = 72;
const RING_RADIUS = 33.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export type StoriesProps = {
  users: StoryUser[];
  onSendReaction?: (story: StoryMedia, reaction: string) => void;
};

type StoryButtonProps = {
  user: StoryUser;
  viewed: boolean;
  onOpen: () => void;
};

function StoryButton({ user, viewed, onOpen }: StoryButtonProps) {
  const theme = useTheme<AppTheme>();
  const pressingRef = useRef(false);
  const rotation = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const avatarScale = useSharedValue(1);
  const highlightOpacity = useSharedValue(0);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const finishPress = useCallback(() => {
    pressingRef.current = false;
    onOpen();
  }, [onOpen]);

  const handlePress = () => {
    if (pressingRef.current) return;

    pressingRef.current = true;
    rotation.value = 0;
    highlightOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 180 }),
      withTiming(0, { duration: 80 }),
    );
    ringScale.value = withSequence(
      withTiming(1.08, {
        duration: 145,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: 195,
        easing: Easing.out(Easing.cubic),
      }),
    );
    avatarScale.value = withSequence(
      withTiming(0.92, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: 210,
        easing: Easing.out(Easing.cubic),
      }),
    );
    rotation.value = withTiming(
      360,
      { duration: 340, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(finishPress);
      },
    );
  };

  const gradientId = `story-ring-${user.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <View style={styles.item}>
      <Pressable
        style={styles.storyButton}
        accessibilityRole="button"
        accessibilityLabel={`View ${user.name ?? "user"}'s stories`}
        onPress={handlePress}
      >
        <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none">
          <Svg width={STORY_SIZE} height={STORY_SIZE}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#F9CE34" />
                <Stop offset="0.48" stopColor="#EE2A7B" />
                <Stop offset="1" stopColor="#6228D7" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={STORY_SIZE / 2}
              cy={STORY_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={
                viewed
                  ? theme.colors.outlineVariant
                  : `url(#${gradientId})`
              }
              strokeWidth={3}
            />
          </Svg>

          <Animated.View style={[styles.ringHighlight, highlightStyle]}>
            <Svg width={STORY_SIZE} height={STORY_SIZE}>
              <Circle
                cx={STORY_SIZE / 2}
                cy={STORY_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE * 0.16} ${
                  RING_CIRCUMFERENCE * 0.84
                }`}
              />
            </Svg>
          </Animated.View>

          <Animated.View
            style={[
              styles.avatarFrame,
              { backgroundColor: theme.colors.background },
              avatarStyle,
            ]}
          >
            <Image
              source={{ uri: user.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`story-avatar-${user.id}`}
              transition={100}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {user.name ? (
        <Text
          style={[styles.name, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {user.name}
        </Text>
      ) : null}
    </View>
  );
}

export default function Stories({ users, onSendReaction }: StoriesProps) {
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null);
  const [viewedUserIds, setViewedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const viewedUserIdsRef = useRef(new Set<string>());

  const markViewed = useCallback((id: string) => {
    viewedUserIdsRef.current.add(id);
  }, []);

  const closeViewer = useCallback(() => {
    setActiveUserIndex(null);
    setViewedUserIds(new Set(viewedUserIdsRef.current));
  }, []);

  return (
    <View style={styles.container}>
      <FlashList
        horizontal
        data={users}
        extraData={viewedUserIds}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        maintainVisibleContentPosition={{ disabled: true }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <StoryButton
            user={item}
            viewed={viewedUserIds.has(item.id)}
            onOpen={() => setActiveUserIndex(index)}
          />
        )}
      />

      {activeUserIndex !== null && users[activeUserIndex] && (
        <StoryViewer
          users={users}
          initialUserIndex={activeUserIndex}
          onViewUser={markViewed}
          onSendReaction={onSendReaction}
          onClose={closeViewer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 98,
  },
  listContent: {
    paddingVertical: 4,
  },
  item: {
    width: 80,
    marginRight: 10,
    alignItems: "center",
  },
  storyButton: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
  },
  ring: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringHighlight: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarFrame: {
    position: "absolute",
    width: 62,
    height: 62,
    padding: 2,
    borderRadius: 31,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 29,
    backgroundColor: "#ddd",
  },
  name: {
    width: 76,
    marginTop: 4,
    textAlign: "center",
    fontSize: 12,
  },
});
