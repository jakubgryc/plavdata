import {
  Alert,
  Anchor,
  Button,
  Center,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAt, IconUser } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { NavLink } from "react-router";
import { authApi } from "../utils/auth";

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authApi.register(email, username);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrace se nezdařila");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Center mb="xl">
        <Title order={1}>Registrace trenéra</Title>
      </Center>

      <Paper withBorder shadow="md" p={30} radius="md">
        {isSuccess ? (
          <Stack gap="md">
            <Title order={3}>Registrace odeslána</Title>
            <Text>
              Pokud je e-mail volný, poslali jsme ti vygenerované heslo. Účet pak musí schválit
              administrátor.
            </Text>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="E-mail"
                placeholder="trenér@example.com"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                leftSection={<IconAt size={16} />}
                size="md"
              />

              <TextInput
                label="Uživatelské jméno"
                placeholder="jan.novak"
                required
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                leftSection={<IconUser size={16} />}
                size="md"
                description="3–32 znaků: písmena, číslice, . _ -"
              />

              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}

              <Button type="submit" fullWidth size="md" loading={isLoading}>
                Registrovat se
              </Button>
            </Stack>
          </form>
        )}

        <Center mt="md">
          <Anchor component={NavLink} to="/admin" size="sm">
            Zpět na přihlášení
          </Anchor>
        </Center>
      </Paper>
    </Container>
  );
}

export default RegisterPage;
