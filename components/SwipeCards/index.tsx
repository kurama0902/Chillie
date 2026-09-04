import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTheme, MatchUser } from "@/types/types";
import { useDislikeUserMutation } from "@/store/api";
import { useWebSocket } from "@/context/WebSocketContext";
import ProfileDetail from "@/components/ProfileDetail";
import SwipeCard from "./SwipeCard";
import { getStyles } from "./styles";

type Props = {
  data: MatchUser[];
};

export default function SwipeCards({ data }: Props) {
  const theme = useTheme<AppTheme>();
  const { width, height } = useWindowDimensions();

  const cardWidth = width - 40;
  const cardHeight = Math.round(height * 0.6);

  const styles = getStyles(theme, cardWidth, cardHeight);

  const [index, setIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  const { sendEvent } = useWebSocket();
  const [dislikeUser] = useDislikeUserMutation();

  const sendDecision = (dir: "left" | "right", user: MatchUser) => {
    if (dir === "right") {
      sendEvent({
        type: "likeUser",
        payload: { userID: user.userID },
      });
      return;
    }

    dislikeUser({ userID: user.userID })
      .unwrap()
      .catch((error) => console.error("left reaction failed:", error));
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

  const stack = [next, current].filter(Boolean) as MatchUser[];

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
