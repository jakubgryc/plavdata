import {
  Alert,
  Anchor,
  Button,
  Center,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconLock, IconMail, IconUser } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { authApi } from "../utils/auth";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot-password mode
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.login({ username, password });
      authApi.saveToken(response.access_token, response.username, response.role);
      window.dispatchEvent(new Event("storage"));
      navigate(response.role === "admin" ? "/admin/swimmers" : "/attendance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Přihlášení se nezdařilo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);

    try {
      await authApi.forgotPassword(forgotEmail);
      setSuccessAlert("Pokud je e-mail registrován, poslali jsme ti nové heslo.");
      setForgotMode(false);
      setForgotEmail("");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Odeslání se nezdařilo");
    } finally {
      setForgotLoading(false);
    }
  };

  const switchToLoginMode = () => {
    setForgotMode(false);
    setForgotError(null);
    setForgotEmail("");
  };

  const switchToForgotMode = () => {
    setForgotMode(true);
    setError(null);
    setSuccessAlert(null);
  };

  return (
    <Container size={420} my={80}>
      <Center mb="xl">
        <Title order={1}>Administrace</Title>
      </Center>

      <Paper withBorder shadow="md" p={30} radius="md">
        {successAlert && !forgotMode && (
          <Alert
            color="green"
            mb="md"
            withCloseButton
            onClose={() => setSuccessAlert(null)}
          >
            {successAlert}
          </Alert>
        )}

        {forgotMode ? (
          <form onSubmit={handleForgotSubmit}>
            <Stack gap="md">
              <TextInput
                label="Registrovaný e-mail"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.currentTarget.value)}
                leftSection={<IconMail size={16} />}
                size="md"
              />

              {forgotError && (
                <Alert color="red">{forgotError}</Alert>
              )}

              <Button type="submit" fullWidth size="md" loading={forgotLoading}>
                Odeslat nové heslo
              </Button>

              <Center>
                <Anchor size="sm" onClick={switchToLoginMode}>
                  Zpět na přihlášení
                </Anchor>
              </Center>
            </Stack>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="E-mail nebo uživatelské jméno"
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
        )}

        <Center mt="md">
          <Stack gap="xs" align="center">
            {!forgotMode && (
              <Anchor size="sm" onClick={switchToForgotMode}>
                Zapomenuté heslo
              </Anchor>
            )}
            <Anchor component={NavLink} to="/register" size="sm">
              Jsem trenér — registrace
            </Anchor>
          </Stack>
        </Center>
      </Paper>
    </Container>
  );
}

export default Login;
