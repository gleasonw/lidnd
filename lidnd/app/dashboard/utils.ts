import { z } from "zod";

export function isStringMeaningful(str: string) {
  return str !== null && str !== undefined && str !== "";
}

export const booleanSchema = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => value === true || value === "true");
