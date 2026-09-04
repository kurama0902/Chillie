import { darkTheme } from "@/theme";
import { MatchUser } from "@/types/types";
import { ImageBackground } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, Text } from "react-native-paper";

function MatchCard({
  user,
  handleProfileDetailOpen,
  likeUser,
  skipUser,
}: {
  user: MatchUser;
  handleProfileDetailOpen: (user: MatchUser) => void;
  likeUser: (user: MatchUser) => void;
  skipUser: (user: MatchUser) => void;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => handleProfileDetailOpen(user)}
    >
        <ImageBackground
          contentFit="none"
          source={{ uri: user.image_url }}
          style={[styles.cardWrap]}
          imageStyle={styles.image}
        >
          <Text style={{ color: darkTheme.colors.onPrimary }}>
            {user.name} {user.lastname}, {user.age}
          </Text>
          <View style={styles.btnWrap}>
            <Button
              onPress={(e) => {
                e.stopPropagation();
                likeUser(user);
              }}
            >
              <Icon color="#fff" source="heart" size={30} />
            </Button>
            <Button
              onPress={(e) => {
                e.stopPropagation();
                skipUser(user);
              }}
            >
              <Icon color="#fff" source="close" size={30} />
            </Button>
          </View>
        </ImageBackground>
    </Pressable>
  );
}

export default React.memo(MatchCard);

const styles = StyleSheet.create({
  card: {
    width: "100%",
    aspectRatio: 9 / 16,
  },
  cardWrap: {
    flex: 1,
    padding: 5,
    justifyContent: "flex-end",
    position: "relative"
  },

  btnWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  image: {    
    borderRadius: 8,
  }
});
