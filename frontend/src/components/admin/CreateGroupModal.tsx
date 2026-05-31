import { Button, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import type { CreateGroupRequest } from "../../schema/groups";

interface CreateGroupModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (data: CreateGroupRequest) => Promise<void>;
}

export function CreateGroupModal({ opened, onClose, onCreate }: CreateGroupModalProps) {
  const form = useForm<CreateGroupRequest>({
    initialValues: {
      name: "",
      display_name_cs: "",
    },
    validate: {
      name: (value: string) => (value.trim().length === 0 ? "Klíč skupiny je povinný" : null),
      display_name_cs: (value: string) =>
        value.trim().length === 0 ? "Zobrazovaný název je povinný" : null,
    },
  });

  const handleSubmit = async (values: CreateGroupRequest) => {
    try {
      await onCreate(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        form.reset();
        onClose();
      }}
      title="Vytvořit novou skupinu"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Klíč skupiny"
            placeholder="Např. U13"
            required
            {...form.getInputProps("name")}
          />
          <TextInput
            label="Zobrazovaný název (Česky)"
            placeholder="Např. Mladší žáci"
            required
            {...form.getInputProps("display_name_cs")}
          />
          <Button type="submit" fullWidth>
            Vytvořit
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
