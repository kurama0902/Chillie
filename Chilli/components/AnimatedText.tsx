import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const AnimatedChar = Animated.createAnimatedComponent(Text);

const POWER4_OUT = Easing.out(Easing.poly(5));

type CharProps = {
  char: string;
  index: number;
  trigger: number;
  variant?: React.ComponentProps<typeof Text>["variant"];
  style?: StyleProp<TextStyle>;
  x: number;
  duration: number;
  stagger: number;
  startDelay: number;
};

function Char({
  char,
  index,
  trigger,
  variant,
  style,
  x,
  duration,
  stagger,
  startDelay,
}: CharProps) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      startDelay + index * stagger,
      withTiming(1, { duration, easing: POWER4_OUT }),
    );
  }, [trigger, index, stagger, duration, startDelay, x, p]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: (1 - p.value) * x }],
  }));

  return (
    <AnimatedChar variant={variant} style={[style, animatedStyle]}>
      {char}
    </AnimatedChar>
  );
}

export type AnimatedTextHandle = { replay: () => void };

type AnimatedTextProps = {
  text: string;
  variant?: React.ComponentProps<typeof Text>["variant"];
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  x?: number;
  duration?: number;
  stagger?: number;
  startDelay?: number;
  replayOnTap?: boolean;
};

const AnimatedText = forwardRef<AnimatedTextHandle, AnimatedTextProps>(
  function AnimatedText(
    {
      text,
      variant,
      style,
      containerStyle,
      x = 150,
      duration = 700,
      stagger = 40,
      startDelay = 0,
      replayOnTap = true,
    },
    ref,
  ) {
    const [trigger, setTrigger] = useState(0);
    const replay = () => setTrigger((t) => t + 1);
    useImperativeHandle(ref, () => ({ replay }), []);

    const words = text.split(" ");
    let charIndex = 0;

    const content = (
      <View style={[styles.row, containerStyle]}>
        {words.map((word, wi) => (
          <View key={wi} style={styles.word}>
            {[...word].map((ch, ci) => {
              const i = charIndex++;
              return (
                <Char
                  key={ci}
                  char={ch}
                  index={i}
                  trigger={trigger}
                  variant={variant}
                  style={style}
                  x={x}
                  duration={duration}
                  stagger={stagger}
                  startDelay={startDelay}
                />
              );
            })}
            {wi < words.length - 1 && (
              <Text variant={variant} style={style}>
                {" "}
              </Text>
            )}
          </View>
        ))}
      </View>
    );

    if (replayOnTap) {
      return <Pressable onPress={replay}>{content}</Pressable>;
    }
    return content;
  },
);

export default AnimatedText;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  word: {
    flexDirection: "row",
  },
});
