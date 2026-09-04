import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { StoryMedia, StoryUser } from "@/types/stories";

const IMAGE_DURATION_MS = 4_000;
const MAX_VIDEO_DURATION_SECONDS = 15;
const STROKE_GAP = 4;

const STORY_REACTIONS = [
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "heart", emoji: "❤️", label: "Heart" },
  { key: "lovely", emoji: "🥰", label: "Lovely" },
  { key: "kiss", emoji: "💋", label: "Kiss" },
  { key: "hundred", emoji: "💯", label: "100%" },
] as const;

function formatPostedAt(createdAt: string): string {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return "";

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60_000),
  );

  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

type Props = {
  users: StoryUser[];
  initialUserIndex: number;
  onClose: () => void;
  onViewUser: (userId: string) => void;
  onSendReaction?: (story: StoryMedia, reaction: string) => void;
};

type StoryStrokeProps = {
  width: number;
  state: "complete" | "active" | "pending";
  progress: SharedValue<number>;
};

function StoryStroke({ width, state, progress }: StoryStrokeProps) {
  const fillStyle = useAnimatedStyle(() => ({
    width:
      state === "complete"
        ? width
        : state === "active"
          ? width * progress.value
          : 0,
  }));

  return (
    <View style={[styles.strokeTrack, { width }]}>
      <Animated.View style={[styles.strokeFill, fillStyle]} />
    </View>
  );
}

type VideoStoryProps = {
  story: StoryMedia;
  paused: boolean;
  onReady: () => void;
  onProgress: (progress: number) => void;
  onEnd: () => void;
};

function VideoStory({
  story,
  paused,
  onReady,
  onProgress,
  onEnd,
}: VideoStoryProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const mountedRef = useRef(true);
  const completionRef = useRef(false);
  const playbackReadyRef = useRef(false);
  const sourceDurationRef = useRef(Number.POSITIVE_INFINITY);
  const playbackStartTimeRef = useRef(0);
  const lastPlaybackTimeRef = useRef(0);
  const durationLimitRef = useRef(MAX_VIDEO_DURATION_SECONDS);
  const failureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(
    { uri: story.uri, useCaching: true },
    (videoPlayer) => {
      videoPlayer.loop = false;
      videoPlayer.timeUpdateEventInterval = 0.08;
      videoPlayer.play();
    },
  );

  useEffect(() => {
    if (paused) {
      player.pause();
    } else if (playbackReadyRef.current) {
      player.play();
    }
  }, [paused, player]);

  const finish = useCallback(() => {
    if (!mountedRef.current || completionRef.current) return;

    completionRef.current = true;
    onProgress(1);
    onEnd();
  }, [onEnd, onProgress]);

  useEventListener(player, "sourceLoad", ({ duration }) => {
    if (!mountedRef.current) return;

    sourceDurationRef.current = duration;
  });

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (!mountedRef.current) return;
    if (paused) return;

    lastPlaybackTimeRef.current = currentTime;
    if (!playbackReadyRef.current) return;

    const elapsed = Math.max(
      currentTime - playbackStartTimeRef.current,
      0,
    );
    const durationLimit = durationLimitRef.current;
    onProgress(Math.min(elapsed / durationLimit, 1));

    if (elapsed >= durationLimit - 0.04) finish();
  });

  useEventListener(player, "playToEnd", finish);

  useEventListener(player, "statusChange", ({ status }) => {
    if (!mountedRef.current) return;

    if (status === "readyToPlay") {
      setFailed(false);
    }

    if (status === "error") {
      setLoading(false);
      setFailed(true);
      failureTimerRef.current ??= setTimeout(finish, 1_200);
    }
  });

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (failureTimerRef.current) clearTimeout(failureTimerRef.current);
    },
    [],
  );

  const handleFirstFrame = useCallback(() => {
    if (!mountedRef.current || playbackReadyRef.current) return;

    const playbackStart = lastPlaybackTimeRef.current;
    const sourceDuration = sourceDurationRef.current;

    playbackStartTimeRef.current = playbackStart;
    durationLimitRef.current = Number.isFinite(sourceDuration)
      ? Math.min(
          Math.max(sourceDuration - playbackStart, 0.1),
          MAX_VIDEO_DURATION_SECONDS,
        )
      : MAX_VIDEO_DURATION_SECONDS;
    playbackReadyRef.current = true;
    setLoading(false);
    onProgress(0);
    onReady();
  }, [onProgress, onReady]);

  return (
    <View style={styles.mediaFill}>
      <VideoView
        player={player}
        style={styles.mediaFill}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        playsInline
        surfaceType="textureView"
        onFirstFrameRender={handleFirstFrame}
      />

      {loading && !failed && (
        <View
          style={[styles.mediaFeedback, styles.loadingFeedback]}
          pointerEvents="none"
        >
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {failed && (
        <View style={styles.mediaFeedback} pointerEvents="none">
          <MaterialCommunityIcons
            name="video-off-outline"
            size={42}
            color="#fff"
          />
          <Text style={styles.feedbackText}>This video could not be played</Text>
        </View>
      )}
    </View>
  );
}

type ImageStoryProps = {
  story: StoryMedia;
  onReady: () => void;
  onEnd: () => void;
};

function ImageStory({ story, onReady, onEnd }: ImageStoryProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const failureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLoad = useCallback(() => {
    if (!mountedRef.current || readyRef.current) return;

    readyRef.current = true;
    setLoading(false);
    onReady();
  }, [onReady]);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;

    setLoading(false);
    setFailed(true);
    failureTimerRef.current ??= setTimeout(onEnd, 1_200);
  }, [onEnd]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (failureTimerRef.current) clearTimeout(failureTimerRef.current);
    },
    [],
  );

  return (
    <View style={styles.mediaFill}>
      <Image
        source={{ uri: story.uri }}
        style={styles.mediaFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        recyclingKey={story.id}
        transition={0}
        onDisplay={handleLoad}
        onError={handleError}
      />

      {loading && !failed && (
        <View
          style={[styles.mediaFeedback, styles.loadingFeedback]}
          pointerEvents="none"
        >
          <ActivityIndicator color="#fff" size="large" />
        </View>
      )}

      {failed && (
        <View style={styles.mediaFeedback} pointerEvents="none">
          <MaterialCommunityIcons
            name="image-off-outline"
            size={42}
            color="#fff"
          />
          <Text style={styles.feedbackText}>This image could not be loaded</Text>
        </View>
      )}
    </View>
  );
}

