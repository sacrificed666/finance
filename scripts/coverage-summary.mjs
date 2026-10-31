import { readFileSync } from "node:fs";

const METRICS = ["statements", "branches", "functions", "lines"];

const { total } = JSON.parse(readFileSync(new URL("../coverage/coverage-summary.json", import.meta.url), "utf8"));

const rows = METRICS.map((metric) => {
  const { pct, covered, total: count } = total[metric];
  return `| ${metric[0].toUpperCase()}${metric.slice(1)} | ${pct}% | ${covered} / ${count} |`;
});

const summary = ["### 🧪 Test coverage", "", "| Metric | Coverage | Covered |", "| --- | ---: | ---: |", ...rows];

process.stdout.write(`${summary.join("\n")}\n`);
