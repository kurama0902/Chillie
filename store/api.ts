import { UserState } from "@/types/types";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from ".";
import { auth0 } from "@/lib/auth0";

type loginPayload = {
  email: string;
};

type basicUserSetupPayload = {
  name: string;
  lastname: string;
  email: string;
  date_of_birth: string;
  interests: string[];
  languages: string[];
  location: string;
  preferableLocation: string[];
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.EXPO_PUBLIC_BASE_URL,
    prepareHeaders: async (headers, { getState }) => {
      let token: string | undefined;
      try {
        const credentials = await auth0.credentialsManager.getCredentials(
          undefined,
          60,
        );
        token = credentials?.accessToken;
      } catch {
        token = (getState() as RootState).user?.accessToken ?? undefined;
      }

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["userData"],
  endpoints: (build) => ({
    getUserData: build.query<UserState, void>({
      query: () => ({ url: "getUserData" }),
      transformResponse: (response: UserState, meta, arg) =>
        response,
      transformErrorResponse: (
        response: { status: string | number },
        meta,
        arg,
      ) => response.status,
      providesTags: ["userData"],
    }),
    login: build.mutation<UserState, loginPayload>({
      query: ({ email }) => ({
        url: "login",
        method: "POST",
        body: { email },
      }),
      transformResponse: (response: UserState, meta, arg) =>
        response,
    }),
    basicUserSetup: build.mutation<UserState, basicUserSetupPayload>({
      query: (body) => ({
        url: "basicUserSetup",
        method: "POST",
        body,
      }),
      transformResponse: (response: UserState, meta, arg) =>
        response,
      invalidatesTags: ["userData"],
    }),
  }),
});
