# AI visibility (GEO) — Brewline

- **Audit date:** 2026-09-15
- **Scope:** local code and live site `http://localhost:8707`
- **Facts checked against sources on:** 2026-09-15
- **Legend:** [x] in place and verified, with proof in italics · [ ] to do · *(unverified)* could not be checked

## 1. A visible, truthful FAQ — impact M · effort S

**Finding:** buyers ask about warranty, grind range and burr size; the answers exist on the page but not as questions. — *proof: `public/grinder/index.html`*

**Code**
- [ ] Add a short visible FAQ on `/grinder/` with true answers (two-year warranty, espresso to French press, 38 mm burr)

**Done when:** the FAQ is in the served HTML of `/grinder/`.
