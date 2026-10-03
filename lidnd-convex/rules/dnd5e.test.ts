import { describe, expect, test } from "vitest";
import { initiativeOrder, nextTurn, previousTurn } from "./dnd5e";

const p = (
  id: string,
  initiative: number,
  createdAt = 0,
  defeated = false,
) => ({
  id,
  initiative,
  createdAt,
  defeated,
});

describe("initiative order", () => {
  test("descending, ties by creation time then id", () => {
    const order = initiativeOrder([
      p("c", 10, 2),
      p("a", 15),
      p("b", 10, 1),
      p("d", 10, 1),
    ]);
    expect(order.map((x) => x.id)).toEqual(["a", "b", "d", "c"]);
  });
});

describe("turns", () => {
  const roster = [p("a", 20), p("b", 15), p("c", 10)];

  test("next moves down the order", () => {
    expect(nextTurn(roster, { currentId: "a", round: 1 })).toEqual({
      currentId: "b",
      round: 1,
    });
  });

  test("next wraps to the top and starts a new round", () => {
    expect(nextTurn(roster, { currentId: "c", round: 1 })).toEqual({
      currentId: "a",
      round: 2,
    });
  });

  test("previous moves up the order", () => {
    expect(previousTurn(roster, { currentId: "b", round: 2 })).toEqual({
      currentId: "a",
      round: 2,
    });
  });

  test("previous wraps to the bottom of the previous round", () => {
    expect(previousTurn(roster, { currentId: "a", round: 2 })).toEqual({
      currentId: "c",
      round: 1,
    });
  });

  test("previous does nothing at the first turn of round 1", () => {
    expect(previousTurn(roster, { currentId: "a", round: 1 })).toEqual({
      currentId: "a",
      round: 1,
    });
  });

  test("defeated participants are skipped unless current", () => {
    const withDead = [p("a", 20), p("b", 15, 0, true), p("c", 10)];
    expect(nextTurn(withDead, { currentId: "a", round: 1 }).currentId).toBe(
      "c",
    );
    expect(nextTurn(withDead, { currentId: "b", round: 1 }).currentId).toBe(
      "c",
    );
  });
});
