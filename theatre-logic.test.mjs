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
// 2026-11-02 05:30Z is still Nov 1 in Palo Alto (PST, UTC-8)
eq("theatreToday is Palo Alto's date", theatreToday(new Date("2026-11-02T05:30:00Z")), "2026-11-01");
eq("theatreToday after Palo Alto midnight", theatreToday(new Date("2026-11-02T08:30:00Z")), "2026-11-02");
eq("programUrl does not double-encode", programUrl(P[1]), "https://stanfordtheatre.org/calendars/Fall%20Follies.html");
eq("programUrl encodes spaces", programUrl(P[2]), "https://stanfordtheatre.org/calendars/Hitch%202016.html");

// the shipped data: shape and a fact read off the theatre's site (Poppins/Wizard run, Nov 5 2026)
const A = JSON.parse(readFileSync(new URL("./data/archive.json", import.meta.url)));
eq("data: every run points at a program", A.films.every(f => f.s.every(([d, i]) => /^\d{4}-\d\d-\d\d$/.test(d) && A.programs.some(p => p.i === i))), true);
eq("data: Mary Poppins runs from Nov 5 2026", A.films.some(f => f.imdb === "tt0058331" && f.s.some(([d]) => d === "2026-11-05")), true);
eq("data: films with no runs", A.films.filter(f => !f.s.length).length, 0);

console.log(`${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
