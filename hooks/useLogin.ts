import { baseApi } from "@/store/api";
import { useAppDispatch } from "@/store/hooks";
import { updateUser } from "@/store/userSlice";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth0 } from "react-native-auth0";

export default function useLogin() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAuth0();

  useEffect(() => {
    async function handleLogin() {
      if (!user?.email) return;

      const userData = await dispatch(
        baseApi.endpoints.login.initiate({ email: user.email }),
      );

      if (userData.error) {
        return;
      }

      if (userData.data) {
        dispatch(updateUser(userData.data));
        if (userData.data?.isNew) {
          router.push("/(auth)/userSetup");
        }
      }
    }

    handleLogin();
  }, [user]);
}
