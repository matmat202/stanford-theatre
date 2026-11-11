// node site/theatre-logic.test.mjs  — pure-logic checks; three-element fixtures in the wrong
// order, since a two-element sort compares one pair and hides comparator bugs.
import { norm, search, byYear, yearsShown, mostShown, thisWeekInPast, upcoming, theatreToday, programUrl } from "./theatre-logic.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};

const P = [{ i: 0, file: "a.html", name: "Alpha" }, { i: 1, file: "Fall%20Follies.html", name: "Follies" }, { i: 2, file: "Hitch 2016.html", name: "Hitch" }];
const F = [
  { id: "t1", t: "The Lady Eve", y: 1941, s: [["2010-11-03", 0]] },
  { id: "t2", t: "Casablanca", y: 1942, s: [["1999-11-02", 1], ["2005-01-04", 2], ["2005-06-01", 0], ["2026-11-05", 2]] },
  { id: "t3", t: "Lady and the Tramp", y: 1955, s: [["2001-10-30", 0], ["2003-11-01", 1]] },
  { id: "t4", t: "Café Society", y: 1939, s: [["2012-12-30", 0]] },
];

eq("norm strips accents and punctuation", norm("Café  Society!"), "cafe society");
eq("search: exact beats prefix beats words", search(F, "lady").map(f => f.id), ["t3", "t1"]);
eq("search ignores a leading article", search(F, "the lady eve").map(f => f.id), ["t1"]);
eq("search: accent-insensitive", search(F, "cafe").map(f => f.id), ["t4"]);
eq("search: empty query", search(F, "  "), []);
eq("byYear newest first, runs in date order", byYear(F[1], P).map(y => [y.year, y.runs.map(r => r.date)]),
  [[2026, ["2026-11-05"]], [2005, ["2005-01-04", "2005-06-01"]], [1999, ["1999-11-02"]]]);
eq("yearsShown counts distinct years", yearsShown(F[1]), 3);
eq("mostShown by years, then runs, then title", mostShown(F, 3).map(f => f.id), ["t2", "t3", "t4"]);
eq("thisWeekInPast: +-3 days, earlier years only, newest first",
  thisWeekInPast(F, P, "2026-11-01", 3).map(r => r.date), ["2010-11-03", "2003-11-01", "2001-10-30", "1999-11-02"]);
eq("thisWeekInPast wraps the new year", thisWeekInPast(F, P, "2026-01-02", 3).map(r => r.date), ["2012-12-30", "2005-01-04"]);
eq("upcoming: today and later, soonest first", upcoming(F, P, "2026-11-01").map(r => [r.date, r.film.id]), [["2026-11-05", "t2"]]);
eq("upcoming includes today", upcoming(F, P, "2026-11-05").length, 1);
eq("upcoming lookback keeps a run that began 3 days ago", upcoming(F, P, "2026-11-08", 3).map(r => [r.date, r.started]), [["2026-11-05", true]]);
eq("upcoming lookback stops at its edge", upcoming(F, P, "2026-11-09", 3).length, 0);
// a run with its end on file lasts exactly to that end, whatever the lookback
const R = [{ id: "r1", t: "Mary Poppins", y: 1964, s: [["2026-10-29", 0, "2026-11-01"], ["2026-11-05", 0, "2026-11-08"]] },
  { id: "r2", t: "Short", y: 1950, s: [["2026-11-06", 0]] }, { id: "r3", t: "Long", y: 1951, s: [["2026-10-20", 0, "2026-11-30"]] }];
eq("upcoming: a run is on through its end day", upcoming(R, P, "2026-11-08", 0).map(r => [r.film.id, r.date, r.started]),
  [["r3", "2026-10-20", true], ["r1", "2026-11-05", true]]);
eq("upcoming: an ended run is gone even inside the lookback", upcoming(R, P, "2026-11-02", 4).map(r => r.date),
  ["2026-10-20", "2026-11-05", "2026-11-06"]);
eq("upcoming: the end is passed through", upcoming(R, P, "2026-11-09", 0).map(r => r.end), ["2026-11-30"]);
// 2026-11-02 05:30Z is still Nov 1 in Palo Alto (PST, UTC-8)
eq("theatreToday is Palo Alto's date", theatreToday(new Date("2026-11-02T05:30:00Z")), "2026-11-01");
eq("theatreToday after Palo Alto midnight", theatreToday(new Date("2026-11-02T08:30:00Z")), "2026-11-02");
eq("programUrl does not double-encode", programUrl(P[1]), "https://stanfordtheatre.org/calendars/Fall%20Follies.html");
eq("programUrl encodes spaces", programUrl(P[2]), "https://stanfordtheatre.org/calendars/Hitch%202016.html");

