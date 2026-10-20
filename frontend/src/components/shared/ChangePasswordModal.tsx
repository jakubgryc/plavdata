import { Alert, Button, Modal, PasswordInput, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { authApi } from "../../utils/auth";

interface ChangePasswordModalProps {
  opened: boolean;
  onClose: () => void;
}

function ChangePasswordModal({ opened, onClose }: ChangePasswordModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
    validate: {
      current_password: (v: string) =>
        v.length === 0 ? "Zadejte současné heslo" : null,
      new_password: (v: string) =>
        v.length < 8 ? "Heslo musí mít alespoň 8 znaků" : null,
      confirm_password: (v: string, values) =>
        v !== values.new_password ? "Hesla se neshodují" : null,
    },
  });

  // Reset form when modal opens so stale errors/values from a prior attempt
  // don't leak into the next open.
  useEffect(() => {
    if (opened) {
      form.reset();
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    setSaving(true);
    setError(null);
    try {
      await authApi.changePassword(values.current_password, values.new_password);
      notifications.show({
        title: "Heslo změněno",
        message: "Heslo bylo změněno.",
        color: "green",
      });
      // Ask the browser to offer storing the new password without leaving
      // the page. The Credential Management API is the only reliable
      // stay-logged-in trigger (Chrome/Edge/Android); where unsupported
      // (Safari/Firefox) it is skipped silently — those browsers offer to
      // save at the next login instead.
      if ("PasswordCredential" in window && navigator.credentials) {
        try {
          const username = authApi.getUsername();
          if (username) {
            // Constructed via window lookup: the Credential Management API
            // types are missing from some TypeScript DOM libs.
            const PasswordCredentialCtor = (
              window as unknown as {
                PasswordCredential: new (data: {
                  id: string;
                  password: string;
                  name: string;
                }) => Credential;
              }
            ).PasswordCredential;
            const cred = new PasswordCredentialCtor({
              id: username,
              password: values.new_password,
              name: username,
            });
            await navigator.credentials.store(cred);
          }
        } catch {
          // user dismissed the prompt or the browser refused — not an error
        }
      }
      onClose();
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Změna hesla se nezdařila");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Změna hesla" centered>
      {/* Native <form> — required so browsers recognise the credential
          fields and fire the password-manager save prompt. */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <PasswordInput
            label="Současné heslo"
            name="current_password"
            autoComplete="current-password"
            required
            {...form.getInputProps("current_password")}
          />
          <PasswordInput
            label="Nové heslo"
            name="new_password"
            autoComplete="new-password"
            required
            {...form.getInputProps("new_password")}
          />
          <Text size="xs" c="dimmed" mt="-xs">
            Alespoň 8 znaků
          </Text>
          <PasswordInput
            label="Nové heslo znovu"
            name="confirm_password"
            autoComplete="new-password"
            required
            {...form.getInputProps("confirm_password")}
          />
          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={saving} fullWidth>
            Změnit heslo
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}

export default ChangePasswordModal;
