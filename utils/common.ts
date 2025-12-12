/**
 * Parses a comma-separated string into an object suitable for Prisma's `select` option.
 * Each field in the string will be a key in the returned object with a value of `true`.
 *
 * @param {string | undefined} selectString - The comma-separated string of fields to select.
 * @returns {Record<string, boolean> | null} An object with keys for each field set to `true`,
 * or `null` if the input is undefined or empty (Prisma expects `null` instead of `undefined`).
 *
 * @example
 * parseSelect("id,name,email");
 * // Returns: { id: true, name: true, email: true }
 */
export const parseSelect = (
  selectString: string | undefined
): Record<string, boolean> | null => {
  if (!selectString) return null; // Prisma expects null instead of undefined

  return selectString.split(',').reduce(
    (acc, field) => {
      acc[field.trim()] = true; // Trim spaces and set field to true
      return acc;
    },
    {} as Record<string, boolean>
  );
};
