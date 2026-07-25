import { Stack } from "expo-router";

export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" }
      }}
    ></Stack>
  );
}
