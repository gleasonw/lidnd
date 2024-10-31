import type { Encounter, Participant } from "@/server/api/router";
import { z } from "zod";

export function isStringMeaningful(str: string | null) {
  return str !== null && str !== undefined && str !== "";
}

export const rerouteUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://lidnd.com";

export const booleanSchema = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => value === true || value === "true");

export const dragTypes = {
  encounter: "encounter",
  nonsense: "nonsense",
  participant: "participant",
} as const;

export type DragTypeData = {
  [key in keyof typeof dragTypes]: key extends "encounter"
    ? Encounter
    : key extends "participant"
      ? Participant
      : never;
};

type DragKey = keyof typeof dragTypes;

export const typedDrag = {
  set<K extends DragKey>(
    dt: DataTransfer,
    key: K,
    data: DragTypeData[K],
  ): DataTransfer {
    dt.setData(dragTypes[key], JSON.stringify(data));
    return dt;
  },
  get<K extends DragKey>(dt: DataTransfer, key: K): DragTypeData[K] | null {
    return JSON.parse(dt.getData(dragTypes[key])) ?? null;
  },
  includes<K extends DragKey>(dt: DataTransfer, key: K): boolean {
    return dt.types.includes(key);
  },
};

export const removeUndefinedFields = <T extends Record<string, any>>(
  obj: T,
) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Required<T>;
};
