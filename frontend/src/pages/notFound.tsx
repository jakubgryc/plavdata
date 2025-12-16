import { Center, Title, Text, Button } from "@mantine/core";

export default function NotFound() {
  return (
    <Center style={{ minHeight: "60vh" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
        }}
      >
        {/* Simple inline penguin SVG */}
        <svg
          width="160"
          height="160"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(2,1) scale(0.9)">
            <ellipse cx="10" cy="15" rx="6" ry="7" fill="#111827" />
            <ellipse cx="10" cy="12" rx="4.5" ry="5.5" fill="#ffffff" />
            <circle cx="8" cy="10" r="0.8" fill="#111827" />
            <circle cx="12" cy="10" r="0.8" fill="#111827" />
            <path
              d="M10 13c-1 0-1.5.7-1.5 1.5S9 16 10 16s1.5-.5 1.5-1.5S11 13 10 13z"
              fill="#FBBF24"
            />
            <path
              d="M6 19c0 1.5 3 2.5 4 2.5s4-1 4-2.5"
              stroke="#111827"
              strokeWidth="0.6"
              fill="none"
            />
          </g>
        </svg>

        <Title order={2}>Jejda — tady nic není</Title>
        <Text color="dimmed" style={{ maxWidth: 420, textAlign: "center" }}>
          Stránka, kterou hledáte, neexistuje. Zkuste se vrátit na domovskou
          stránku.
        </Text>

        <Button component="a" href="/" variant="outline">
          Přejít na domovskou stránku
        </Button>
      </div>
    </Center>
  );
}
