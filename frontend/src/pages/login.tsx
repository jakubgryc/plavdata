import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Center,
} from "@mantine/core";
import { IconUser, IconLock } from "@tabler/icons-react";
import { authApi } from "../utils/auth";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.login({ username, password });
      authApi.saveToken(response.access_token, response.username);
      // TODO: Navigate to admin dashboard once created
      console.log("Login successful:", response);
      navigate("/"); // For now, redirect to home
    } catch (err) {
      setError(err instanceof Error ? err.message : "Přihlášení se nezdařilo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Center mb="xl">
        <Title order={1}>Administrace</Title>
      </Center>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Uživatelské jméno"
              placeholder="admin"
              required
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              leftSection={<IconUser size={16} />}
              size="md"
            />

            <PasswordInput
              label="Heslo"
              placeholder="Vaše heslo"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              leftSection={<IconLock size={16} />}
              size="md"
            />

            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            <Button type="submit" fullWidth size="md" loading={isLoading}>
              Přihlásit se
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export default Login;
