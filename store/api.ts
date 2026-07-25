import { MockUser, UserLocation, UserState } from "@/types/types";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { auth0 } from "@/lib/auth0";
import { getFingerprint } from "@/lib/fingerprint";

type loginPayload = {
  email: string;
};

type signUpPayload = {
  email: string;
  password: string;
};

type verifyEmailPayload = {
  email: string;
  otpCode: string;
};

type getFilteredDataPayload = {
  interestedIn: string;
  distance: string;
  age: [number, number];
  sexualOrientation: string;
  interests: string[];
  languages: string[];
  preferableLocation: string[];
};

type likePayload = {
  userID: string
}

type dislikePayload = {
  userID: string
}

const serializeParams = (params: Record<string, unknown>): string =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map(
            (item) =>
              `${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`,
          )
        : [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`],
    )
    .join("&");

const normalizeLocation = (location: unknown): UserLocation => {
  if (typeof location === "string") {
    return { lat: "", lng: "", city: location, country: "" };
  }
  if (location && typeof location === "object") {
    const l = location as Partial<UserLocation>;
    return {
      lat: l.lat ?? "",
      lng: l.lng ?? "",
      city: l.city ?? "",
      country: l.country ?? "",
    };
  }
  return { lat: "", lng: "", city: "", country: "" };
};

const normalizeUser = (user: UserState): UserState => {
  if (!user) return user;
  const orientation = user.sexualOrientation as unknown as
    | string
    | string[]
    | undefined;
  return {
    ...user,
    sexualOrientation: Array.isArray(orientation)
      ? orientation
      : orientation
        ? [orientation]
        : [],
    ...(user.location == null
      ? {}
      : { location: normalizeLocation(user.location) }),
  };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_BASE_URL,
    paramsSerializer: serializeParams,
    prepareHeaders: async (headers) => {
      try {
        const credentials = await auth0.credentialsManager.getCredentials(
          undefined,
          60,
        );
        if (credentials?.accessToken) {
          headers.set("Authorization", `Bearer ${credentials.accessToken}`);
        }
      } catch {
      }

      try {
        headers.set("X-Fingerprint", await getFingerprint());
      } catch {
      }

      return headers;
    },
  }),
  tagTypes: ["userData"],
  endpoints: (build) => ({
    getUserData: build.query<UserState, void>({
      query: () => ({ url: "getUserData" }),
      transformResponse: (response: UserState) => normalizeUser(response),
      transformErrorResponse: (
        response: { status: string | number },
        meta,
        arg,
      ) => response.status,
      providesTags: ["userData"],
    }),
    getFilteredData: build.query<MockUser[], getFilteredDataPayload>({
      query: (filters) => ({ url: "getFilteredData", params: filters }),
      transformResponse: (response: MockUser[], meta, arg) => response,
      transformErrorResponse: (
        response: { status: string | number },
        meta,
        arg,
      ) => response.status,
    }),
    likeUser: build.mutation<void, likePayload>({
      query: ({ userID }) => ({
        url: "likeUser",
        method: "POST",
        body: { userID },
      }),
      transformResponse: (response: void, meta, arg) => response,
    }),
    dislikeUser: build.mutation<void, dislikePayload>({
      query: ({ userID }) => ({
        url: "dislikeUser",
        method: "POST",
        body: { userID },
      }),
      transformResponse: (response: void, meta, arg) => response,
    }),
    login: build.query<UserState, loginPayload>({
      query: ({ email }) => ({
        url: "login",
        method: "POST",
        body: { email },
      }),
      transformResponse: (response: UserState) => normalizeUser(response),
    }),
    basicUserSetup: build.mutation<UserState, FormData>({
      query: (body) => ({
        url: "basicUserSetup",
        method: "POST",
        body,
      }),
      transformResponse: (response: UserState) => normalizeUser(response),
    }),
    updateProfile: build.mutation<UserState, FormData>({
      query: (body) => ({
        url: "updateProfile",
        method: "POST",
        body,
      }),
      transformResponse: (response: UserState) => normalizeUser(response),
    }),
    updateAvatar: build.mutation<UserState, FormData>({
      query: (body) => ({
        url: "updateAvatar",
        method: "POST",
        body,
      }),
      transformResponse: (response: UserState) => normalizeUser(response),
    }),
    signUp: build.mutation<UserState, signUpPayload>({
      query: (body) => ({
        url: "signUp",
        method: "POST",
        body,
      }),
      transformResponse: (response: UserState) => normalizeUser(response),
    }),
    verifyEmail: build.mutation<UserState, verifyEmailPayload>({
      query: (body) => ({
        url: "verifyEmail",
        method: "POST",
        body,
      }),
      transformResponse: (response: UserState) => normalizeUser(response),
    }),
  }),
});

export const {
  useGetFilteredDataQuery,
  useLazyGetFilteredDataQuery,
  useLikeUserMutation,
  useDislikeUserMutation,
  useLoginQuery,
  useLazyLoginQuery,
  useBasicUserSetupMutation,
  useUpdateProfileMutation,
  useUpdateAvatarMutation,
  useSignUpMutation,
  useVerifyEmailMutation,
} = baseApi;

export const useLoginQueryState = baseApi.endpoints.login.useQueryState;