// mutation-audit 2026-11-11: what the checks above never pinned.
// every run carries ITS program, not the first one find() happens to reject
eq("byYear attaches each run's own program", byYear(F[1], P).flatMap(y => y.runs.map(r => r.program.name)), ["Hitch", "Hitch", "Alpha", "Follies"]);
eq("thisWeekInPast attaches each run's own program", thisWeekInPast(F, P, "2026-11-01", 3).map(r => r.program.name), ["Alpha", "Follies", "Alpha", "Follies"]);
eq("upcoming attaches each run's own program", upcoming(R, P.slice().reverse(), "2026-11-08", 0).map(r => r.program.i), [0, 0]);
// ranking: exact beats prefix beats words even against more runs; then runs; then title
const S = [
  { t: "Trick Rope", s: [["2001-01-01", 0], ["2002-01-01", 0], ["2003-01-01", 0]] },      // words match, 3 runs
  { t: "Ropers", s: [["2001-01-01", 0], ["2002-01-01", 0]] },                            // prefix, 2 runs
  { t: "The Rope", s: [["2001-01-01", 0]] },                                             // exact, 1 run
  { t: "Ropes Zed", s: [["2001-01-01", 0], ["2002-01-01", 0]] },                         // prefix, 2 runs, later title
  { t: "Ropes Abe", s: [["2001-01-01", 0], ["2002-01-01", 0]] },                         // prefix, 2 runs, earlier title
  { t: "Ropey", s: [["2001-01-01", 0], ["2002-01-01", 0], ["2003-01-01", 0]] },          // prefix, 3 runs
];
eq("search: rank, then runs, then title", search(S, "rope").map(f => f.t), ["The Rope", "Ropey", "Ropers", "Ropes Abe", "Ropes Zed", "Trick Rope"]);
const many = Array.from({ length: 30 }, (_, k) => ({ t: `Film ${String(k).padStart(2, "0")}`, s: Array.from({ length: k % 4 + 1 }, (_, j) => [`${2000 + j + (k % 3)}-05-01`, 0]) }));
eq("search returns 20 by default", search(many, "film").length, 20);
eq("mostShown returns 25 by default", mostShown(many).length, 25);
const M = [
  { t: "Bee", s: [["2001-01-01", 0], ["2002-01-01", 0]] },
  { t: "Ann", s: [["2001-01-01", 0], ["2001-02-01", 0], ["2001-03-01", 0], ["2002-01-01", 0]] },
  { t: "Cat", s: [["2001-01-01", 0], ["2002-01-01", 0], ["2003-01-01", 0]] },
  { t: "Abe", s: [["2001-01-01", 0], ["2002-01-01", 0]] },
];
eq("mostShown: years, then runs, then title", mostShown(M).map(f => f.t), ["Cat", "Ann", "Abe", "Bee"]);
// thisWeekInPast: the window is measured in real month lengths, the default is 3 days,
// and a run earlier THIS year is not "in the past" for this card
const W = [
  { t: "Feb", s: [["2010-02-27", 0], ["2011-02-26", 0], ["2012-02-29", 0], ["2026-03-01", 0]] },
  { t: "Apr", s: [["2013-04-28", 0], ["2014-05-01", 0], ["2015-04-27", 0]] },
];
eq("thisWeekInPast crosses February by its real length", thisWeekInPast(W, P, "2026-03-01", 3).map(r => r.date), ["2012-02-29", "2010-02-27"]);
eq("thisWeekInPast crosses a 30-day month", thisWeekInPast(W, P, "2026-05-01").map(r => r.date), ["2014-05-01", "2013-04-28"]);
eq("thisWeekInPast: earlier this year is excluded", thisWeekInPast(W, P, "2026-03-01", 1).map(r => r.date), ["2012-02-29"]);
// upcoming: lookback defaults to 0; a run starting today has not "started"; same-day runs by title
const U = [
  { t: "Zorro", s: [["2026-11-10", 0]] }, { t: "Annie", s: [["2026-11-10", 1]] },
  { t: "Marty", s: [["2026-11-10", 2]] }, { t: "Before", s: [["2026-11-09", 0]] },
];
eq("upcoming: default lookback drops yesterday, same day by title", upcoming(U, P, "2026-11-10").map(r => [r.film.t, r.started]),
  [["Annie", false], ["Marty", false], ["Zorro", false]]);
