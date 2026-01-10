import { NavLink } from "react-router";
import { useState } from "react";
import {
  Burger,
  Drawer,
  Flex,
  Text,
  Button,
  Space,
  ActionIcon,
  useComputedColorScheme,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useTheme } from "../hooks/useTheme";

type LinkState = { isActive: boolean };

const Navbar = () => {
  const [opened, setOpened] = useState(false);
  const { setColorScheme } = useTheme();
  const computedColorScheme = useComputedColorScheme("light");

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");
  };

  const navLinkStyle = ({ isActive }: LinkState) => ({
    fontWeight: "bold",
    margin: "0 10px",
    color: isActive
      ? "var(--mantine-color-blue-5)"
      : "var(--mantine-color-text)",
    textDecoration: "none",
  });

  const navLinks = (
    <>
      <NavLink to="/" style={navLinkStyle} onClick={() => setOpened(false)}>
        Domů
      </NavLink>
      <NavLink
        to="/compare-swimmers"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
      >
        Porovnání plavců
      </NavLink>
      <NavLink
        to="/personal-bests"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
      >
        Osobní rekordy
      </NavLink>
      <NavLink
        to="/club-records"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
      >
        Klubové rekordy
      </NavLink>
      <NavLink
        to="/utils"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
      >
        Nástroje
      </NavLink>
    </>
  );

  return (
    <Flex
      justify="space-between"
      align="center"
      h={48}
      px="md"
      bg="var(--mantine-color-body)"
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <Flex align="center" gap="sm" pl="md">
        <img src="/swimmer-solid.svg" alt="logo" className="h-10 w-10" />
        <Text size="lg" fw={600} c="var(--mantine-color-text)">
          Plavdata
        </Text>

        <Flex align="center" gap="sm" visibleFrom="md" ml="xl">
          {navLinks}
        </Flex>
      </Flex>

      <Flex align="center" gap="sm">
        <ActionIcon
          variant="subtle"
          onClick={toggleColorScheme}
          size="lg"
          aria-label="Toggle color scheme"
        >
          {computedColorScheme === "dark" ? (
            <IconSun size={20} />
          ) : (
            <IconMoon size={20} />
          )}
        </ActionIcon>
        <Button variant="subtle" visibleFrom="md">
          Přihlásit
        </Button>
        <Burger
          opened={opened}
          onClick={() => setOpened(!opened)}
          hiddenFrom="md"
        />
      </Flex>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title="Menu"
        padding="md"
        size="sm"
        hiddenFrom="md"
      >
        <Flex direction="column" gap="md">
          {navLinks}
          <Space h="md" />
          <Button variant="subtle">Přihlásit</Button>
        </Flex>
      </Drawer>
    </Flex>
  );
};

export default Navbar;
