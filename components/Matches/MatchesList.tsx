import { MatchUser } from "@/types/types";
import { FlashList } from "@shopify/flash-list";
import MatchCard from "./MatchCard";
import { StyleSheet, View } from "react-native";
import React, { useCallback, useState } from "react";
import ProfileDetail from "../ProfileDetail";

type MatchesListProps = {
  users: MatchUser[];
};

export default function MatchesList({ users }: MatchesListProps) {
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [user, setUser] = useState<MatchUser | null>(null);

  const likeUser = useCallback((user: MatchUser) => {}, []);

  const skipUser = useCallback((user: MatchUser) => {}, []);

  const handleProfileDetailOpen = useCallback((user: MatchUser) => {
    setUser(user);
    setIsProfileOpen(true);
  }, []);

  return (
    <View>
      <FlashList
        numColumns={2}
        data={users}
        keyExtractor={(item) => item.userID}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MatchCard
              user={item}
              likeUser={likeUser}
              skipUser={skipUser}
              handleProfileDetailOpen={handleProfileDetailOpen}
            />
          </View>
        )}
      />

      {isProfileOpen && user ? (
        <ProfileDetail
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onLike={() => likeUser(user)}
          onSkip={() => skipUser(user)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
});
