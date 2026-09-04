import { View } from "react-native";
import { Image } from "expo-image";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTheme, MatchUser } from "@/types/types";
import { getStyles } from "./styles";

type Props = {
  user: MatchUser;
  width: number;
  height: number;
};

export default function CardFace({ user, width, height }: Props) {
  const theme = useTheme<AppTheme>();
  const styles = getStyles(theme, width, height);

  return (
    <>
      <Image
        source={{ uri: user.image_url }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      <View style={styles.pill}>
        <MaterialCommunityIcons name="map-marker" size={14} color="#fff" />
        <Text style={styles.pillText}>
          {user.city} · {user.distance}
        </Text>
      </View>

      <View style={styles.scrim} pointerEvents="none" />

      <View style={styles.info} pointerEvents="none">
        <Text style={styles.name}>
          {user.name} {user.lastname}, {user.age}
        </Text>
        <Text style={styles.job}>{user.job}</Text>
      </View>
    </>
  );
}