eq("upcoming: lookback 1 brings yesterday back, first", upcoming(U, P, "2026-11-10", 1).map(r => r.film.t), ["Before", "Annie", "Marty", "Zorro"]);
eq("thisWeekInPast: same day newest year first, then title", thisWeekInPast(
  [{ t: "Zed", s: [["2001-11-10", 0]] }, { t: "Abe", s: [["2001-11-10", 0]] }, { t: "Mid", s: [["2001-11-10", 0], ["2003-11-10", 0]] }], P, "2026-11-10")
  .map(r => r.film.t + r.date.slice(0, 4)), ["Mid2003", "Abe2001", "Mid2001", "Zed2001"]);

// full ties keep archive order (remakes share a title; one film can play twice on a date)
const RM = [{ id: "w33", t: "Little Women", y: 1933, s: [["2026-11-10", 0], ["2001-11-10", 0]] },
  { id: "w49", t: "Little Women", y: 1949, s: [["2026-11-10", 1], ["2001-11-10", 1]] },
  { id: "w94", t: "Little Women", y: 1994, s: [["2026-11-10", 2], ["2001-11-10", 2]] }];
const RMr = RM.slice().reverse();
eq("search: remakes keep archive order", [search(RM, "little women"), search(RMr, "little")].map(r => r.map(f => f.y)), [[1933, 1949, 1994], [1994, 1949, 1933]]);
eq("mostShown: remakes keep archive order", [mostShown(RM), mostShown(RMr)].map(r => r.map(f => f.y)), [[1933, 1949, 1994], [1994, 1949, 1933]]);
eq("upcoming: remakes keep archive order", [upcoming(RM, P, "2026-11-10"), upcoming(RMr, P, "2026-11-10")].map(r => r.map(x => x.film.y)), [[1933, 1949, 1994], [1994, 1949, 1933]]);
eq("thisWeekInPast: remakes keep archive order", [thisWeekInPast(RM, P, "2026-11-10"), thisWeekInPast(RMr, P, "2026-11-10")].map(r => r.map(x => x.film.y)), [[1933, 1949, 1994], [1994, 1949, 1933]]);
const twice = { t: "Twice", s: [["2004-03-01", 2], ["2003-05-01", 0], ["2004-03-01", 0], ["2004-03-01", 1], ["2005-07-01", 1]] };
eq("byYear: same-date runs keep file order; scrambled years come out newest first",
  byYear(twice, P).map(y => [y.year, y.runs.map(r => r.program.i)]), [[2005, [1]], [2004, [2, 0, 1]], [2003, [0]]]);
const M2 = [{ t: "One", s: [["2001-01-01", 0], ["2001-02-01", 0], ["2001-03-01", 0], ["2001-04-01", 0], ["2001-05-01", 0]] },
  { t: "Two", s: [["2001-01-01", 0], ["2002-01-01", 0]] }, { t: "Three", s: [["2001-01-01", 0], ["2002-01-01", 0], ["2003-01-01", 0]] }];
eq("mostShown: distinct years outrank raw runs, in any input order",
  [M2, M2.slice().reverse(), [M2[1], M2[0], M2[2]]].map(x => mostShown(x).map(f => f.t)), [["Three", "Two", "One"], ["Three", "Two", "One"], ["Three", "Two", "One"]]);

// the shipped data: shape and a fact read off the theatre's site (Poppins/Wizard run, Nov 5 2026)
const A = JSON.parse(readFileSync(new URL("./data/archive.json", import.meta.url)));
eq("data: every run points at a program", A.films.every(f => f.s.every(([d, i]) => /^\d{4}-\d\d-\d\d$/.test(d) && A.programs.some(p => p.i === i))), true);
eq("data: Mary Poppins runs from Nov 5 2026", A.films.some(f => f.imdb === "tt0058331" && f.s.some(([d]) => d === "2026-11-05")), true);
eq("data: films with no runs", A.films.filter(f => !f.s.length).length, 0);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
