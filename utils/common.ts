export function toPrismaUpdateInput<T extends object>(payload: T) {
  const update: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      update[key] = value;
    }
  }
  return update;
}
