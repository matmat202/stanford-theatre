# Stanford Theatre archive

Every film the Stanford Theatre in Palo Alto has shown since 1997, read from its own
program pages. Search a title to see every year and program it played in. The page also
shows what's on now and next, what played this week in past years, and the films shown in
the most different years.

    ./fetch.sh                 # mirror stanfordtheatre.org/calendars into data/raw/ (1 req/s; past pages kept)
    python3 parse.py --report  # data/raw -> site/data/archive.json; lists typo'd date lines and empty pages
    python3 test_parse.py      # parser facts read off real pages;  --plant: each planted bug must fail
    node site/theatre-logic.test.mjs
    test/run-shot.sh           # Electron render gate (search, card, URL reload, 390 px)
    python3 -m http.server -d site 8000   # then open http://127.0.0.1:8000/

## How the pages are read
Hand-made HTML from 1997 to 2026. Only two traits hold across every era: each film links to
IMDb (as `/title/tt…`, `/Title?NNNNNNN`, or `/M/title-exact?Name+(Year)`), and a date line
comes before the films it covers. On top of that:

- **Year.** The year printed right after a date wins ("Dec 26-28, 1997"), then the page
  header, then the filename. If a page prints none, it sits between its neighbours in the
  index (listed newest first), and stated weekdays pick among the candidate years. A Dec →
  Jan step rolls the year.
- **The theatre's own typos.** A date line whose month disagrees with both neighbours, while
  they agree with each other, is a typo ("April 7-9" between November 4 and 9, 2002). The
  running month is kept and the day trusted. A one-sided rule cascaded: once it anchored on
  a bad line, it read whole seasons as typos.
- **One film, one id.** Older title-exact links are joined to the tt id that newer pages use,
  matched by title and year.

Known gaps: "Remembering Shirley Temple" (Feb 2014) has no IMDb links, so it yields no
showings. 67 of 1,578 films have no IMDb id (older links that never got a tt).
