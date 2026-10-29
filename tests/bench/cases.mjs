// plan-exempt — Phase 13 benchmark cases (plan ps-001)
// expect: what an HONEST tool should do.
//   'reproduce' -> the clone must follow the original (score is judged)
//   'partial'   -> a known engine limit (here: only the X axis is swept); the tool must LABEL it partial, not high/medium
//   'reject'    -> the tool must say "unsupported"; claiming support is a FAILURE
export const CASES = [
  {
    id: 'linear-fins',
    label: 'Linear — Fig 0.3 fin wave (Framer Motion springs, pointer X)',
    kind: 'pointer spring (real site)',
    expect: 'reproduce',
    url: 'https://linear.app',
    selector: '.GJ9TEa_benefit._9PBFba_c'
  },
  {
    id: 'bars-spring',
    label: 'Spring bars, hand-written rAF loop (pointer X)',
    kind: 'pointer spring',
    expect: 'reproduce',
    fixture: 'pointer-spring-bars.html',
    selector: '#stage'
  },
  {
    id: 'tilt-2axis',
    label: 'Card tilt via inline transform (pointer X and Y, no spring)',
    kind: 'pointer, two axes',
    expect: 'partial',
    fixture: 'pointer-tilt.html',
    selector: '#stage'
  },
  {
    id: 'css-hover',
    label: 'CSS :hover transition (no script writes; invisible to a DOM-attribute engine)',
    kind: 'css only',
    expect: 'reject',
    fixture: 'css-hover-card.html',
    selector: '#stage'
  },
  {
    id: 'stateful-slider',
    label: 'Position integrates pointer movement (history dependent)',
    kind: 'stateful',
    expect: 'reject',
    fixture: 'stateful-slider.html',
    selector: '#stage'
  },
  {
    id: 'autonomous',
    label: 'Autonomous rAF loop (time driven)',
    kind: 'time driven',
    expect: 'reject',
    fixture: 'autonomous-loop.html',
    selector: '#stage'
  },
  {
    id: 'canvas',
    label: '2D canvas wave (pointer driven, no DOM writes)',
    kind: 'canvas',
    expect: 'reject',
    fixture: 'canvas-wave.html',
    selector: '#stage'
  },
  {
    id: 'random',
    label: 'Random jumps on pointer move (non-deterministic)',
    kind: 'random',
    expect: 'reject',
    fixture: 'random-noise.html',
    selector: '#stage'
  }
];
