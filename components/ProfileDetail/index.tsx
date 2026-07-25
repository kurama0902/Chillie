import { useEffect, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Chip, IconButton, Portal, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AppTheme, MockUser } from "@/types/types";
import Gallery from "./Gallery";
import { getStyles } from "./styles";

const ABOUT_LIMIT = 250;

type Props = {
  user: MockUser;
  onClose: () => void;
  onLike: () => void;
  onSkip: () => void;
};

export default function ProfileDetail({
  user,
  onClose,
  onLike,
  onSkip,
}: Props) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const photoHeight = Math.round(height * 0.46);
  const styles = getStyles(theme, photoHeight);

  const translateY = useSharedValue(height);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 260 });
    translateY.value = withTiming(0, { duration: 340 });
  }, [bgOpacity, translateY]);

  const close = (after: () => void) => {
    bgOpacity.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(height, { duration: 260 }, (finished) => {
      if (finished) runOnJS(after)();
    });
  };

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const [expanded, setExpanded] = useState(false);
  const isLong = user.description.length > ABOUT_LIMIT;
  const shownDescription =
    isLong && !expanded
      ? user.description.slice(0, ABOUT_LIMIT).trimEnd() + "…"
      : user.description;

  return (
    <Portal>
      <Animated.View style={[styles.overlay, bgStyle]}>
        <Animated.View style={[styles.content, contentStyle]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 40 },
            ]}
          >
            <View>
              <Image
                source={{ uri: user.image_url }}
                style={styles.photo}
                contentFit="cover"
              />
              <IconButton
                icon="chevron-down"
                size={26}
                iconColor="#fff"
                style={[styles.closeBtn, { top: insets.top + 18 }]}
                hitSlop={8}
                accessibilityLabel="Hide profile details"
                onPress={() => close(onClose)}
              />
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.skipBtn} onPress={() => close(onSkip)}>
                <MaterialCommunityIcons
                  name="close"
                  size={28}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
              <Pressable style={styles.likeBtn} onPress={() => close(onLike)}>
                <MaterialCommunityIcons name="heart" size={34} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.body}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {user.name} {user.lastname}, {user.age}
                  </Text>
                  <Text style={styles.job}>{user.job}</Text>
                </View>
                <Pressable style={styles.sendBtn} onPress={() => {}}>
                  <MaterialCommunityIcons
                    name="send"
                    size={22}
                    color={theme.colors.primary}
                  />
                </Pressable>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.locationRow}>
                  <Text style={styles.cityText}>{user.city}</Text>
                  <Chip
                    icon="map-marker"
                    style={styles.distanceChip}
                    textStyle={styles.distanceChipText}
                  >
                    {user.distance}
                  </Chip>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.aboutText}>{shownDescription}</Text>
                {isLong && (
                  <Pressable onPress={() => setExpanded((e) => !e)}>
                    <Text style={styles.readMore}>
                      {expanded ? "read less" : "read more"}
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Interests</Text>
                <View style={styles.chipsWrap}>
                  {user.hobbies.map((hobby) => (
                    <Chip key={hobby} mode="outlined" style={styles.interestChip}>
                      {hobby}
                    </Chip>
                  ))}
                </View>
              </View>

              <Gallery images={user.additionalProfileImageUrls} />
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Portal>
  );
}
