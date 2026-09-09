# Tooling plan

Goal: an open-source, desktop, web-based design tool with no slop. STACK.md holds the technology decisions and performance targets. This file lists what to set up, in order, and the decisions that block each step. Research date: 2026-09-08.

## 0. Decisions that block the rest

- [x] D1. Stack. Resolved in STACK.md: real DOM document view inside HTML-in-Canvas, WebGPU effects with WebGL2 fallback, Electron shell on pinned Chromium, React panels, Loro CRDT, Node or Bun sync server, headless Chromium for export. Tauri is rejected because WKWebView cannot expose HTML-in-Canvas.
- [x] D2. TypeScript major. TS 7.0.2, pinned. 7.1 is not released (beta 2026-11-06, RC 2026-11-20 per the iteration plan). Bump to 7.1 when stable. Do not run `typescript@next` nightlies in the repo. Only typescript-eslint needed 7.1, and D3 drops it.
- [x] D3. Linter engine. oxlint 1.82 with `typeAware: true` (oxlint-tsgolint 7.0.x, runs on TS 7.0) and oxfmt 0.67 for formatting. No ESLint, no Prettier. Cyclomatic and cognitive complexity come from `oxlint-plugin-complexity` through the oxlint JS plugin API, which is alpha. eslint-plugin-sonarjs was rejected: it depends on `typescript <6.1`, which bun's flat node_modules cannot satisfy next to TS 7.
- [x] D4. Primary agent host for pstack: Claude Code. Consequences: `/setup-pstack` writes `~/.cursor/rules/pstack-models.mdc`, which Claude Code never loads. After running it, mirror the role lines into `~/.claude/CLAUDE.md`. Model values available to the Agent tool here are `fable`, `opus`, `sonnet`, `haiku`, and `inherit-parent`. Multi-model panels (interrogate, arena, how critics) lose grok and gpt and become mixes of those four. `poteto-agent` exists as a Claude Code subagent. The verification generator writes `.cursor/skills/verify-<app>/`, so symlink or move it to `.claude/skills/`. Verify by typing `/poteto-mode` in a Claude Code chat; the skills are user-invocable only.

## 1. Agent instruction files (one source of truth)

- [x] `AGENTS.md` at the root, hand-written, under 200 lines. Commands, layout, conventions, a "never do" list, and the reply-style rule (section 2).
- [x] `CLAUDE.md` containing `@AGENTS.md` plus Claude-only extras. Claude Code does not read AGENTS.md natively.
- [ ] `.cursor/rules/*.mdc` only for Cursor-specific glob rules. Cursor reads AGENTS.md itself.
- [ ] `.claude/rules/*.md` with `paths:` frontmatter for area-scoped rules (renderer, document model, UI).
- [x] `.claude/settings.json` hooks: PostToolUse on Edit|Write runs the formatter and linter on the touched file; Stop hook runs typecheck and the unit tests. CLAUDE.md is context, hooks are enforcement.
- [ ] Never let an agent generate AGENTS.md. Generated context files measurably lower task success.

## 2. Reply and prose style: ASD-STE100

- [x] One line in AGENTS.md: reply in ASD-STE100 Issue 9. No rule restatement, no prose linter.
- [ ] Docs and PR descriptions: pstack `/technical-writing` and `/unslop`.
- [ ] Skip caveman. It compresses replies for token savings and conflicts with STE structure.

## 3. Agent skill packs

- [ ] pstack (installed, v0.14.8, cursor-plugins marketplace). Run `/setup-pstack` in the host chosen in D4. Use `/poteto-mode` for any non-trivial task, `/interrogate` for multi-model review, `/no-comments` before review, `/blast-radius` for small-looking changes, `/create-verification-skill` once the app boots.
- [ ] ponytail (DietrichGebert/ponytail). Run in a Claude Code chat: `/plugin marketplace add DietrichGebert/ponytail`, then `/plugin install ponytail@ponytail`. `/ponytail-review` reviews the diff for over-engineering only (delete, stdlib, native, yagni, shrink tags). `/ponytail-audit` does the whole repo. Overlaps pstack's laziness-protocol principle and Claude's `/simplify`; keep ponytail-review as the diff gate and drop the AGENTS.md snippet it ships if it duplicates pstack rules.
- [ ] Claude Code built-ins: `/code-review high` before every PR, `/security-review` on anything touching the Electron main process, preload, IPC, the `app://` protocol handler, or CSP.

## 4. Static analysis (oxlint + oxfmt, per D3)

