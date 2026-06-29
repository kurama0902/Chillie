import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { darkTheme, lightTheme } from "@/theme";

type ThemeContextValue = {
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme !== "light");

  const value = useMemo(
    () => ({
      isDark,
      toggleTheme: () => setIsDark((prev) => !prev),
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={isDark ? darkTheme : lightTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
