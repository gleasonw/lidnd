import { describe, expect, test } from "vitest";
import {
  applyDamage,
  applyHealing,
  gainTemporary,
  isDefeated,
  isWinded,
} from "./hp";

describe("stamina", () => {
  test("temporary Stamina absorbs damage first", () => {
    // "10 temporary Stamina and take 16 damage ... lose another 6 Stamina"
    expect(applyDamage({ hp: 30, tempHp: 10 }, 16)).toEqual({
      hp: 24,
      tempHp: 0,
    });
    expect(applyDamage({ hp: 20, tempHp: 5 }, 3)).toEqual({
      hp: 20,
      tempHp: 2,
    });
  });

  test("new temporary Stamina takes the greater amount", () => {
    expect(gainTemporary(5, 10)).toBe(10);
    expect(gainTemporary(10, 5)).toBe(10);
  });

  test("Stamina doesn't go below zero", () => {
    expect(applyDamage({ hp: 4, tempHp: 0 }, 10)).toEqual({ hp: 0, tempHp: 0 });
  });

  test("healing is capped at max", () => {
    expect(applyHealing(15, 20, 10)).toBe(20);
    expect(applyHealing(15, 20, -3)).toBe(15);
  });

  test("defeated at 0; heroes are never tracked", () => {
    expect(isDefeated({ kind: "hero", hp: 0 })).toBe(false);
    expect(isDefeated({ kind: "standard", hp: 0 })).toBe(true);
    expect(isDefeated({ kind: "minion", hp: 3 })).toBe(false);
    expect(isDefeated({ kind: "minion", hp: 0 })).toBe(true);
  });

  test("winded at half Stamina or less; minions can't be winded", () => {
    expect(isWinded({ kind: "standard", hp: 20, maxHp: 40 })).toBe(true);
    expect(isWinded({ kind: "standard", hp: 21, maxHp: 40 })).toBe(false);
    expect(isWinded({ kind: "standard", hp: 0, maxHp: 40 })).toBe(false);
    expect(isWinded({ kind: "minion", hp: 5, maxHp: 5 })).toBe(false);
  });
});
