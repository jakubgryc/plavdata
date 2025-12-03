import { NavLink } from "react-router";
import { useState } from "react";
import { Burger, Drawer, Flex, Text, Button, Space } from "@mantine/core";

type LinkState = { isActive: boolean };

const Navbar = () => {
  const [opened, setOpened] = useState(false);

  const navLinkStyle = ({ isActive }: LinkState) => ({
    fontWeight: "bold",
    margin: "0 10px",
    color: isActive ? "var(--color-primary)" : "black",
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
    </>
  );

  return (
    <Flex
      justify="space-between"
      align="center"
      h={48}
      px="md"
      className="bg-white border-b"
      pos="fixed"
      top={0}
      left={0}
      right={0}
      style={{ zIndex: 10 }}
    >
      <Flex align="center" gap="sm" pl="md">
        <img src="/swimmer-solid.svg" alt="logo" className="h-10 w-10" />
        <Text
          size="lg"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-text)",
          }}
        >
          Plavdata
        </Text>

        <Flex align="center" gap="sm" visibleFrom="md" ml="xl">
          {navLinks}
        </Flex>
      </Flex>

      <Flex align="center" gap="sm">
        <Button
          variant="transparent"
          style={{ color: "var(--color-secondary)" }}
          visibleFrom="md"
        >
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
          <Button
            variant="transparent"
            style={{ color: "var(--color-secondary)" }}
          >
            Přihlásit
          </Button>
        </Flex>
      </Drawer>
    </Flex>
  );
};

export default Navbar;
