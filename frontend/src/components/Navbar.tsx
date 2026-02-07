import { NavLink } from "react-router";
import { useState } from "react";
import {
  Burger,
  Drawer,
  Flex,
  Text,
  ActionIcon,
  useComputedColorScheme,
  Button,
  Menu,
} from "@mantine/core";
import {
  IconSun,
  IconMoon,
  IconUser,
  IconLogout,
  IconClock,
} from "@tabler/icons-react";
import { useTheme } from "../hooks/useTheme";
import { useAuth, formatTimeRemaining } from "../hooks/useAuth";
import SwimmerSearch from "./SwimmerSearch";

type LinkState = { isActive: boolean };

const Navbar = () => {
  const [opened, setOpened] = useState(false);
  const { setColorScheme } = useTheme();
  const computedColorScheme = useComputedColorScheme("light");
  const { isAuthenticated, username, timeRemaining, logout } = useAuth();

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
    whiteSpace: "nowrap" as const,
  });

  const navLinks = (
    <>
      <NavLink to="/" style={navLinkStyle} onClick={() => setOpened(false)}>
        Úvod
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
        <img src="/swimmer-solid.svg" alt="logo" className="h-8 w-8" />
        <NavLink to="/" style={{ textDecoration: "none" }}>
          <Text size="lg" fw={600} c="var(--mantine-color-text)">
            Plavdata
          </Text>
        </NavLink>

        <Flex align="center" gap="sm" visibleFrom="md" ml="xl">
          {navLinks}
        </Flex>

        <Flex ml="md">
          <SwimmerSearch />
        </Flex>
      </Flex>

      <Flex align="center" gap="sm">
        {isAuthenticated && username && (
          <Menu shadow="md" width={220} position="bottom-end">
            <Menu.Target>
              <Button
                variant="subtle"
                leftSection={<IconUser size={16} />}
                size="sm"
              >
                <Flex direction="column" align="flex-start" gap={0}>
                  <Text size="sm" fw={500}>
                    {username}
                  </Text>
                  <Text size="xs" c="dimmed">
                    <IconClock
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    {formatTimeRemaining(timeRemaining)}
                  </Text>
                </Flex>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                component={NavLink}
                to="/admin/swimmers"
                leftSection={<IconUser size={14} />}
              >
                Správa plavců
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={logout}
              >
                Odhlásit se
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}

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
        hiddenFrom="sm"
      >
        <Flex direction="column" gap="md">
          {navLinks}
        </Flex>
      </Drawer>
    </Flex>
  );
};

export default Navbar;
