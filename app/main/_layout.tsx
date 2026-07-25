import { Tabs } from "expo-router";
import { useTheme } from "react-native-paper";
import Navigation from "@/components/Navigation";
import { AppTheme } from "@/types/types";

export default function MainLayout() {
  const theme = useTheme<AppTheme>();

  return (
    <Tabs
      tabBar={(props) => <Navigation {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        animation: "shift",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Search" }} />
      <Tabs.Screen name="matches/index" options={{ title: "Matches" }} />
      <Tabs.Screen name="messages/index" options={{ title: "Messages" }} />
      <Tabs.Screen name="profile/index" options={{ title: "Profile" }} />
    </Tabs>
  );
}
