import { useEffect } from "react";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AppTheme, MockUser } from "@/types/types";
import { getStyles } from "./styles";
import { Match } from "./data";

type Props = {
  match: Match;
  width: number;
  onOpen: (user: MockUser) => void;
};

const RATIO = 1.34;

function AnimatedHeart({ style }: { style: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 450 }),
          withTiming(1, { duration: 450 }),
        ),
        -1,
      );
    } else {
      cancelAnimation(scale);
      scale.value = 1;
    }

    return () => cancelAnimation(scale);
  }, [isFocused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} pointerEvents="none">
      <MaterialCommunityIcons name="heart" size={22} color="#fff" />
    </Animated.View>
  );
}

export default function MatchCard({ match, width, onOpen }: Props) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);

  const onCross = () => {};
  const onHeart = () => {};
  const onSendMessage = () => {};

  return (
    <Pressable
      style={[styles.card, { width, height: width * RATIO }]}
      onPress={() => onOpen(match)}
    >
      <Image
        source={{ uri: match.image_url.replace("/1000", "/400") }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={match.id}
      />
      <View style={styles.scrim} pointerEvents="none" />

      <Text style={styles.name} numberOfLines={1}>
        {match.name}, {match.age}
      </Text>

      {match.matched ? (
        <>
          <AnimatedHeart style={styles.matchBadge} />
          <Pressable style={styles.sendBtn} onPress={onSendMessage}>
            <MaterialCommunityIcons
              name="send"
              size={16}
              color={theme.colors.onPrimary}
            />
            <Text style={styles.sendText}>Send message</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={onCross}>
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={onHeart}>
            <MaterialCommunityIcons name="heart" size={22} color="#fff" />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}
