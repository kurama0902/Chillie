import { View } from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppTheme, MockUser } from "@/types/types";
import CardFace from "./CardFace";
import { CROSS_COLOR, getStyles } from "./styles";

type Props = {
  user: MockUser;
  width: number;
  height: number;
  isTop: boolean;
  onSwipe: (dir: "left" | "right") => void;
  onTap?: () => void;
};

export default function SwipeCard({
  user,
  width,
  height,
  isTop,
  onSwipe,
  onTap,
}: Props) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme, width, height);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const threshold = width * 0.25;

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationX > threshold || e.velocityX > 800) {
        translateX.value = withTiming(width * 2, { duration: 320 }, (f) => {
          if (f) runOnJS(onSwipe)("right");
        });
      } else if (e.translationX < -threshold || e.velocityX < -800) {
        translateX.value = withTiming(-width * 2, { duration: 320 }, (f) => {
          if (f) runOnJS(onSwipe)("left");
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const tap = Gesture.Tap()
    .enabled(isTop)
    .maxDistance(10)
    .onEnd(() => {
      if (onTap) runOnJS(onTap)();
    });

  const gestures = Gesture.Race(pan, tap);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, width / 2],
      [-16, 16],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, threshold],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-threshold, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={gestures}>
      <Animated.View style={[styles.card, cardStyle]}>
        <CardFace user={user} width={width} height={height} />

        <Animated.View
          style={[styles.badgeLayer, likeStyle]}
          pointerEvents="none"
        >
          <View style={styles.badgeCircle}>
            <MaterialCommunityIcons
              name="heart"
              size={40}
              color={theme.colors.primary}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.badgeLayer, nopeStyle]}
          pointerEvents="none"
        >
          <View style={styles.badgeCircle}>
            <MaterialCommunityIcons name="close" size={40} color={CROSS_COLOR} />
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
