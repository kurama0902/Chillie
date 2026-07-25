import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTheme, MockUser } from "@/types/types";
import { useDislikeUserMutation, useLikeUserMutation } from "@/store/api";
import ProfileDetail from "@/components/ProfileDetail";
import SwipeCard from "./SwipeCard";
import { getStyles } from "./styles";

type Props = {
  data: MockUser[];
};

export default function SwipeCards({ data }: Props) {
  const theme = useTheme<AppTheme>();
  const { width, height } = useWindowDimensions();

  const cardWidth = width - 40;
  const cardHeight = Math.round(height * 0.6);

  const styles = getStyles(theme, cardWidth, cardHeight);

  const [index, setIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  const [likeUser] = useLikeUserMutation();
  const [dislikeUser] = useDislikeUserMutation();

  const sendDecision = (dir: "left" | "right", user: MockUser) => {
    const mutate = dir === "right" ? likeUser : dislikeUser;
    mutate({ userID: user.id })
      .unwrap()
      .catch((error) => console.error(`${dir} reaction failed:`, error));
  };

  const advance = () => {
    setDetailOpen(false);
    setIndex((i) => i + 1);
  };

  if (index >= data.length) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons
          name="cards-outline"
          size={48}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={styles.emptyText}>No more people nearby</Text>
      </View>
    );
  }

  const current = data[index];
  const next = data[index + 1];

  const stack = [next, current].filter(Boolean) as MockUser[];

  return (
    <View style={styles.stack}>
      {stack.map((user) => (
        <SwipeCard
          key={user.image_url}
          user={user}
          width={cardWidth}
          height={cardHeight}
          isTop={user === current}
          onSwipe={(dir) => {
            sendDecision(dir, user);
            setIndex((i) => i + 1);
          }}
          onTap={() => setDetailOpen(true)}
        />
      ))}

      {detailOpen && (
        <ProfileDetail
          user={current}
          onClose={() => setDetailOpen(false)}
          onLike={() => {
            sendDecision("right", current);
            advance();
          }}
          onSkip={() => {
            sendDecision("left", current);
            advance();
          }}
        />
      )}
    </View>
  );
}
