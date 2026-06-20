import { AppShell, Container, useMantineColorScheme } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { Outlet } from "react-router";
import Navbar from "./components/Navbar";
import { useTheme } from "./hooks/useTheme";

function App() {
  const { colorScheme, theme } = useTheme();
  const { toggleColorScheme } = useMantineColorScheme();

  useHotkeys([["mod+J", () => toggleColorScheme()]]);
  const bgColor = colorScheme === "dark" ? theme.other.appBg.dark : theme.other.appBg.light;

  return (
    <AppShell
      header={{ height: 48 }}
      styles={{
        main: { backgroundColor: bgColor },
      }}
    >
      <AppShell.Header>
        <Navbar />
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl" className="md:pb-16 pt-8">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
