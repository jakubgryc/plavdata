import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  TextInput,
  Loader,
  Paper,
  Text,
  Stack,
  Group,
  UnstyledButton,
  Box,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { API_BASE_URL } from "../../config";
import type { SwimmerSearchResult } from "../schema/types";

function SwimmerSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(searchQuery, 300);
  const [results, setResults] = useState<SwimmerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch results when debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/swimmers/search?query=${encodeURIComponent(debouncedQuery)}`,
        );
        if (response.ok) {
          const data: SwimmerSearchResult[] = await response.json();
          setResults(data);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Error searching swimmers:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleSwimmerClick = (swimmerId: number) => {
    setSearchQuery("");
    setResults([]);
    setIsFocused(false);
    navigate(`/swimmer/${swimmerId}`);
  };

  const showDropdown = isFocused && (results.length > 0 || isLoading);

  return (
    <Box ref={searchRef} pos="relative" w="100%" maw={{ base: 100, md: 300 }}>
      <TextInput
        placeholder="Hledat plavce..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        leftSection={<IconSearch size={16} />}
        rightSection={isLoading ? <Loader size={16} /> : null}
        size="sm"
      />

      {showDropdown && (
        <Paper
          shadow="md"
          p="xs"
          pos="absolute"
          top="calc(100% + 4px)"
          left={{ base: -150, md: 0 }}
          right={{ base: "auto", md: 0 }}
          w={{ base: "min(350px, 90vw)", md: "auto" }}
          style={{
            zIndex: 1000,
            maxHeight: "400px",
            overflowY: "auto",
          }}
          withBorder
        >
          <Stack gap="xs">
            {isLoading ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Vyhledávání...
              </Text>
            ) : results.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Žádní plavci nenalezeni
              </Text>
            ) : (
              results.map((swimmer) => (
                <UnstyledButton
                  key={swimmer.id}
                  onClick={() => handleSwimmerClick(swimmer.id)}
                  p="xs"
                  style={{
                    borderRadius: "var(--mantine-radius-sm)",
                    width: "100%",
                    transition: "background-color 0.2s",
                    backgroundColor: "transparent",
                  }}
                  className="swimmer-search-result-button"
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Box>
                      <Text size="sm" fw={500}>
                        {swimmer.surname} {swimmer.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {swimmer.birthYear}
                        {swimmer.group ? ` • ${swimmer.group}` : ""}
                      </Text>
                    </Box>
                  </Group>
                </UnstyledButton>
              ))
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

export default SwimmerSearch;
