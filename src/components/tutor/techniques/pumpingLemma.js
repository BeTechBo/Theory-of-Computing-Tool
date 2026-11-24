// S13 · Pumping Lemma for Regular Languages
// Generates the formal step-by-step adversary contradiction proof that a language is not regular.

export const PUMPING_PRESETS = {
  '0ⁿ1ⁿ': {
    name: '0ⁿ1ⁿ (Equal 0s and 1s)',
    languageDesc: 'L = {0ⁿ 1ⁿ | n ≥ 0}',
    stringChoice: 's = 0ᵖ 1ᵖ',
    stringReason: 's has length 2p ≥ p, and s ∈ L because the number of 0s equals the number of 1s.',
    partitionAnalysis: 'Because |xy| ≤ p, the substring xy must fall entirely within the initial block of 0s. Thus, x = 0ᵏ, y = 0ᵐ with m ≥ 1 and k+m ≤ p, and z = 0ᵖ⁻⁽ᵏ⁺ᵐ⁾ 1ᵖ.',
    pumpChoice: 'i = 2 (pump up)',
    pumpCalculation: 'xy²z = 0ᵏ (0ᵐ)² 0ᵖ⁻⁽ᵏ⁺ᵐ⁾ 1ᵖ = 0ᵖ⁺ᵐ 1ᵖ. Since m ≥ 1, the number of 0s is p + m > p, but the number of 1s is exactly p. Thus #0 ≠ #1, so xy²z ∉ L.',
    altPump: 'i = 0 (pump down gives 0ᵖ⁻ᵐ 1ᵖ ∉ L because p - m < p).'
  },
  'aⁿb²ⁿ': {
    name: 'aⁿb²ⁿ (Twice as many b as a)',
    languageDesc: 'L = {aⁿ b²ⁿ | n ≥ 0}',
    stringChoice: 's = aᵖ b²ᵖ',
    stringReason: 's has length 3p ≥ p, and s ∈ L because #b = 2 · #a.',
    partitionAnalysis: 'Since |xy| ≤ p, y consists entirely of a’s: y = aᵐ where 1 ≤ m ≤ p.',
    pumpChoice: 'i = 2 (pump up)',
    pumpCalculation: 'xy²z = aᵖ⁺ᵐ b²ᵖ. For this to be in L, we would need 2(p + m) = 2p, which means 2m = 0, contradicting m ≥ 1. Thus xy²z ∉ L.',
    altPump: 'i = 0 gives aᵖ⁻ᵐ b²ᵖ ∉ L.'
  },
  'ww': {
    name: 'ww (Duplicated strings)',
    languageDesc: 'L = {w w | w ∈ {0,1}*}',
    stringChoice: 's = 0ᵖ 1 0ᵖ 1',
    stringReason: 's has length 2p + 2 ≥ p, and s ∈ L with w = 0ᵖ 1.',
    partitionAnalysis: 'Because |xy| ≤ p, y consists entirely of 0s from the first block of 0s: y = 0ᵐ with 1 ≤ m ≤ p.',
    pumpChoice: 'i = 2 (pump up)',
    pumpCalculation: 'xy²z = 0ᵖ⁺ᵐ 1 0ᵖ 1. The first half has more 0s than the second half, so it cannot be factored into two identical halves u u. Thus xy²z ∉ L.',
    altPump: 'i = 0 gives 0ᵖ⁻ᵐ 1 0ᵖ 1 ∉ L.'
  },
  '1ⁿ²': {
    name: '1ⁿ² (Square lengths)',
    languageDesc: 'L = {1ⁿ² | n ≥ 0}',
    stringChoice: 's = 1ᵖ²',
    stringReason: 's has length p² ≥ p, and p² is a perfect square.',
    partitionAnalysis: 'Since |xy| ≤ p and |y| ≥ 1, y = 1ᵐ with 1 ≤ m ≤ p.',
    pumpChoice: 'i = 2 (pump up)',
    pumpCalculation: '|xy²z| = p² + m. But p² < p² + m ≤ p² + p < p² + 2p + 1 = (p + 1)². The length strictly falls between two consecutive perfect squares p² and (p+1)², so |xy²z| is not a square and xy²z ∉ L.',
    altPump: 'i = 0 gives length p² - m which is strictly between (p-1)² and p² for p > 1.'
  },
  '0ⁱ1ʲ (i > j)': {
    name: '0ⁱ 1ʲ with i > j',
    languageDesc: 'L = {0ⁱ 1ʲ | i > j ≥ 0}',
    stringChoice: 's = 0ᵖ⁺¹ 1ᵖ',
    stringReason: 's has length 2p + 1 ≥ p, and s ∈ L because p + 1 > p.',
    partitionAnalysis: 'Because |xy| ≤ p, y = 0ᵐ with 1 ≤ m ≤ p.',
    pumpChoice: 'i = 0 (pump down)',
    pumpCalculation: 'xy⁰z = 0⁽ᵖ⁺¹⁾⁻ᵐ 1ᵖ. Since m ≥ 1, the number of 0s is at most (p + 1) - 1 = p. Thus the number of 0s is ≤ the number of 1s, which violates i > j. So xy⁰z ∉ L.',
    altPump: 'Pumping down breaks the inequality.'
  }
};

