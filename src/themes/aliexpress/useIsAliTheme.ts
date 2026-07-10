import { useTheme } from "@/theme/ThemeProvider";

export function useIsAliTheme() {
  const { active } = useTheme();
  // AliExpress is the default skin — treat unset/unknown as AliExpress too.
  if (!active) return true;
  return active.slug === "aliexpress";
}
