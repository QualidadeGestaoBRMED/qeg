export function formatUpdatedAt(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
