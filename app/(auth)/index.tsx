import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Slider from "@/components/Slider";
import { Button, Text, useTheme } from "react-native-paper";
import { Image } from "expo-image";
import { useAuth0 } from "react-native-auth0";
import { jwtDecode } from "jwt-decode";
import { AUTH0_AUDIENCE, AUTH0_CUSTOM_SCHEME } from "@/lib/auth0";
import { useRouter } from "expo-router";
import { useLazyLoginQuery } from "@/store/api";
import { createStyles } from "./styles";

const Auth = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const { authorize } = useAuth0();

  const router = useRouter();

  const styles = createStyles(theme);
  const [login, { isFetching: isLoggingIn }] = useLazyLoginQuery();
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  async function handleAuth() {
    if (isAuthorizing || isLoggingIn) return;
    setIsAuthorizing(true);
    try {
      const result = await authorize(
        {
          audience: AUTH0_AUDIENCE,
          scope: "openid profile email offline_access",
          additionalParameters: {
            prompt: "login",
          },
        },
        {
          customScheme: AUTH0_CUSTOM_SCHEME,
        },
      );

      const { email, sub } = jwtDecode<{ email?: string; sub?: string }>(
        result.idToken,
      );
      if (!email || !sub) {
        throw new Error("Auth0 did not return a complete identity.");
      }

      const userData = await login({ email, auth0Sub: sub }).unwrap();
      if (userData?.isNew) {
        router.push("/(auth)/userSetup");
      } else {
        router.replace("/main");
      }
    } catch (e) {
      console.error("Login error:", e);
    } finally {
      setIsAuthorizing(false);
    }
  }

  const imagesList = [
    {
      url: "image_1",
      description: "chillie model human 1",
      header: "Real connections, zero pressure",
      text: "Match with people who value calm conversations over endless small talk and ghosting.",
    },
    {
      url: "image_2",
      description: "chillie model human 2",
      header: "Vibe-first matching",
      text: "Our algorithm pairs you by mood, energy, and lifestyle — not just photos and bios.",
    },
    {
      url: "image_3",
      description: "chillie model human 3",
      header: "Slow dating, done right",
      text: "Skip the swipe burnout. Meet a few thoughtful matches a day instead of hundreds you'll forget.",
    },
    {
      url: "image_4",
      description: "chillie model human 4",
      header: "Built for genuine humans",
      text: "Verified profiles, a kind community, and zero bots — just people actually looking to connect.",
    },
  ];

  const contentList = imagesList.map((item) => {
    return (
      <View key={item.url} style={styles.slide}>
        <View style={styles.imageWrap}>
          <Image
            contentFit="cover"
            contentPosition="top center"
            style={styles.image}
            source={{ uri: item.url }}
            alt={item.description}
          />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.headerText} variant="headlineMedium">
            {item.header}
          </Text>
          <Text style={styles.descriptionText} variant="titleLarge">
            {item.text}
          </Text>
        </View>
      </View>
    );
  });

  return (
    <View style={styles.container}>
      <Text variant="displaySmall" style={styles.title}>
        Chillie
      </Text>
      <View style={{flex: 1}}>
        <Slider
          autoPlay={true}
          style={{
            flex: 1,
          }}
          width={width}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.9,
            parallaxScrollingOffset: 50,
          }}
          contentList={contentList}
        />
      </View>
      <View style={styles.btnWrap}>
        <Button
          onPress={handleAuth}
          loading={isAuthorizing || isLoggingIn}
          disabled={isAuthorizing || isLoggingIn}
          labelStyle={styles.btnTextStyle}
          style={styles.btnStyle}
          mode="contained"
        >
          Log in
        </Button>
        <Button
          onPress={() => router.push("/(auth)/signUp")}
          labelStyle={styles.btnTextStyle}
          style={styles.btnStyle}
          mode="contained"
        >
          Sign up
        </Button>
      </View>
    </View>
  );
};

export default Auth;
