# Consent regimes for analytics

The audience's location decides the rules, not the server's. Identify the target countries in Phase 1, then check the regime **at its source** *(verify)*. This is not legal advice: write it in the plan as "to confirm".

## Common regimes (non-exhaustive)

| Where | Text | Analytics cookies |
| --- | --- | --- |
| France | GDPR + ePrivacy, enforced by the CNIL | Prior consent, unless the tool meets the CNIL exemption (below) |
| Rest of the EU / EEA | GDPR + ePrivacy, national authority | Prior consent in most countries; exemptions vary by country |
| United Kingdom | UK GDPR + PECR (ICO) | Prior consent; check the latest ICO guidance, the rules on low-risk analytics have been evolving |
| Switzerland | nLPD / revFADP | Transparency required; check whether consent is needed for the setup |
| California | CCPA / CPRA | Opt-out ("Do Not Sell or Share"), honor Global Privacy Control |
| Québec | Law 25 | Consent for tracking technologies, privacy by default |
| Brazil | LGPD | A legal basis is required, often consent |
| Elsewhere | Varies | Check the local law; "no rule" is never the default assumption |

## France: the CNIL exemption

An audience-measurement tool is exempt from consent only if it meets all of these:

1. Strictly limited purpose: audience measurement for the publisher only.
2. Produces anonymous statistical data only.
3. No cross-referencing with other processing, no transfer of non-anonymous data to third parties.
4. No cross-site tracking with a shared identifier.

Tools whose provider reuses the data for its own purposes fall outside the exemption. **A tool is not exempt by brand, only by configuration.** Matomo or Plausible can qualify when configured to meet the conditions; Google Analytics in its standard setup requires consent.

## What to put in the plan

Two options, the choice belongs to the user:

- **A. Banner + conditional loading**: the tag is only mounted after explicit consent; "Accept" and "Refuse" equally visible; withdrawal through a permanent link that also deletes the cookies. With Google tags, implement **Consent Mode** (default `denied` before the choice). Check: no analytics network request before consent.
- **B. Exempt tool, no banner**: a tool configured to meet the exemption conditions of the target country, documented in the privacy page.

Either way: update the privacy page (tool, purpose, retention, rights).