function resolvePumpingKey(input) {
  const raw = String(input || '').trim();
  const exact = Object.keys(PUMPING_PRESETS).find(
    k => k.toLowerCase() === raw.toLowerCase() || raw.includes(k)
  );
  if (exact) return exact;

  // Normalize ASCII (^, spaces, braces) and Unicode superscripts for fuzzy matching
  const flat = raw
    .toLowerCase()
    .replace(/ⁿ/g, 'n')
    .replace(/²/g, '2')
    .replace(/ⁱ/g, 'i')
    .replace(/ʲ/g, 'j')
    .replace(/[\s^{}()]/g, '');

  if (flat.includes('1n2') || flat.includes('square')) return '1ⁿ²';
  if (flat.includes('b2n') || flat.includes('twice')) return 'aⁿb²ⁿ';
  if (flat.includes('0i1j') || flat.includes('i>j')) return '0ⁱ1ʲ (i > j)';
  if (flat.includes('ww') || flat.includes('duplic')) return 'ww';
  return '0ⁿ1ⁿ';
}

export function solvePumpingLemma(languageKey = '0ⁿ1ⁿ') {
  const normKey = resolvePumpingKey(languageKey);

  const pset = PUMPING_PRESETS[normKey];
  const steps = [];

  // Step 1: Assumption
  steps.push({
    title: 'Step 1: Assumption for Contradiction',
    explain: 'We start by assuming that the language L is regular. If L were regular, it would satisfy the Pumping Lemma for regular languages.',
    lines: [
      `Language under investigation: ${pset.languageDesc}`,
      'Assume for contradiction that L is regular.',
      'By the Pumping Lemma, there exists an integer pumping length p ≥ 1.'
    ],
    table: [
      ['Property', 'Pumping Lemma Condition'],
      ['Pumping length', '∃ integer p ≥ 1'],
      ['String threshold', '∀ s ∈ L with |s| ≥ p'],
      ['Partition existence', '∃ split s = xyz such that |xy| ≤ p and |y| ≥ 1'],
      ['Pumping condition', '∀ i ≥ 0: x yⁱ z ∈ L']
    ],
    graph: '',
    highlight: [],
    extra: {}
  });

  // Step 2: String selection
  steps.push({
    title: 'Step 2: Choose String s ∈ L with |s| ≥ p',
    explain: `We select a specific string s in terms of p that belongs to L and has length at least p. The choice of string is crucial to force the partition y into a restricted region.`,
    lines: [
      `Selected string: ${pset.stringChoice}`,
      `Membership verification: ${pset.stringReason}`
    ],
    table: [
      ['Parameter', 'Value'],
      ['s', pset.stringChoice],
      ['Condition |s| ≥ p', 'Satisfied (length depends on p)'],
      ['Condition s ∈ L', 'Satisfied by definition of L']
    ],
    graph: '',
    highlight: [],
    extra: {}
  });

  // Step 3: Partition constraints
  steps.push({
    title: 'Step 3: Analyze the Adversary\'s Partition s = xyz',
    explain: 'The adversary chooses the split s = xyz, but must respect the two constraints: |xy| ≤ p and |y| ≥ 1. We analyze where y must be located.',
    lines: [
      'Constraint 1: |xy| ≤ p (the prefix xy is contained within the first p symbols).',
      'Constraint 2: |y| ≥ 1 (y is non-empty, containing at least one symbol).',
      `Deduction: ${pset.partitionAnalysis}`
    ],
    table: [
      ['Segment', 'Form', 'Length constraint'],
      ['x', 'Initial prefix', '|x| ≥ 0'],
      ['y', 'Pumped segment', '1 ≤ |y| ≤ p (non-empty!)'],
      ['z', 'Remaining suffix', 'Entire remainder of s']
    ],
    graph: '',
    highlight: [],
    extra: {}
  });

  // Step 4: Contradiction via pumping
  steps.push({
    title: 'Step 4: Pick Pumping Value i and Establish Contradiction',
    explain: `To defeat the adversary, we choose a value of i such that the pumped string x yⁱ z cannot belong to L.`,
    lines: [
      `Selected pumping value: ${pset.pumpChoice}`,
      `Calculation: ${pset.pumpCalculation}`,
      `Alternative pump: ${pset.altPump}`,
      `Result: x yⁱ z ∉ L, which contradicts the Pumping Lemma!`
    ],
    table: [
      ['i', 'Pumped String xyⁱz', 'Belongs to L?', 'Status'],
      ['1', 's (original string)', 'Yes', 'Original'],
      ['0', 'xy⁰z (pump down)', 'No', 'Contradiction ★'],
      ['2', 'xy²z (pump up)', 'No', 'Contradiction ★']
    ],
    graph: '',
    highlight: [],
    extra: {}
  });

  // Test evaluations
  const tests = [
    { input: 's for p=3', path: 'satisfies |s| ≥ p and s ∈ L', accepted: true },
    { input: 'xy²z (pumped up)', path: 'breaks language condition (counts/structure mismatch)', accepted: false },
    { input: 'xy⁰z (pumped down)', path: 'breaks language condition', accepted: false }
  ];

  return {
    technique: 'pumping',
    session: 'S13',
    input_summary: `Pumping Lemma proof for ${pset.languageDesc}`,
    formal: `Proof by contradiction using Pumping Lemma for regular languages. String: ${pset.stringChoice}`,
    facts: [
      { item: 'p', meaning: 'pumping length guaranteed by lemma if L were regular' },
      { item: 's', meaning: `${pset.stringChoice} chosen string in L` },
      { item: 'y', meaning: 'non-empty pumped substring confined to first p symbols' }
    ],
    steps,
    tests,
    language: pset.languageDesc,
    conclusion: `Contradiction established: x yⁱ z ∉ L. Therefore, by the Pumping Lemma, ${pset.languageDesc} is NOT a regular language.`
  };
}