Rules to enforce as errors:
- [x] Cyclomatic 10 and cognitive 15 from one rule, `complexity/complexity` in `oxlint-plugin-complexity`. Verified: fires on probe files.
- [x] `max-lines-per-function` 60, `max-lines` 400, `max-depth` 3, `max-params` 4, `max-nested-callbacks` 3.
- [x] `rules-of-hooks` and `exhaustive-deps` from oxlint's native react-hooks plugin. The React Compiler rules from `eslint-plugin-react-hooks` 7 load as a JS plugin under the alias `react-compiler` because oxlint reserves the `react-hooks` name. `react-you-might-not-need-an-effect` loads under the alias `no-effect` with all nine rules on.
- [x] Native oxlint rule sets: typescript, oxc, unicorn, import, promise, react, jsx-a11y, vitest. Typed rules verified: `no-floating-promises`, `no-unsafe-*` fire on a probe file. `perfectionist`, `regexp`, `no-only-tests` not added; `vitest/no-focused-tests` covers the last.
- [x] tsconfig: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noPropertyAccessFromIndexSignature`.
- [x] Separate CI jobs, each blocking: format, lint, typecheck, test, knip, jscpd. Dropped: dependency-cruiser and type-coverage, both need the TypeScript JS API that TS 7 does not have (dependency-cruiser cruised 0 modules, type-coverage crashed). Layer boundaries and cycles now come from oxlint: `import/no-cycle` plus `no-restricted-imports` overrides per directory in `.oxlintrc.json`. Revisit both tools after TS 7.1.
- [x] lefthook for pre-commit (format staged, lint staged, typecheck). Installed by `bun install` through the `prepare` script; lefthook is in `trustedDependencies` so its postinstall runs.
- [ ] Optional dashboards, free for public repos: SonarQube Cloud (cognitive complexity, quality gate), Qlty CLI (cyclomatic + cognitive + duplication), Codecov.
- [ ] Dead, do not use: ts-complex, es6-plato, code-complexity.
- [x] Boundaries that match the STACK.md process split, as oxlint `no-restricted-imports` overrides: `src/document/` imports no React, Electron, Node, or process code; `src/renderer/` and `src/workers/` import no Node, Electron, main, or preload; `src/main/` and `src/preload/` import no React or renderer code.
- [ ] Electron security static analysis: evaluate Electronegativity (Doyensec). Verify it is maintained before adopting.
- [ ] browserslist pinned to the Chromium version Electron ships, so no transpilation for the desktop target.

## 5. Tests and proof

- [x] Vitest 5 for unit tests, config in `vitest.config.ts`, `passWithNoTests` on until the first test exists.
- [ ] Playwright for end-to-end, using its Electron launcher for the desktop target and Chromium with the `canvas-draw-element` flag for the web target. Not installed yet; add with the first STACK.md prototype.
- [ ] Stryker 10 mutation testing on PR diffs, reported but not blocking.
- [ ] Performance budget checks in CI for the STACK.md section 3 targets: warm launch, drag latency at 500 layers, layer panel at 10 000 nodes. Measured from process creation with Chromium tracing, reported on every PR, blocking once a baseline exists.
- [ ] STACK.md section 5 assumptions get one prototype each before any feature work. Ponytail-review and poteto-mode prototype playbook apply; prototypes are deleted, not promoted.
- [ ] Project verification skill from pstack `/create-verification-skill`: launch, doctor, drive one feature, capture evidence, clean up. Agents must prove behavior against the running app, not against "it compiles".

## 6. AI review on GitHub

- [x] CodeRabbit, free for public repos, reviews fork PRs. `.coderabbit.yaml` written with `reviews.profile: assertive`, `path_instructions`, and `knowledge_base.code_guidelines` pointing at AGENTS.md.
- [ ] GitHub Copilot code review as a second model. Reads AGENTS.md and REVIEW.md. Public repos are exempt from the Actions-minutes charge.
- [ ] Maintainer-run `/code-review ultra` or `claude ultrareview <PR> --post` on non-trivial PRs. Paid per run after 3 free.
- [ ] Skip `claude-code-action` for auto-review: secrets are withheld on fork PRs so it never sees external contributions. Skip Bugbot and Greptile: per-run billing that hits external contributors.
- [ ] Self-host option if CodeRabbit gets noisy: PR-Agent (Apache-2.0, community-owned) or Kodus (AGPL), bring your own key.

## 7. Repo hygiene and contributor policy

- [x] CI workflow in `.github/workflows/ci.yml`, one job per gate. Bun installs, Node runs Vitest.
- [ ] GitHub required checks and DCO: configure in the GitHub repo settings after the first push. CODEOWNERS only when there is a second maintainer.
- [x] Changesets and commitlint removed. No release process yet, and commit shape is not a quality signal.
- [x] `REVIEW.md` with the severity bar and nit cap, read by Copilot review and Anthropic's managed review.

## Sources

Linters: eslint.org/docs/latest/rules/complexity, oxc.rs/blog/2026-07-22-type-aware-linting-stable, biomejs.dev/linter/rules/no-excessive-cognitive-complexity, evilmartians.com/chronicles/ten-anti-ai-slop-moves-for-frontend-projects-going-faster-than-humans-can-review.
Agent files: code.claude.com/docs/en/memory, code.claude.com/docs/en/hooks, agents.md, cursor.com/docs/rules.
STE: asd-ste100.org.
Skill packs: github.com/cursor/plugins/tree/main/pstack, github.com/DietrichGebert/ponytail.
Review: docs.coderabbit.ai/reference/configuration, code.claude.com/docs/en/ultrareview, code.claude.com/docs/en/github-actions.
Stacks: figma.com/blog/figma-rendering-powered-by-webgpu, penpot.app/blog/penpots-new-rendering-system, loro.dev/docs/performance.
