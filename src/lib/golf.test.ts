import { describe, it, expect } from "vitest";
import {
  strokesForHandicap,
  scrambleAllocation,
  singlesAllocation,
  computeMatchStatus,
  golfScoreName,
  scoreOptions,
  type CourseHole,
  type HoleWinner,
} from "./golf";

// A simple course where holeNumber === strokeIndex, par 4 throughout.
const course: CourseHole[] = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  strokeIndex: i + 1,
  par: 4,
}));

const totalStrokes = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

describe("strokesForHandicap", () => {
  it("gives no strokes off scratch", () => {
    expect(totalStrokes(strokesForHandicap(0, course))).toBe(0);
  });

  it("gives a stroke on the 9 hardest holes for handicap 9", () => {
    const s = strokesForHandicap(9, course);
    expect(totalStrokes(s)).toBe(9);
    // SI 1..9 get a stroke, 10..18 do not.
    expect(s.slice(0, 9).every((x) => x === 1)).toBe(true);
    expect(s.slice(9).every((x) => x === 0)).toBe(true);
  });

  it("gives one stroke on every hole for handicap 18", () => {
    const s = strokesForHandicap(18, course);
    expect(s.every((x) => x === 1)).toBe(true);
    expect(totalStrokes(s)).toBe(18);
  });

  it("wraps for handicaps over 18 (24 = 1 everywhere + extra on hardest 6)", () => {
    const s = strokesForHandicap(24, course);
    expect(totalStrokes(s)).toBe(24);
    // Hardest 6 holes (SI 1..6) get 2, the rest get 1.
    expect(s.slice(0, 6).every((x) => x === 2)).toBe(true);
    expect(s.slice(6).every((x) => x === 1)).toBe(true);
  });

  it("rounds and floors negative handicaps to zero", () => {
    expect(totalStrokes(strokesForHandicap(-3, course))).toBe(0);
  });
});

describe("scrambleAllocation (25% combined)", () => {
  it("computes team handicaps and allocates the difference to the higher team", () => {
    // Europe combined 20 -> 5 ; USA combined 40 -> 10 ; USA gets 5 strokes.
    const a = scrambleAllocation([8, 12], [18, 22], course);
    expect(a.europeTeamHandicap).toBe(5);
    expect(a.usaTeamHandicap).toBe(10);
    expect(a.receiver).toBe("usa");
    expect(totalStrokes(a.usaStrokes)).toBe(5);
    expect(totalStrokes(a.europeStrokes)).toBe(0);
    // Strokes land on the 5 hardest holes.
    expect(a.usaStrokes.slice(0, 5).every((x) => x === 1)).toBe(true);
  });

  it("gives no strokes when team handicaps are equal", () => {
    const a = scrambleAllocation([10, 10], [8, 12], course); // both round to 5
    expect(a.receiver).toBeNull();
    expect(totalStrokes(a.europeStrokes)).toBe(0);
    expect(totalStrokes(a.usaStrokes)).toBe(0);
  });
});

describe("singlesAllocation (full handicap difference)", () => {
  it("gives the higher handicap the difference in strokes", () => {
    const a = singlesAllocation(6, 14, course); // USA +8
    expect(a.receiver).toBe("usa");
    expect(totalStrokes(a.usaStrokes)).toBe(8);
    expect(totalStrokes(a.europeStrokes)).toBe(0);
  });
});

describe("computeMatchStatus", () => {
  const fill = (results: HoleWinner[]): HoleWinner[] => {
    const out = [...results];
    while (out.length < 18) out.push(null);
    return out;
  };

  it("reports not started", () => {
    const s = computeMatchStatus(fill([]));
    expect(s.statusText).toBe("Not started");
    expect(s.isComplete).toBe(false);
  });

  it("reports a live lead with holes to play", () => {
    // Europe wins holes 1-3, halves 4-5 => 3 UP with 13 to play.
    const s = computeMatchStatus(
      fill(["europe", "europe", "europe", "halved", "halved"]),
    );
    expect(s.diff).toBe(3);
    expect(s.holesRemaining).toBe(13);
    expect(s.statusText).toBe("Europe 3 UP (13 to play)");
    expect(s.isComplete).toBe(false);
  });

  it("reports all square", () => {
    const s = computeMatchStatus(fill(["europe", "usa", "halved"]));
    expect(s.statusText).toBe("All Square (15 to play)");
  });

  it("closes out a match 3&2", () => {
    // After 16 holes Europe is 3 up with 2 to play -> 3&2.
    const results: HoleWinner[] = [];
    for (let i = 0; i < 16; i++) {
      // Europe wins holes 1-3 then everything halved -> 3 up through 16.
      results.push(i < 3 ? "europe" : "halved");
    }
    const s = computeMatchStatus(fill(results));
    expect(s.isComplete).toBe(true);
    expect(s.statusText).toBe("Europe wins 3&2");
    expect(s.points).toEqual({ europe: 1, usa: 0 });
  });

  it("wins 1 UP when it goes to the 18th", () => {
    const results: HoleWinner[] = Array(18).fill("halved");
    results[0] = "usa"; // USA up 1 the whole way
    const s = computeMatchStatus(results);
    expect(s.isComplete).toBe(true);
    expect(s.statusText).toBe("USA wins 1 UP");
    expect(s.points).toEqual({ europe: 0, usa: 1 });
  });

  it("halves a match that finishes all square after 18", () => {
    const results: HoleWinner[] = Array(18).fill("halved");
    results[0] = "europe";
    results[1] = "usa";
    const s = computeMatchStatus(results);
    expect(s.isComplete).toBe(true);
    expect(s.statusText).toBe("Match Halved");
    expect(s.points).toEqual({ europe: 0.5, usa: 0.5 });
  });
});

describe("golfScoreName", () => {
  it("names scores on a par 4 like the spec", () => {
    expect(golfScoreName(1, 4)).toBe("Hole in One");
    expect(golfScoreName(2, 4)).toBe("Eagle");
    expect(golfScoreName(3, 4)).toBe("Birdie");
    expect(golfScoreName(4, 4)).toBe("Par");
    expect(golfScoreName(5, 4)).toBe("Bogey");
    expect(golfScoreName(6, 4)).toBe("Double Bogey");
    expect(golfScoreName(7, 4)).toBe("Triple Bogey");
  });

  it("adjusts the names to the hole's par", () => {
    expect(golfScoreName(3, 3)).toBe("Par");
    expect(golfScoreName(2, 3)).toBe("Birdie");
    expect(golfScoreName(5, 5)).toBe("Par");
    expect(golfScoreName(2, 5)).toBe("Albatross");
  });

  it("always calls a 1 a Hole in One", () => {
    expect(golfScoreName(1, 3)).toBe("Hole in One");
    expect(golfScoreName(1, 5)).toBe("Hole in One");
  });
});

describe("scoreOptions", () => {
  it("offers 1..par+5 with names", () => {
    const opts = scoreOptions(4);
    expect(opts[0]).toEqual({ score: 1, name: "Hole in One" });
    expect(opts.at(-1)?.score).toBe(9);
    expect(opts.find((o) => o.score === 4)?.name).toBe("Par");
  });
});
