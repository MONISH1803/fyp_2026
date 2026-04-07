/**
 * Run: npx tsx src/ruptureNetSection.selfTest.ts
 */
import assert from 'assert';
import {
  getCandidateRupturePaths,
  evaluateBoltedRupturePaths,
  computeNetWidthForPath,
  computeNetArea,
} from './ruptureNetSection';

function approx(a: number, b: number, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b}`);
}

// Straight plate, 2 holes: An = (b - 2*dh)*t
{
  const b = 100;
  const dh = 18;
  const t = 10;
  const n = 2;
  const bn = computeNetWidthForPath(b, dh, n, []);
  approx(bn, 64);
  approx(computeNetArea(bn, t), 640);
  const { paths, governing } = evaluateBoltedRupturePaths(
    {
      connection: 'Bolted',
      holePattern: 'Straight',
      noOfHoles: n,
      rows: 2,
      stagger_p: 25,
      stagger_g: 50,
    },
    b,
    dh,
    t
  );
  assert.strictEqual(paths.length, 1);
  assert.strictEqual(governing.id, 'R1');
  approx(governing.an, 640);
  assert.strictEqual(governing.staggerAdditionTerm, 0);
}

// Staggered: straight vs zig-zag — governing = minimum An (straight smaller for classic numbers)
{
  const b = 100;
  const dh = 18;
  const t = 10;
  const n = 2;
  const sp = 25;
  const sg = 50;
  const { paths, governing } = evaluateBoltedRupturePaths(
    {
      connection: 'Bolted',
      holePattern: 'Staggered',
      noOfHoles: n,
      rows: 2,
      stagger_p: sp,
      stagger_g: sg,
    },
    b,
    dh,
    t
  );
  assert.ok(paths.length >= 2);
  const straight = paths.find((p) => p.id === 'R1')!;
  const zig = paths.find((p) => p.id === 'R2')!;
  approx(straight.an, 640);
  approx(zig.an, 671.25);
  assert.ok(straight.an < zig.an);
  assert.strictEqual(governing.id, 'R1');
}

// Staggered but no diagonal (p or g zero) — only straight path, zero stagger addition
{
  const { paths, governing } = evaluateBoltedRupturePaths(
    {
      connection: 'Bolted',
      holePattern: 'Staggered',
      noOfHoles: 2,
      rows: 2,
      stagger_p: 0,
      stagger_g: 50,
    },
    100,
    18,
    10
  );
  assert.strictEqual(paths.length, 1);
  assert.strictEqual(governing.staggerAdditionTerm, 0);
}

// Straight pattern ignores stagger fields in path list (only R1)
{
  const specs = getCandidateRupturePaths({
    connection: 'Bolted',
    holePattern: 'Straight',
    noOfHoles: 2,
    rows: 2,
    stagger_p: 25,
    stagger_g: 50,
  });
  assert.strictEqual(specs.length, 1);
  assert.strictEqual(specs[0].staggerTerms.length, 0);
}

console.log('ruptureNetSection.selfTest: OK');
