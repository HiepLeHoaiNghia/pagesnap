# Visual Grounding Proof of Concept (Dogstudio Hero Case Study)

## Hypothesis
Supplying an automated `preview.png` alongside token and asset manifests transforms AI agent code output: instead of guessing 3D camera matrices and lighting blind, the agent calibrates directly against ground-truth pixels.

## Evidence
- Model: Google `gemini-3.8-flash` via `omp`.
- Input: PageSnap modular export + assets listed in section 3b + `preview.png`.
- Output: `plans/ps-005/evidence/rebuilds/current3/index.html`.
- Result image: `plans/ps-005/evidence/rebuilds/current3/out/proof-side-by-side.png`.
- Finding: Wolf camera perspective, scale, tilt, and lighting tone shifted from a distant distorted view to a tight match against Dogstudio's original hero composition.
