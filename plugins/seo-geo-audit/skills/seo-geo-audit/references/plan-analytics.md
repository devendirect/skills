# Plan: analytics and consent

Always written, even if the conclusion is "no analytics is needed".

## 1. Choose the tool and the consent strategy (user decision)

Present the options from [`consent.md`](consent.md) for the target countries: banner + conditional loading, or a tool configured to be exempt. Recommend one, the user decides.

## 2. Install

- Property or site created in the tool's console (manual).
- Integrated through the framework's official component or plugin when there is one (see [`stacks.md`](stacks.md)).
- Measurement ID in an environment variable; watch variables inlined at build time (`NEXT_PUBLIC_*`, `VITE_*`…): define them at build, not at runtime.
- With Google tags in a consent-required country: Consent Mode with default `denied`, updated on the user's choice.

## 3. Events specific to the site

- Prefer **recommended event names** when one fits (`search` with `search_term`, `sign_up`, `purchase`…): they fill the built-in reports. Otherwise, descriptive snake_case.
- Only events that answer a question the owner actually has. Three useful events beat thirty.
- In the console (manual): register custom dimensions (not retroactive), mark key events, link Search Console, filter internal traffic.

## 4. Verify

- The tool's debug view shows the events.
- **No analytics request before consent** (browser network tab, fresh profile) when consent is required.
- Refusing and then withdrawing consent removes the cookies.
- Privacy page updated: tool, purpose, retention, rights, how to withdraw.