type StoryMediaFrameProps = {
  story: StoryMedia;
  paused: boolean;
  onReady: () => void;
  onVideoProgress: (progress: number) => void;
  onEnd: () => void;
};

function StoryMediaFrame({
  story,
  paused,
  onReady,
  onVideoProgress,
  onEnd,
}: StoryMediaFrameProps) {
  const scale = useSharedValue(1.025);

  const entryStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [scale]);

  return (
    <Animated.View style={[styles.mediaFill, entryStyle]}>
      {story.type === "video" ? (
        <VideoStory
          story={story}
          paused={paused}
          onReady={onReady}
          onProgress={onVideoProgress}
          onEnd={onEnd}
        />
      ) : (
        <ImageStory story={story} onReady={onReady} onEnd={onEnd} />
      )}
    </Animated.View>
  );
}

export default function StoryViewer({
  users,
  initialUserIndex,
  onClose,
  onViewUser,
  onSendReaction,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [userIndex, setUserIndex] = useState(() =>
    Math.min(Math.max(initialUserIndex, 0), users.length - 1),
  );
  const [storyIndex, setStoryIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [reactionText, setReactionText] = useState("");

  const closingRef = useRef(false);
  const navigationLockedRef = useRef(false);
  const mediaReadyRef = useRef(false);
  const storyPausedRef = useRef(false);
  const longPressRef = useRef(false);
  const dismissOnlyTapRef = useRef(false);
  const composerFocusedRef = useRef(false);
  const keyboardVisibleRef = useRef(false);
  const keyboardScreenYRef = useRef<number | null>(null);
  const modalHeightRef = useRef(0);
  const reactionInputRef = useRef<TextInput>(null);
  const progress = useSharedValue(0);
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(1.025);
  const composerBottom = useSharedValue(Math.max(insets.bottom, 5));

  const currentUser = users[userIndex];
  const currentStory = currentUser.stories[storyIndex];

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  const composerPositionStyle = useAnimatedStyle(() => ({
    bottom: composerBottom.value,
  }));

  useEffect(() => {
    reactionInputRef.current?.blur();
  }, []);

  useEffect(() => {
    modalOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    modalScale.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [modalOpacity, modalScale]);

  useEffect(() => {
    onViewUser(currentUser.id);
  }, [currentUser.id, onViewUser]);

  const closeViewer = useCallback(() => {
    if (closingRef.current) return;

    closingRef.current = true;
    composerFocusedRef.current = false;
    setIsComposerFocused(false);
    Keyboard.dismiss();
    storyPausedRef.current = true;
    setIsPaused(true);
    cancelAnimation(progress);
    modalScale.value = withTiming(0.985, {
      duration: 240,
      easing: Easing.inOut(Easing.cubic),
    });
    modalOpacity.value = withTiming(
      0,
      { duration: 240, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(onClose);
      },
    );
  }, [modalOpacity, modalScale, onClose, progress]);

  const goForward = useCallback(() => {
    if (closingRef.current || navigationLockedRef.current) return;

    navigationLockedRef.current = true;
    cancelAnimation(progress);
    mediaReadyRef.current = false;
    progress.value = 0;

    if (storyIndex < currentUser.stories.length - 1) {
      setStoryIndex((index) => index + 1);
      return;
    }

    if (userIndex < users.length - 1) {
      setUserIndex((index) => index + 1);
      setStoryIndex(0);
      return;
    }

    closeViewer();
  }, [closeViewer, currentUser.stories.length, progress, storyIndex, userIndex, users.length]);

  const goBack = useCallback(() => {
    if (closingRef.current || navigationLockedRef.current) return;

    navigationLockedRef.current = true;
    cancelAnimation(progress);
    mediaReadyRef.current = false;
    progress.value = 0;

    if (storyIndex > 0) {
      setStoryIndex((index) => index - 1);
      return;
    }

    if (userIndex > 0) {
      const previousUserIndex = userIndex - 1;
      setUserIndex(previousUserIndex);
      setStoryIndex(users[previousUserIndex].stories.length - 1);
      return;
    }

    setReplayKey((key) => key + 1);
  }, [progress, storyIndex, userIndex, users]);

  useLayoutEffect(() => {
    navigationLockedRef.current = false;
    mediaReadyRef.current = false;
    storyPausedRef.current = false;
    setIsPaused(false);
    cancelAnimation(progress);
    progress.value = 0;

    return () => cancelAnimation(progress);
  }, [currentStory.id, currentUser.id, progress, replayKey]);

  const animateImageProgress = useCallback(() => {
    if (
      currentStory.type !== "image" ||
      !mediaReadyRef.current ||
      storyPausedRef.current ||
      closingRef.current ||
      navigationLockedRef.current
    ) {
      return;
    }

    const currentProgress = Math.min(Math.max(progress.value, 0), 1);
    const remainingDuration = Math.max(
      IMAGE_DURATION_MS * (1 - currentProgress),
      1,
    );

    progress.value = withTiming(
      1,
      { duration: remainingDuration, easing: Easing.linear },
      (finished) => {
        if (finished) scheduleOnRN(goForward);
      },
    );
  }, [currentStory.type, goForward, progress]);

  const handleMediaReady = useCallback(() => {
    if (
      mediaReadyRef.current ||
      closingRef.current ||
      navigationLockedRef.current
    ) {
      return;
    }

    mediaReadyRef.current = true;
    progress.value = 0;

    animateImageProgress();
  }, [animateImageProgress, progress]);

  const updateVideoProgress = useCallback(
    (nextProgress: number) => {
      if (!mediaReadyRef.current || storyPausedRef.current) return;

      progress.value = withTiming(Math.min(Math.max(nextProgress, 0), 1), {
        duration: 100,
        easing: Easing.linear,
      });
    },
    [progress],
  );

  const pauseStory = useCallback(() => {
    if (
      closingRef.current ||
      navigationLockedRef.current ||
      storyPausedRef.current
    ) {
      return;
    }

    storyPausedRef.current = true;
    cancelAnimation(progress);
    setIsPaused(true);
  }, [progress]);

  const resumeStory = useCallback(() => {
    if (
      !storyPausedRef.current ||
      closingRef.current ||
      navigationLockedRef.current
    ) {
      return;
    }

    storyPausedRef.current = false;
    setIsPaused(false);
    animateImageProgress();
  }, [animateImageProgress]);

  const dismissComposer = useCallback(() => {
    const shouldConsumeTap =
      composerFocusedRef.current || keyboardVisibleRef.current;

    reactionInputRef.current?.blur();
    Keyboard.dismiss();
    composerFocusedRef.current = false;
    setIsComposerFocused(false);

    return shouldConsumeTap;
  }, []);

  const handleStoryPressIn = useCallback(() => {
    dismissOnlyTapRef.current = dismissComposer();
    longPressRef.current = false;
  }, [dismissComposer]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      keyboardVisibleRef.current = true;
      keyboardScreenYRef.current = event.endCoordinates.screenY;
      const keyboardOffset = modalHeightRef.current
        ? Math.max(modalHeightRef.current - event.endCoordinates.screenY + 5, 5)
        : event.endCoordinates.height + 5;

      composerBottom.value = withTiming(keyboardOffset, {
        duration: event.duration > 0 ? event.duration : 180,
        easing: Easing.out(Easing.cubic),
      });
      pauseStory();
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardVisibleRef.current = false;
      keyboardScreenYRef.current = null;
      reactionInputRef.current?.blur();
      composerFocusedRef.current = false;
      setIsComposerFocused(false);
      composerBottom.value = withTiming(Math.max(insets.bottom, 5), {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
      resumeStory();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [composerBottom, insets.bottom, pauseStory, resumeStory]);

  const sendReaction = useCallback(
    (reaction: string) => {
      const trimmedReaction = reaction.trim();
      if (!trimmedReaction) return;

      onSendReaction?.(currentStory, trimmedReaction);
      setReactionText("");
      setIsComposerFocused(false);
      composerFocusedRef.current = false;
      Keyboard.dismiss();

      if (!keyboardVisibleRef.current) resumeStory();
    },
    [currentStory, onSendReaction, resumeStory],
  );

  const handleStoryPress = useCallback(
    (direction: "previous" | "next") => {
      if (dismissOnlyTapRef.current) {
        dismissOnlyTapRef.current = false;
        return;
      }

      if (longPressRef.current) {
        longPressRef.current = false;
        return;
      }

      if (direction === "previous") goBack();
      else goForward();
    },
    [goBack, goForward],
  );

  const handleStoryLongPress = useCallback(() => {
    if (dismissOnlyTapRef.current) return;

    longPressRef.current = true;
    pauseStory();
  }, [pauseStory]);

  const handleStoryPressOut = useCallback(() => {
    if (longPressRef.current) resumeStory();
  }, [resumeStory]);

  const strokeWidth = Math.max(
    2,
    (width - 24 - STROKE_GAP * (currentUser.stories.length - 1)) /
      currentUser.stories.length,
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={closeViewer}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

        <Animated.View
          onLayout={(event) => {
            const nextHeight = event.nativeEvent.layout.height;
            modalHeightRef.current = nextHeight;

            if (keyboardVisibleRef.current && keyboardScreenYRef.current !== null) {
              composerBottom.value = withTiming(
                Math.max(nextHeight - keyboardScreenYRef.current + 5, 5),
                { duration: 120, easing: Easing.out(Easing.cubic) },
              );
            }
          }}
          style={[styles.modalRoot, modalStyle]}
        >
        <StoryMediaFrame
          key={`${currentUser.id}-${currentStory.id}-${replayKey}`}
          story={currentStory}
          paused={isPaused}
          onReady={handleMediaReady}
          onVideoProgress={updateVideoProgress}
          onEnd={goForward}
        />

        <View style={styles.topScrim} pointerEvents="none" />
        <View style={styles.bottomScrim} pointerEvents="none" />

        <View style={styles.tapZones}>
          <Pressable
            style={styles.leftTapZone}
            accessibilityRole="button"
            accessibilityLabel="Previous story"
            delayLongPress={250}
            onPressIn={handleStoryPressIn}
            onLongPress={handleStoryLongPress}
            onPressOut={handleStoryPressOut}
            onPress={() => handleStoryPress("previous")}
          />
          <Pressable
            style={styles.rightTapZone}
            accessibilityRole="button"
            accessibilityLabel="Next story"
            delayLongPress={250}
            onPressIn={handleStoryPressIn}
            onLongPress={handleStoryLongPress}
            onPressOut={handleStoryPressOut}
            onPress={() => handleStoryPress("next")}
          />
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.chrome, { paddingTop: insets.top + 8 }]}
        >
          <View style={[styles.strokeRow, { gap: STROKE_GAP }]}>
            {currentUser.stories.map((story, index) => (
              <StoryStroke
                key={story.id}
                width={strokeWidth}
                progress={progress}
                state={
                  index < storyIndex
                    ? "complete"
                    : index === storyIndex
                      ? "active"
                      : "pending"
                }
              />
            ))}
          </View>

          <View style={styles.headerRow}>
            <Image
              source={{ uri: currentUser.avatar_url }}
              style={styles.headerAvatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`viewer-avatar-${currentUser.id}`}
              transition={0}
            />
            <View style={styles.userMeta}>
              <Text style={styles.userName} numberOfLines={1}>
                {currentUser.name}
              </Text>
              <Text style={styles.postedAt} numberOfLines={1}>
                {formatPostedAt(currentStory.created_at)}
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close stories"
              onPress={closeViewer}
            >
              <MaterialCommunityIcons name="close" size={30} color="#fff" />
            </Pressable>
          </View>
        </View>

        <Animated.View
          pointerEvents="box-none"
          style={[styles.composerLayer, composerPositionStyle]}
        >
          <View style={styles.composerContent}>
            {isComposerFocused && (
              <View style={styles.reactionRow}>
                {STORY_REACTIONS.map((reaction) => (
                  <Pressable
                    key={reaction.key}
                    style={styles.reactionButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Send ${reaction.label} reaction`}
                    onPressIn={pauseStory}
                    onPress={() => sendReaction(reaction.emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                ref={reactionInputRef}
                autoFocus={false}
                value={reactionText}
                onChangeText={setReactionText}
                placeholder="Send a reaction..."
                placeholderTextColor="rgba(255,255,255,0.68)"
                selectionColor="#fff"
                returnKeyType="send"
                onPressIn={pauseStory}
                onFocus={() => {
                  setIsComposerFocused(true);
                  composerFocusedRef.current = true;
                  pauseStory();
                }}
                onBlur={() => {
                  setIsComposerFocused(false);
                  composerFocusedRef.current = false;
                  if (!keyboardVisibleRef.current) resumeStory();
                }}
                onSubmitEditing={() => sendReaction(reactionText)}
                style={styles.reactionInput}
              />
              <Pressable
                style={styles.sendButton}
                accessibilityRole="button"
                accessibilityLabel="Send story reaction"
                disabled={!reactionText.trim()}
                onPress={() => sendReaction(reactionText)}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={21}
                  color={
                    reactionText.trim()
                      ? "#fff"
                      : "rgba(255,255,255,0.38)"
                  }
                />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#050505",
  },
  mediaFill: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    backgroundColor: "#050505",
  },
  mediaFeedback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  loadingFeedback: {
    backgroundColor: "#050505",
  },
  feedbackText: {
    color: "#fff",
    fontSize: 15,
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 104,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    flexDirection: "row",
  },
  leftTapZone: {
    flex: 0.35,
  },
  rightTapZone: {
    flex: 0.65,
  },
  chrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    paddingHorizontal: 12,
  },
  strokeRow: {
    height: 3,
    flexDirection: "row",
  },
  strokeTrack: {
    height: 3,
    overflow: "hidden",
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  strokeFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  headerRow: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "#222",
  },
  userMeta: {
    flex: 1,
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    flexShrink: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  postedAt: {
    flexShrink: 0,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  composerLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 4,
  },
  composerContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  reactionRow: {
    flexDirection: "row",
    gap: 8,
  },
  reactionButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  reactionEmoji: {
    fontSize: 23,
  },
  inputRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  reactionInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 15,
  },
  sendButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },
});
