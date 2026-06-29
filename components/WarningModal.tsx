import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AppTheme } from "@/types/types";

type Props = {
  message: string;
  onDismiss: () => void;
};

export default function WarningModal({ message, onDismiss }: Props) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme);

  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, context.value.y + event.translationY);
    })
    .onEnd((event) => {
      if (translateY.value > 80 || event.velocityY > 500) {
        translateY.value = withSpring(300, { damping: 20 }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        entering={SlideInDown.duration(280)}
        exiting={SlideOutDown.duration(280)}
        style={[styles.drawer, animatedStyle]}
      >
        <View style={styles.handle} />
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={26}
            color={theme.colors.error}
          />
          <Text style={styles.text}>{message}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    drawer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 12,
      paddingBottom: 28,
      paddingHorizontal: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: theme.colors.dropdownBackgroundColor,
      elevation: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      zIndex: 2000,
    },
    handle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.onSurfaceVariant,
      opacity: 0.4,
      marginBottom: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    text: {
      flex: 1,
      color: theme.colors.onSurface,
      fontSize: 16,
      lineHeight: 22,
    },
  });
