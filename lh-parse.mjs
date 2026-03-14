import { readFileSync } from 'fs';
// Use the locally saved report
const r = JSON.parse(readFileSync('./report.json', 'utf8'));
const failing = Object.values(r.audits).filter(a => a.score !== null && a.score < 1);
console.log('FAILING:', failing.length);
for (const a of failing) {
  console.log(` [score=${a.score}] ${a.id}: ${a.title}`);
  if (a.details?.items?.length) {
    a.details.items.slice(0,3).forEach(i => console.log('   ->', JSON.stringify(i).slice(0,160)));
  }
}
