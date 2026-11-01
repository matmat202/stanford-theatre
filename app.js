import { search, byYear, yearsShown, mostShown, thisWeekInPast, upcoming, theatreToday, programUrl } from "./theatre-logic.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d, withYear = true) => `${MON[+d.slice(5, 7) - 1]} ${+d.slice(8)}${withYear ? ", " + d.slice(0, 4) : ""}`;
const label = f => `${esc(f.t)}${f.y ? ` <span class="meta">(${f.y})</span>` : ""}`;
const pickBtn = f => `<button class="pick" data-id="${esc(f.id)}">${esc(f.t)}</button>${f.y ? ` <span class="meta">(${f.y})</span>` : ""}`;

let A, byId;

function showFilm(f) {
  const years = byYear(f, A.programs);
  const n = yearsShown(f);
  $("results").innerHTML = "";
  $("film").innerHTML = `<div class="card film">
    <h3>${label(f)}</h3>
    <div class="meta">${f.s.length} run${f.s.length === 1 ? "" : "s"} in ${n} year${n === 1 ? "" : "s"},
      first ${fmt(f.s[0][0])}, latest ${fmt(f.s[f.s.length - 1][0])}
      ${f.imdb ? ` · <a href="https://www.imdb.com/title/${esc(f.imdb)}/">IMDb</a>` : ""}</div>
    <div class="yr">${years.map(y => `<b>${y.year}</b><span>${groupRuns(y.runs).map(g =>
      `${g.dates.map(d => fmt(d, false)).join(", ")} <a class="meta" href="${programUrl(g.program)}">${esc(g.program.name)}</a>`).join("<br>")}</span>`).join("")}</div>
  </div>`;
  history.replaceState(null, "", "#" + encodeURIComponent(f.id));
}

// consecutive runs from the same program -> one line: "Jan 17, Jan 18, Jan 20 Film Noir"
function groupRuns(runs) {
  const out = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && last.program === r.program) last.dates.push(r.date);
    else out.push({ program: r.program, dates: [r.date] });
  }
  return out;
}

function runList(rows, withYear) {
  return `<ul class="list">${rows.map(r => `<li><span class="n">${r.started ? "since " : ""}${fmt(r.date, withYear && !r.started)}</span> &nbsp;${pickBtn(r.film)}
    <div class="meta">${esc(r.program.name)}</div></li>`).join("")}</ul>`;
}

function render() {
  const today = theatreToday();
  const films = A.films;
  const runs = films.reduce((n, f) => n + f.s.length, 0);
  $("sub").textContent = `Every film the classic-film house at 221 University Ave, Palo Alto has shown since ${A.programs.reduce((m, p) => p.from < m ? p.from : m, "9999").slice(0, 4)}: ${films.length.toLocaleString()} films over ${runs.toLocaleString()} runs, from its own ${A.programs.length} program pages.`;

  const next = upcoming(films, A.programs, today, 4);
  $("next").innerHTML = next.length ? runList(next.slice(0, 12), true)
    : `<span class="empty">Nothing announced after today yet — <a href="https://stanfordtheatre.org/">see the theatre's page</a>.</span>`;

  const past = thisWeekInPast(films, A.programs, today, 3);
  $("past-h").textContent = `This week (${fmt(today, false)} ± 3 days) in years past`;
  $("past").innerHTML = past.length ? runList(past.slice(0, 30), true) : `<span class="empty">Nothing on file for this week.</span>`;

  $("most").innerHTML = `<ul class="list">${mostShown(films, 25).map(f =>
    `<li><span class="n">${yearsShown(f)} yrs</span> &nbsp;${pickBtn(f)} <span class="meta">· ${f.s.length} runs</span></li>`).join("")}</ul>`;
  $("stamp").textContent = A.built ? `Data read ${A.built}.` : "";
}

function onSearch() {
  const q = $("q").value;
  const hits = search(A.films, q, 15);
  $("film").innerHTML = "";
  if (!q.trim()) { $("results").innerHTML = ""; return; }
  if (hits.length === 1 && hits[0].t.toLowerCase() === q.trim().toLowerCase()) return showFilm(hits[0]);
  $("results").innerHTML = hits.length
    ? `<div class="card"><ul class="list">${hits.map(f => `<li>${pickBtn(f)} <span class="meta">· ${yearsShown(f)} yrs, ${f.s.length} runs</span></li>`).join("")}</ul></div>`
    : `<div class="card empty">No film matching “${esc(q)}” in the archive.</div>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest(".pick");
  if (!b) return;
  const f = byId.get(b.dataset.id);
  if (f) { $("q").value = f.t; showFilm(f); $("film").scrollIntoView({ block: "nearest" }); }
});

fetch("data/archive.json").then(r => r.json()).then(a => {
  A = a;
  byId = new Map(a.films.map(f => [f.id, f]));
  render();
  $("q").addEventListener("input", onSearch);
  const h = decodeURIComponent(location.hash.slice(1));
  if (h && byId.has(h)) { $("q").value = byId.get(h).t; showFilm(byId.get(h)); }
}).catch(() => { $("next").innerHTML = `<span class="empty">Could not load the archive.</span>`; });
