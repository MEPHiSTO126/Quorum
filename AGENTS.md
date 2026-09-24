# Quorum Agent Rules

Quorum is a React 19 + Vite civic voting platform (JavaScript, no TypeScript).
Mock/live dual-mode backend via `VITE_USE_MOCKS`. Zero automated tests.

## Design tokens (authoritative for all UI work)

One flat cobalt accent (`#1e40af` / `#2563eb`), no purple-blue gradients, no
glassmorphism, no emojis in UI. Newsreader serif headlines, Plus Jakarta Sans
body, JetBrains Mono for data. Light/dark themes via CSS vars in
`src/index.css`. Never render fabricated live data on public surfaces — the
landing page shows no session codes, counts, or tally links.

## Skills

Project skills live in `.opencode/skills/` and are auto-loaded:

- `react-expert`, `javascript-pro` — implementation guidance for this stack.
- `code-reviewer`, `security-reviewer`, `test-master` — verification lenses.
- `api-designer` — service-layer contract guidance.

Load the matching skill via the skill tool whenever a task falls in its
domain, before writing code.

## Mandatory verification gate

After any change under `src/` (or to services, contexts, router), the build
agent MUST dispatch the `verify-gate` subagent via the Task tool and fix every
FAIL before finishing. The gate runs `npm run lint` + `npm run build` itself
and reviews correctness, security (token handling, OTP rate limiting,
accredited-voter privacy shielding, XSS), and test coverage, returning
PASS/FAIL verdicts with `file:line` citations. A FAIL on any lens blocks the
change. This mirrors the `design-reviewer` gate used on UI work.
