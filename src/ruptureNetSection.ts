/**
 * Net-section rupture path evaluation for bolted tension members.
 * Straight and staggered hole patterns are handled separately — no mixing.
 */

export type StaggerTerm = { p: number; g: number };

export type RupturePathSpec = {
  id: string;
  type: string;
  formula: string;
  holesCut: number;
  staggerTerms: StaggerTerm[];
};

export type EvaluatedRupturePath = RupturePathSpec & {
  holeDeductionTerm: number;
  staggerAdditionTerm: number;
  bn: number;
  an: number;
  governing: boolean;
};

function clampPositive(v: number): number {
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}

/** bn = b − Σ(dh per hole) + Σ(p²/(4g)) for each zig-zag step on the path. */
export function computeNetWidthForPath(
  b: number,
  dh: number,
  holesCut: number,
  staggerTerms: StaggerTerm[]
): number {
  const holeDeduction = holesCut * dh;
  const staggerAddition = staggerTerms.reduce((sum, term) => {
    if (!Number.isFinite(term.p) || !Number.isFinite(term.g) || term.g <= 0) return sum;
    return sum + (term.p * term.p) / (4 * term.g);
  }, 0);
  return clampPositive(b - holeDeduction + staggerAddition);
}

/** An = bn × t */
export function computeNetArea(bn: number, t: number): number {
  return clampPositive(bn) * t;
}

/** Governing tension rupture = minimum net area among candidates. */
export function getGoverningRupturePath(paths: EvaluatedRupturePath[]): EvaluatedRupturePath {
  if (paths.length === 0) {
    throw new Error('getGoverningRupturePath: empty paths');
  }
  return paths.reduce((min, p) => (p.an < min.an ? p : min), paths[0]);
}

/** Build evaluated paths from specs; picks governing path = minimum An. */
export function evaluateRupturePathsFromSpecs(
  specs: RupturePathSpec[],
  bPath: number,
  dh: number,
  t: number
): { paths: EvaluatedRupturePath[]; governing: EvaluatedRupturePath } {
  const evaluated: EvaluatedRupturePath[] = specs.map((spec) => {
    const bn = computeNetWidthForPath(bPath, dh, spec.holesCut, spec.staggerTerms);
    const an = computeNetArea(bn, t);
    const holeDeductionTerm = spec.holesCut * dh;
    const staggerAdditionTerm = spec.staggerTerms.reduce((s, term) => {
      if (!Number.isFinite(term.p) || !Number.isFinite(term.g) || term.g <= 0) return s;
      return s + (term.p * term.p) / (4 * term.g);
    }, 0);
    return {
      ...spec,
      holeDeductionTerm,
      staggerAdditionTerm,
      bn,
      an,
      governing: false,
    };
  });

  const governing = getGoverningRupturePath(evaluated);
  const paths = evaluated.map((p) => ({
    ...p,
    governing: p.id === governing.id,
  }));

  return { paths, governing };
}

export type RuptureInputs = {
  connection: string;
  holePattern: string;
  noOfHoles: number;
  rows: number;
  stagger_p: number;
  stagger_g: number;
};

/**
 * Candidate rupture paths — strictly separated by hole pattern.
 * - Straight: only straight deduction bn = b − n·dh (no stagger terms, stagger UI inputs ignored).
 * - Staggered: straight path + zig-zag paths only when diagonal geometry (p>0, g>0) allows stagger correction.
 */
export function getCandidateRupturePaths(inputs: RuptureInputs): RupturePathSpec[] {
  if (inputs.connection !== 'Bolted') {
    return [];
  }

  const n = Math.max(0, Number(inputs.noOfHoles));
  const nRows = Math.max(1, Number(inputs.rows));

  if (inputs.holePattern === 'Straight') {
    return [
      {
        id: 'R1',
        type: 'Straight',
        formula: 'bn = b − n·dh',
        holesCut: n,
        staggerTerms: [],
      },
    ];
  }

  if (inputs.holePattern !== 'Staggered') {
    return [
      {
        id: 'R1',
        type: 'Straight',
        formula: 'bn = b − n·dh',
        holesCut: n,
        staggerTerms: [],
      },
    ];
  }

  const sp = Number(inputs.stagger_p);
  const sg = Number(inputs.stagger_g);
  /** Zig-zag stagger term applies only when a diagonal step between staggered holes is defined. */
  const canDiagonalStagger = sp > 0 && sg > 0;

  const paths: RupturePathSpec[] = [
    {
      id: 'R1',
      type: 'Straight',
      formula: 'bn = b − n·dh',
      holesCut: n,
      staggerTerms: [],
    },
  ];

  if (!canDiagonalStagger) {
    return paths;
  }

  paths.push({
    id: 'R2',
    type: 'Single zig-zag',
    formula: 'bn = b − n·dh + p²/(4g)',
    holesCut: n,
    staggerTerms: [{ p: sp, g: sg }],
  });

  const multiTransitions = Math.max(0, nRows - 1);
  if (multiTransitions >= 2) {
    paths.push({
      id: 'R3',
      type: 'Multi zig-zag',
      formula: 'bn = b − n·dh + Σ(p²/(4g))',
      holesCut: n,
      staggerTerms: Array.from({ length: multiTransitions }, () => ({ p: sp, g: sg })),
    });
  }

  return paths;
}

/** Convenience: full evaluation for use in capacity calculator. */
export function evaluateBoltedRupturePaths(
  inputs: RuptureInputs,
  bPath: number,
  dh: number,
  t: number
): { paths: EvaluatedRupturePath[]; governing: EvaluatedRupturePath } {
  const specs = getCandidateRupturePaths(inputs);
  return evaluateRupturePathsFromSpecs(specs, bPath, dh, t);
}
