import { useMantineColorScheme, useMantineTheme } from "@mantine/core";

export function useTheme() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  return { colorScheme, setColorScheme, theme };
}
