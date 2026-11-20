export const BLANK = '⊔';

export const TM_PRESETS = {
  'aⁿbⁿcⁿ  (Beyond Context-Free)': {
    name: 'aⁿbⁿcⁿ Decider',
    alphabet: ['a', 'b', 'c', 'X', 'Y', 'Z', BLANK],
    q0: 'q0',
    acceptState: 'q_acc',
    rejectState: 'q_rej',
    initialTape: 'aabbcc',
    description: 'Recognizes the non-context-free language aⁿbⁿcⁿ by matching each a with a b and a c.',
    transitions: [
      // q0: find an 'a', cross it off with 'X'
      { from: 'q0', read: 'a', to: 'q1', write: 'X', move: 'R' },
      { from: 'q0', read: 'Y', to: 'q4', write: 'Y', move: 'R' }, // all a,b,c crossed off?

      // q1: skip a's and Y's, find first 'b', cross it with 'Y'
      { from: 'q1', read: 'a', to: 'q1', write: 'a', move: 'R' },
      { from: 'q1', read: 'Y', to: 'q1', write: 'Y', move: 'R' },
      { from: 'q1', read: 'b', to: 'q2', write: 'Y', move: 'R' },

      // q2: skip b's and Z's, find first 'c', cross it with 'Z'
      { from: 'q2', read: 'b', to: 'q2', write: 'b', move: 'R' },
      { from: 'q2', read: 'Z', to: 'q2', write: 'Z', move: 'R' },
      { from: 'q2', read: 'c', to: 'q3', write: 'Z', move: 'L' },

      // q3: rewind back to the leftmost X
      { from: 'q3', read: 'Z', to: 'q3', write: 'Z', move: 'L' },
      { from: 'q3', read: 'b', to: 'q3', write: 'b', move: 'L' },
      { from: 'q3', read: 'Y', to: 'q3', write: 'Y', move: 'L' },
      { from: 'q3', read: 'a', to: 'q3', write: 'a', move: 'L' },
      { from: 'q3', read: 'X', to: 'q0', write: 'X', move: 'R' },

      // q4: verify no remaining b's or c's
      { from: 'q4', read: 'Y', to: 'q4', write: 'Y', move: 'R' },
      { from: 'q4', read: 'Z', to: 'q4', write: 'Z', move: 'R' },
      { from: 'q4', read: BLANK, to: 'q_acc', write: BLANK, move: 'R' }
    ]
  },
  'Binary Increment (+1)': {
    name: 'Binary Incrementer',
    alphabet: ['0', '1', BLANK],
    q0: 'q_find_end',
    acceptState: 'q_acc',
    rejectState: 'q_rej',
    initialTape: '1011',
    description: 'Traverses to the end of the binary number, carries 1 across 1s converting them to 0, until 0 or blank is found.',
    transitions: [
      { from: 'q_find_end', read: '0', to: 'q_find_end', write: '0', move: 'R' },
      { from: 'q_find_end', read: '1', to: 'q_find_end', write: '1', move: 'R' },
      { from: 'q_find_end', read: BLANK, to: 'q_add', write: BLANK, move: 'L' },

      { from: 'q_add', read: '1', to: 'q_add', write: '0', move: 'L' },
      { from: 'q_add', read: '0', to: 'q_rewind', write: '1', move: 'L' },
      { from: 'q_add', read: BLANK, to: 'q_rewind', write: '1', move: 'L' },

      { from: 'q_rewind', read: '0', to: 'q_rewind', write: '0', move: 'L' },
      { from: 'q_rewind', read: '1', to: 'q_rewind', write: '1', move: 'L' },
      { from: 'q_rewind', read: BLANK, to: 'q_acc', write: BLANK, move: 'R' }
    ]
  },
  'Palindrome Checker (w = wᴿ)': {
    name: 'Palindrome Checker',
    alphabet: ['a', 'b', BLANK],
    q0: 'q0',
    acceptState: 'q_acc',
    rejectState: 'q_rej',
    initialTape: 'abba',
    description: 'Reads outer left symbol, erases it, traverses to right end, verifies match, and repeats.',
    transitions: [
      { from: 'q0', read: 'a', to: 'q_find_a', write: BLANK, move: 'R' },
      { from: 'q0', read: 'b', to: 'q_find_b', write: BLANK, move: 'R' },
      { from: 'q0', read: BLANK, to: 'q_acc', write: BLANK, move: 'R' },

      // find rightmost to match 'a'
      { from: 'q_find_a', read: 'a', to: 'q_find_a', write: 'a', move: 'R' },
      { from: 'q_find_a', read: 'b', to: 'q_find_a', write: 'b', move: 'R' },
      { from: 'q_find_a', read: BLANK, to: 'q_check_a', write: BLANK, move: 'L' },

      { from: 'q_check_a', read: 'a', to: 'q_rewind', write: BLANK, move: 'L' },
      { from: 'q_check_a', read: BLANK, to: 'q_acc', write: BLANK, move: 'R' }, // single center char

      // find rightmost to match 'b'
      { from: 'q_find_b', read: 'a', to: 'q_find_b', write: 'a', move: 'R' },
      { from: 'q_find_b', read: 'b', to: 'q_find_b', write: 'b', move: 'R' },
      { from: 'q_find_b', read: BLANK, to: 'q_check_b', write: BLANK, move: 'L' },

      { from: 'q_check_b', read: 'b', to: 'q_rewind', write: BLANK, move: 'L' },
      { from: 'q_check_b', read: BLANK, to: 'q_acc', write: BLANK, move: 'R' },

      // rewind left to start of word
      { from: 'q_rewind', read: 'a', to: 'q_rewind', write: 'a', move: 'L' },
      { from: 'q_rewind', read: 'b', to: 'q_rewind', write: 'b', move: 'L' },
      { from: 'q_rewind', read: BLANK, to: 'q0', write: BLANK, move: 'R' }
    ]
  }
};

export function simulateTuringMachine(tm, initialInput, maxSteps = 4000) {
  const tape = {};
  const cleanInput = initialInput.trim();

  // Populate tape cells
  for (let i = 0; i < cleanInput.length; i++) {
    tape[i] = cleanInput[i];
  }

  const getTapeSymbol = (t, idx) => (t[idx] !== undefined ? t[idx] : BLANK);

  let state = tm.q0;
  let head = 0;
  let step = 0;

  const history = [
    {
      step: 0,
      state,
      head,
      tapeSnapshot: { ...tape },
      ruleApplied: null
    }
  ];

  let halted = false;
  let accepted = false;

  while (step < maxSteps) {
    if (state === tm.acceptState) {
      halted = true;
      accepted = true;
      break;
    }
    if (state === tm.rejectState) {
      halted = true;
      accepted = false;
      break;
    }

    const currentSymbol = getTapeSymbol(tape, head);
    const rule = tm.transitions.find(
      t => t.from === state && t.read === currentSymbol
    );

    if (!rule) {
      // No applicable transition -> machine halts
      halted = true;
      accepted = state === tm.acceptState;
      break;
    }

    // Apply rule: write
    tape[head] = rule.write;

    // Move head
    if (rule.move === 'R') head++;
    else if (rule.move === 'L') head--;

    // Update state
    state = rule.to;
    step++;

    history.push({
      step,
      state,
      head,
      tapeSnapshot: { ...tape },
      ruleApplied: rule
    });
  }

  return {
    history,
    totalSteps: step,
    halted,
    accepted,
    exceededMax: step >= maxSteps
  };
}
