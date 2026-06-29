import { useAppSelector } from "@/store/hooks";
import { Redirect, Stack } from "expo-router";
import { useAuth0 } from "react-native-auth0";

export default function SetupLayout() {
  const { user: isAuth } = useAuth0();
  const user = useAppSelector((state) => state.user);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" }
      }}
    ></Stack>
  );
}
