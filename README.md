# makefun-csv-reader-speed-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/yasunogithub/makefun-csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/yasunogithub/makefun-csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A fast, dependency-free drop-in replacement for csv-reader 1.0.0. It reads broken CSV exactly as csv-reader does — the same columns, the same rows, and the same errors (stray_cr, quote_junk, unterminated_quote, short_row, long_row) — in a fraction of the CPU time, by scanning with native string searches and slice extraction instead of building every field a character at a time. main.ts is the harness driver: it reads every case from /input/cases.json, answers each with run() from solve.js, and writes /output/answers.json.

## Run it

```sh
MAKEFUN_INPUT_DIR=./input MAKEFUN_OUTPUT_DIR=./output node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=3kthw8j5&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
