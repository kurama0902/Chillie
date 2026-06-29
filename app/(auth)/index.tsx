import { useWindowDimensions, View } from "react-native";
import Slider from "@/components/Slider";
import { Button, Text, useTheme } from "react-native-paper";
import { Image } from "expo-image";
import { useAuth0 } from "react-native-auth0";
import { auth0 } from "@/lib/auth0";
import { useAppDispatch } from "@/store/hooks";
import { updateUser } from "@/store/userSlice";
import useLogin from "@/hooks/useLogin";
import { Redirect } from "expo-router";
import { createStyles } from "./styles";


const Auth = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const { authorize } = useAuth0();

  const dispatch = useAppDispatch();

  const styles = createStyles(theme);

  useLogin();

  async function handleAuth() {
    try {
      const result = await authorize({
        audience: "https://chillie.top",
        scope: "openid profile email offline_access",
      });
      const { accessToken } = result;

      await auth0.credentialsManager.saveCredentials(result);

      dispatch(updateUser({ accessToken }));
    } catch (e) {
      console.error("Login error:", e);
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
      <View style={styles.slide}>
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
          labelStyle={styles.btnTextStyle}
          style={styles.btnStyle}
          mode="contained"
        >
          Log in
        </Button>
        <Button
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
