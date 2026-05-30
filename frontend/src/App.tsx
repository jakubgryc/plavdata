import { Box } from "@mantine/core";
import { Outlet } from "react-router";
import Navbar from "./components/Navbar";
import { useTheme } from "./hooks/useTheme";

function App() {
  const { colorScheme, theme } = useTheme();
  const bgColor = colorScheme === "dark" ? theme.other.appBg.dark : theme.other.appBg.light;

  return (
    <Box className="flex flex-col h-screen" style={{ backgroundColor: bgColor }}>
      <Navbar />
      <main className="container mx-auto flex-grow overflow-y-auto px-4 md:px-20 pb-32 md:pb-16 pt-12">
        <Outlet />
      </main>
    </Box>
  );
}

export default App;
