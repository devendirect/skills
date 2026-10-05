---
name: may-i-scrape
description: "Checks whether data from a website can be collected lawfully and politely, for a given purpose (one-off lookup, monitoring, bulk extraction, AI training / text and data mining, republication or resale). Reads robots.txt (including AI crawler rules), X-Robots-Tag and meta robots, TDM reservations (TDMRep), open licences, public-body status, access protections and the clauses of the site's terms of use about scraping, then gives a green / orange / red verdict with the signals behind it and an official alternative when one exists. Use whenever the user is about to scrape, crawl, extract or collect data from a site, write a scraper, or asks whether they may reuse a page's data, even if they do not mention legality. Also in French: « ai-je le droit de scraper », « aspirer un site », « récupérer les données d'un site », « faire un scraper ». Never helps bypass robots.txt, anti-bot protections, logins or paywalls. Not legal advice."
---

# May I scrape this?

Goal: tell the user, for one site and one purpose, whether collecting the data looks allowed, and how to do it politely. The verdict comes from a script that applies a fixed decision table; you classify the clauses of the terms of use and explain the verdict, you do not make it up or change it.

Facts in this skill and its references were last checked on **2026-10-04**. (Each `legal-*.md` has its own date; `run-all.mjs` reports the oldest one in `facts`.)

## Absolute rules

1. **Compliance, not evasion.** Never suggest, write or explain how to get round a restriction: no browser-like or rotating user agents, no proxies or IP rotation, no captcha solving, no headless tricks to pass a challenge, no logging in with someone's account, no paywall bypass, no ignoring robots.txt. A protected or forbidden page gets the verdict and an alternative (official API, dataset, feed, asking the site for permission), not a workaround. This holds even if the user insists or says it is for testing.
2. **The verdict is the script's.** Report the verdict and its reason codes as given. If you think it is wrong, say so next to it ("the script says orange; I would add…"), never replace it.
3. **No green without a positive signal.** The absence of a ban is not a permission. Do not soften an orange into "you're fine".
4. **Classify honestly, with the definitions of `references/decision-table.md`.** Your labels on the clauses of the terms feed the verdict. Label what the clause says, not what the user hopes. "Forbidden without our permission / without a licence" is `prohibited`, not `conditional`. In doubt, take the stricter label. Never label a clause `allowed` unless it explicitly allows this use.
5. **Not legal advice, and say it every time.** Use cautious wording ("seems to forbid", "to confirm"). **Every answer ends with the disclaimer from the report, translated into the user's language, as its own visible paragraph**, whatever the colour (green included). Never shorten it, never drop it, even if the user asks for a short answer. State legal points only as written in the `references/legal-*.md` files, with their source; anything marked *(to verify)* there is not a fact.
6. **Red means do not scrape that path.** Do not write a scraper for it. Orange: you may help, with the caveats and the good practices. Green: still remind the user of the conditions (licence attribution, personal data, rate).
7. **The script is the only reader.** Do not fetch the site with a web-fetch tool or curl to "double-check": it would ignore the politeness rules and convert the page, losing headers.

## Steps

### 1. URL and purpose

You need the URL of a page that holds the data (not just the home page, if they differ) and the **purpose**. Map what the user says to one of:

| Purpose | When |
| --- | --- |
| `lookup` | a few pages, once, personal use or research |
| `monitor` | the same pages again and again (price watch, change alerts) |
| `bulk` | a whole catalogue, directory or database, or a large part of it |
| `ai-tdm` | training a model, building a corpus, text and data mining |
| `republish` | showing the data on another site or app, or selling it |

If the purpose is unclear, **ask** (one short question with these five choices). Ask also, if relevant: the user-agent token their scraper will send (`--agent`), and how many pages (`--volume`, e.g. `200` or `50/day`). If the user cannot answer or the run is non-interactive, run without `--purpose`: the script gives a verdict for each purpose.

### 2. Run the script

Node 18+, no dependencies, in this skill's `scripts/` folder:

```
node <skill>/scripts/run-all.mjs <URL> --purpose <purpose> [--agent <token>] [--volume <N>[/day]] --json
```

- It reads at most robots.txt, the page, `/.well-known/tdmrep.json`, `/.well-known/api-catalog`, the home page and 3 pages of terms, one at a time, with an honest user agent, and respects robots.txt for its own reads.
- `--datagouv` also searches data.gouv.fr for datasets of this domain. It sends the domain name to data.gouv.fr: **only use it if the user agrees**. Suggest it for French public or open data topics.
- If the user's description or the page makes it clear that the data is about people (profiles, names, contact details, signed reviews) and `signals.personal_data.level` is `not detected`, add `--personal-data likely`. You can make the verdict stricter this way, never looser.

