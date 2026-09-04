import Auth0 from "react-native-auth0";

export const AUTH0_AUDIENCE = "https://chillie.top";
export const AUTH0_CUSTOM_SCHEME = "com.anonymous.chilli.auth0";

export const auth0 = new Auth0({
  domain: process.env.EXPO_PUBLIC_AUTH0DOMAIN as string,
  clientId: process.env.EXPO_PUBLIC_CLIENT_ID as string,
});
