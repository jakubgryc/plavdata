import {
  ActionIcon,
  Burger,
  Button,
  Drawer,
  Flex,
  Menu,
  Text,
  useComputedColorScheme,
} from "@mantine/core";
import {
  IconCalendarCheck,
  IconClock,
  IconDatabaseImport,
  IconLock,
  IconLogout,
  IconMoon,
  IconShield,
  IconSun,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { formatTimeRemaining, useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import SwimmerSearch from "./SwimmerSearch";
import ChangePasswordModal from "./shared/ChangePasswordModal";

type LinkState = { isActive: boolean };

const Navbar = () => {
  const [opened, setOpened] = useState(false);
  const [changePasswordOpened, setChangePasswordOpened] = useState(false);
  const { setColorScheme } = useTheme();
  const computedColorScheme = useComputedColorScheme("light");
  const { isAuthenticated, username, role, timeRemaining, logout } = useAuth();

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");
  };

  const navLinkStyle = ({ isActive }: LinkState) => ({
    fontWeight: isActive ? 600 : 500,
    margin: "0 8px",
    fontSize: "14px",
    color: isActive ? "var(--mantine-color-blue-5)" : "var(--mantine-color-text)",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  });

  const navLinks = (
    <>
      <NavLink
        to="/"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
        className="textHoverLink"
      >
        Úvod
      </NavLink>
      <NavLink
        to="/competitions"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
        className="textHoverLink"
      >
        Závody
      </NavLink>
      <NavLink
        to="/results"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
        className="textHoverLink"
      >
        Výsledky
      </NavLink>
      <NavLink
        to="/compare-swimmers"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
        className="textHoverLink"
      >
        Porovnání plavců
      </NavLink>
      <NavLink
        to="/personal-bests"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
        className="textHoverLink"
      >
        Osobní rekordy
      </NavLink>
      <NavLink
        to="/club-records"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
        className="textHoverLink"
      >
        Klubové rekordy
      </NavLink>
      <NavLink
        to="/utils"
        style={navLinkStyle}
        onClick={() => setOpened(false)}
        className="textHoverLink"
      >
        Nástroje
      </NavLink>
      {isAuthenticated && (
        <NavLink
          to="/attendance"
          style={navLinkStyle}
          onClick={() => setOpened(false)}
          className="textHoverLink"
        >
          Docházka
        </NavLink>
      )}
    </>
  );

  return (
    <Flex
      justify="space-between"
      align="center"
      h={48}
      px={{ base: "xs", sm: "md" }}
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
      <Flex align="center" gap="xs">
        <img src="/swimmer-icon.svg" alt="logo" className="h-7 w-7 md:h-8 md:w-8" />
        <NavLink to="/" style={{ textDecoration: "none" }}>
          <Text size="sm" fw={600} c="var(--mantine-color-text)">
            Plavdata
          </Text>
        </NavLink>

        <Flex align="center" gap="sm" visibleFrom="md" ml="xl">
          {navLinks}
        </Flex>

        <Flex ml={{ base: "xs", md: "md" }}>
          <SwimmerSearch />
        </Flex>
      </Flex>

      <Flex align="center" gap="xs">
        {!isAuthenticated && (
          <Button
            component={NavLink}
            to="/admin"
            variant="light"
            size="xs"
            px="xs"
            leftSection={<IconUser size={14} />}
          >
            Přihlásit
          </Button>
        )}
        <Flex visibleFrom="md">
          {isAuthenticated && username && (
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <Button variant="subtle" leftSection={<IconUser size={14} />} size="xs" px="xs">
                  <Flex direction="column" align="flex-start" gap={0}>
                    <Text size="xs" fw={500}>
                      {username}
                    </Text>
                    <Text size="xs" c="dimmed">
                      <IconClock size={10} style={{ display: "inline", marginRight: 4 }} />
                      {formatTimeRemaining(timeRemaining)}
                    </Text>
                  </Flex>
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  component={NavLink}
                  to="/attendance"
                  leftSection={<IconCalendarCheck size={14} />}
                >
                  Docházka
                </Menu.Item>
                {role === "admin" && (
                  <>
                    <Menu.Item
                      component={NavLink}
                      to="/admin/control-center"
                      leftSection={<IconShield size={14} />}
                    >
                      Ovládací centrum
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      component={NavLink}
                      to="/admin/swimmers"
                      leftSection={<IconUser size={14} />}
                    >
                      Správa plavců
                    </Menu.Item>
                    <Menu.Item
                      component={NavLink}
                      to="/admin/groups"
                      leftSection={<IconUser size={14} />}
                      onClick={() => setOpened(false)}
                    >
                      Správa skupin
                    </Menu.Item>
                    <Menu.Divider />
                  </>
                )}
                <Menu.Item
                  leftSection={<IconLock size={14} />}
                  onClick={() => setChangePasswordOpened(true)}
                >
                  Změnit heslo
                </Menu.Item>
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={logout}>
                  Odhlásit se
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Flex>

        <ActionIcon
          variant="subtle"
          onClick={toggleColorScheme}
          size="md"
          aria-label="Toggle color scheme"
          visibleFrom="sm"
        >
          {computedColorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
        </ActionIcon>
        <Burger opened={opened} onClick={() => setOpened(!opened)} hiddenFrom="md" size="sm" />
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

          {isAuthenticated && username && (
            <Menu shadow="md" position="bottom" withinPortal={false}>
              <Menu.Target>
                <Button
                  variant="light"
                  leftSection={<IconUser size={16} />}
                  fullWidth
                  size="sm"
                  style={{ justifyContent: "flex-start" }}
                >
                  <Flex direction="column" align="flex-start" gap={0}>
                    <Text size="sm" fw={500}>
                      {username}
                    </Text>
                    <Text size="xs" c="dimmed">
                      <IconClock size={10} style={{ display: "inline", marginRight: 4 }} />
                      {formatTimeRemaining(timeRemaining)}
                    </Text>
                  </Flex>
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  component={NavLink}
                  to="/attendance"
                  leftSection={<IconCalendarCheck size={14} />}
                  onClick={() => setOpened(false)}
                >
                  Docházka
                </Menu.Item>
                {role === "admin" && (
                  <>
                    <Menu.Item
                      component={NavLink}
                      to="/admin/control-center"
                      leftSection={<IconShield size={14} />}
                      onClick={() => setOpened(false)}
                    >
                      Administrace
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      component={NavLink}
                      to="/admin/swimmers"
                      leftSection={<IconUser size={14} />}
                      onClick={() => setOpened(false)}
                    >
                      Správa plavců
                    </Menu.Item>
                    <Menu.Item
                      component={NavLink}
                      to="/admin/groups"
                      leftSection={<IconUser size={14} />}
                      onClick={() => setOpened(false)}
                    >
                      Správa skupiny
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      component={NavLink}
                      to="/admin/control-center"
                      leftSection={<IconDatabaseImport size={14} />}
                      onClick={() => setOpened(false)}
                    >
                      Ovládací centrum
                    </Menu.Item>
                  </>
                )}
                <Menu.Item
                  leftSection={<IconLock size={14} />}
                  onClick={() => {
                    setChangePasswordOpened(true);
                    setOpened(false);
                  }}
                >
                  Změnit heslo
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={() => {
                    logout();
                    setOpened(false);
                  }}
                >
                  Odhlásit se
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}

          <Button
            variant="light"
            leftSection={
              computedColorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />
            }
            onClick={toggleColorScheme}
            fullWidth
            size="sm"
            style={{ justifyContent: "flex-start" }}
          >
            {computedColorScheme === "dark" ? "Světlý režim" : "Tmavý režim"}
          </Button>
        </Flex>
      </Drawer>

      <ChangePasswordModal
        opened={changePasswordOpened}
        onClose={() => setChangePasswordOpened(false)}
      />
    </Flex>
  );
};

export default Navbar;
