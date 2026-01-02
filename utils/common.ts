export const toPrismaUpdateInput = <T extends object>(payload: T) => {
  const update: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      update[key] = value;
    }
  }
  return update;
};

export const safeJsonParse = <T>(value: T | string): T => {
  if (typeof value === 'string') {
    return JSON.parse(value);
  }
  return value;
};
