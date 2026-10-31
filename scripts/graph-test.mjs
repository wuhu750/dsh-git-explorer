/**
 * Unit test for the commit-graph lane assignment.
 *
 * `assignLanes` lives inside the browser bundle's module closure, so the test
 * lifts its source out of `client.js` and evaluates it in isolation. That
 * keeps the algorithm covered without pulling React into the test process.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, '..', 'client.js'), 'utf8');

function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in client.js`);
  let depth = 0;
  let index = source.indexOf('{', start);
  const open = index;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced braces after ${name} (opened at ${open})`);
}

const assignLanes = new Function(`${extract('assignLanes')}; return assignLanes;`)();

/** Build a commit list from a compact description. */
const commit = (hash, parents) => ({
  hash,
  short: hash.slice(0, 7),
  author: 'A',
  email: 'a@b.c',
  time: 0,
  subject: hash,
  refs: [],
  parents,
});

const checks = [];
const check = (name, value) => checks.push([name, value]);

// Linear history: every row sits on lane 0.
{
  const { rows, width } = assignLanes([commit('c3', ['c2']), commit('c2', ['c1']), commit('c1', [])]);
  check('linear.lanes', rows.map((row) => row.lane));
  check('linear.width', width);
}

// One merge commit: the merged branch occupies a second lane, then collapses.
{
  const { rows, width } = assignLanes([
    commit('m', ['a', 'b']),
    commit('a', ['base']),
    commit('b', ['base']),
    commit('base', []),
  ]);
  check('merge.lanes', rows.map((row) => row.lane));
  check('merge.parentLanes', rows[0].parentLanes);
  check('merge.width', width);
}

// Unrelated roots never overlap in time, so they must reuse lane 0 instead of
// widening the graph. Each one still starts its own line.
{
  const { rows, width } = assignLanes([commit('x', []), commit('y', []), commit('z', [])]);
  check('orphans.lanes', rows.map((row) => row.lane));
  check('orphans.startsLine', rows.map((row) => row.startsLine));
  check('orphans.width', width);
}

// A parent outside the window must not throw and must still get a lane.
{
  const { rows } = assignLanes([commit('head', ['outside'])]);
  check('outside.parentLanes', rows[0].parentLanes);
  check('outside.width', Math.max(1, rows[0].totalLanes));
}

// Every lane referenced by an edge must exist within the reported width.
{
  const commits = [
    commit('m2', ['a2', 'b2']),
    commit('a2', ['m1']),
    commit('b2', ['m1']),
    commit('m1', ['a1', 'b1']),
    commit('a1', ['root']),
    commit('b1', ['root']),
    commit('root', []),
  ];
  const { rows, width } = assignLanes(commits);
  const maxLane = rows.reduce((max, row) => Math.max(max, row.lane, ...row.parentLanes), 0);
  check('diamond.widthCoversLanes', width >= maxLane + 1);
  check('diamond.edgeSlotsValid', rows.every((row) => row.edges.before.length <= width && row.edges.after.length <= width));
  check('diamond.rowCount', rows.length === commits.length);
}

for (const [name, value] of checks) console.log(name, JSON.stringify(value));

const failures = [];
const linear = checks.find(([name]) => name === 'linear.lanes')[1];
if (linear.some((lane) => lane !== 0)) failures.push('linear history must stay on lane 0');
if (checks.find(([name]) => name === 'linear.width')[1] !== 1) failures.push('linear width must be 1');
const mergeParents = checks.find(([name]) => name === 'merge.parentLanes')[1];
if (mergeParents.length !== 2) failures.push('a merge commit must report two parent lanes');
if (mergeParents[0] === mergeParents[1]) failures.push('merge parents must occupy different lanes');
const orphanLanes = checks.find(([name]) => name === 'orphans.lanes')[1];
if (orphanLanes.some((lane) => lane !== 0)) failures.push('sequential roots must reuse lane 0');
if (checks.find(([name]) => name === 'orphans.width')[1] !== 1) failures.push('sequential roots must not widen the graph');
const orphanStarts = checks.find(([name]) => name === 'orphans.startsLine')[1];
if (!orphanStarts.every(Boolean)) failures.push('independent roots all start their line');
if (checks.find(([name]) => name === 'diamond.widthCoversLanes')[1] !== true) failures.push('width must cover every lane in use');
if (checks.find(([name]) => name === 'diamond.edgeSlotsValid')[1] !== true) failures.push('edge slots must stay within the width');
if (checks.find(([name]) => name === 'diamond.rowCount')[1] !== true) failures.push('assignLanes must not drop rows');

if (failures.length > 0) {
  console.error('FAIL', failures);
  process.exit(1);
}
console.log('GRAPH OK');
