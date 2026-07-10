import { useTheme } from "@/theme/ThemeProvider";

export function useIsAliTheme() {
  const { active } = useTheme();
  return active?.slug === "aliexpress";
}
