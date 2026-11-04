// Pure functions over archive.json, shared by app.js and theatre-logic.test.mjs.
// archive: {programs:[{i,file,name,from,to}], films:[{id,t,y,imdb,s:[[date,programIndex]]}]}
// A showing date is the FIRST day of a run as the theatre printed it ("Dec 26-28" -> 12-26).

export function norm(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

const ARTICLE = /^(the|a|an) /;

// Films matching a query, best first: exact title, then title prefix, then word prefixes,
// ties broken by how often the film has played.
export function search(films, q, limit = 20) {
  const nq = norm(q).replace(ARTICLE, "");
  if (!nq) return [];
  const words = nq.split(" ");
  const out = [];
  for (const f of films) {
    const nt = norm(f.t).replace(ARTICLE, "");
    let rank;
    if (nt === nq) rank = 0;
    else if (nt.startsWith(nq)) rank = 1;
    else {
      const tw = nt.split(" ");
      if (!words.every(w => tw.some(t => t.startsWith(w)))) continue;
      rank = 2;
    }
    out.push([rank, -f.s.length, f.t, f]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  return out.slice(0, limit).map(r => r[3]);
}

// Runs grouped by calendar year, newest first: [{year, runs:[{date, program}]}]
export function byYear(film, programs) {
  const m = new Map();
  for (const [date, pi] of film.s) {
    const y = date.slice(0, 4);
    if (!m.has(y)) m.set(y, []);
    m.get(y).push({ date, program: programs.find(p => p.i === pi) });
  }
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, runs]) => ({ year: +year, runs: runs.sort((a, b) => (a.date < b.date ? -1 : 1)) }));
}

// Distinct years a film played in.
export function yearsShown(film) {
  return new Set(film.s.map(s => s[0].slice(0, 4))).size;
}

// Films ranked by the number of distinct years they played, then by runs.
export function mostShown(films, limit = 25) {
  return films.map(f => [yearsShown(f), f.s.length, f])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || (a[2].t < b[2].t ? -1 : 1))
    .slice(0, limit).map(r => r[2]);
}

function dayOfYear(md) {            // "MM-DD" -> 1..366 on a leap-year calendar
  const [m, d] = md.split("-").map(Number);
  return Math.round((Date.UTC(2000, m - 1, d) - Date.UTC(2000, 0, 1)) / 864e5) + 1;
}

// Runs that began within `days` of today's month-day in an earlier year:
// [{date, film, program}], newest year first.
export function thisWeekInPast(films, programs, today, days = 3) {
  const t = dayOfYear(today.slice(5));
  const thisYear = today.slice(0, 4);
  const out = [];
  for (const f of films) {
    for (const [date, pi] of f.s) {
      if (date.slice(0, 4) >= thisYear) continue;
      const diff = Math.abs(dayOfYear(date.slice(5)) - t);
      if (Math.min(diff, 366 - diff) <= days) out.push({ date, film: f, program: programs.find(p => p.i === pi) });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.film.t < b.film.t ? -1 : 1)));
}

// Runs still on today or later: [{date, end, film, program, started}], soonest first;
// `started` marks a run that began before today. A showing is [start, program, end?]; one
// with no end on file (a single day, or a page that never printed one) is taken to last
// `lookback` days, since a Thursday-Sunday run that began on Thursday is still on.
export function upcoming(films, programs, today, lookback = 0) {
  const from = new Date(Date.parse(today + "T00:00:00Z") - lookback * 864e5).toISOString().slice(0, 10);
  const out = [];
  for (const f of films) for (const [date, pi, end] of f.s)
    if (end ? end >= today : date >= from)
      out.push({ date, end: end || null, film: f, program: programs.find(p => p.i === pi), started: date < today });
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.film.t < b.film.t ? -1 : 1)));
}

// Today's date on the theatre's clock (Palo Alto), not the viewer's.
export function theatreToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function programUrl(p) {
  return "https://stanfordtheatre.org/calendars/" + encodeURIComponent(decodeURIComponent(p.file));
}