### 3. Classify the clauses of the terms

If `signals.terms.clauses` is not empty, read each clause and label it **for each purpose asked**: `prohibited`, `conditional`, `allowed` or `unrelated`. The definitions and examples are in `references/decision-table.md` ("Classifying clauses"). Then run the same command again with:

```
--classify '{"c1a2b3c4d": {"bulk": "prohibited"}, "c5e6f7a8b": {"bulk": "unrelated"}}'
```

(`{"<id>": "<label>"}` applies one label to every purpose; on Windows, if quoting is awkward, write the JSON to a file and pass its path.) The verdict from this second run is the one you report. If the clauses list is empty, there is nothing to classify: say "no clause about scraping, robots or reuse found in the terms", which is not a permission by itself.

### 4. No network

If the script cannot reach the site (no network here, DNS error, everything "not read"), say so and offer the offline mode: the user pastes the robots.txt, the page's HTML, the response headers and / or the text of the terms into files, and you run:

```
node <skill>/scripts/run-all.mjs <URL> --robots-file robots.txt --page-file page.html --headers-file headers.txt --terms-file terms.txt --json
```

Any subset works. What was not pasted is listed as not verified and rules out a green verdict (O8, O9, O6); a pasted robots.txt rule or a clause of the terms can still make it red. Do not guess a verdict without any input.

### 5. Answer

In the user's language, short:

1. **Verdict** per purpose asked: 🟢 / 🟠 / 🔴 and one sentence.
2. **Why**: each reason code in plain words (`references/decision-table.md`), with the evidence the report gives (the robots.txt rule, the TDM source, the licence, a short quote of the clause). Mention covered points ("bulk extraction would normally be a concern, but the data is under Licence Ouverte"). For the law behind a code, see "Which law" below; quote the text cautiously, with its source.
3. **Not verified**: the report's `unverified` list. If the terms were read, say that only the passages with scraping-related words were checked (`references/keywords.md`, "Known gaps").
4. **Alternative**: API catalog entries, API / developer / open-data links, feeds, sitemaps, data.gouv.fr datasets. Prefer them to scraping when they cover the need.
5. **If they go ahead** (orange or green): the good practices that fit, from `references/good-practices.md`. Not the whole list.
6. The **disclaimer** from the report, in full, in the user's language, as the last paragraph. French: « Nous ne sommes pas avocats et ceci n'est pas un avis juridique. Ce verdict ne reflète que les signaux lisibles par machine publiés par le site et les passages de ses conditions d'utilisation qui contiennent des mots liés au scraping, lus le jour de la vérification ; il peut manquer ou mal lire des clauses. Avant de collecter ou de réutiliser ces données, faites vérifier votre projet par un avocat. »

Never paste the full JSON unless asked.

**Old copy of the skill.** If the report says `facts.stale: true` (legal facts checked more than 6 months ago, or a date missing), say so **before the verdict**, in one sentence: laws and court decisions may have changed since `facts.checked`, and the user should update the plugin (`/plugin update`, or reinstall). The verdict from the site's own signals still stands; the legal explanations may be out of date, so be even more cautious with them.

### Which law

Which country's law applies depends on where the user is, where the site is run and whom the data is about; it is often more than one, and this skill does not decide it. Use:

| Where the user, the site or the people in the data are | Read |
| --- | --- |
| European Union | `references/legal-eu.md` (common to the 27), plus the national file if there is one: `legal-fr.md` (France), `legal-de.md` (Germany). Other member states: EU rules only, say their national details are not covered |
| United Kingdom | `references/legal-uk.md` (not EU law since Brexit) |
| United States | `references/legal-us.md` |

When several places are involved, use every file that applies (a US scraper on a French site: US and EU / France; data about people in the EU: the GDPR applies whoever scrapes). When the user's location is unknown and it matters for the explanation, ask, or give the points for the site's country and say which other files could apply.

For any other country, say plainly that its law is not covered, explain the verdict from the site's own signals (robots.txt, TDM, licence, terms), which do not depend on the country, and recommend a local lawyer.

## References

- `references/decision-table.md`: every reason code, what covers it, how to classify clauses.
- `references/legal-eu.md`, `legal-fr.md`, `legal-de.md`, `legal-uk.md`, `legal-us.md`: the legal points the skill may state, quoted from official texts, with what is still *(to verify)*.
- `references/good-practices.md`: how to scrape politely when the verdict allows it.
- `references/keywords.md`: how the terms of use are found and which words select a clause.
- `references/sources.md`: every official source, with the date it was checked.
