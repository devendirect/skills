# Keywords

The lists the scripts use are in `scripts/keywords.json` (regular expressions, case-insensitive, French and English). This file explains them; change both together.

## Finding the terms of use (`terms_links`)

Links on the page, else on the home page, scored on their text and address:

| Score | Matches |
| --- | --- |
| 3 | conditions générales d'utilisation, CGU, conditions d'utilisation, terms of use, terms of service, ToS, acceptable use |
| 2 | conditions générales, terms and conditions, terms, user agreement |
| 1 | mentions légales, informations légales, legal notice, legal, imprint, Impressum |

At most 3 pages are read, highest score first, same site only.

## Keeping clauses (`clauses`)

A paragraph of the terms is kept when it matches at least one category:

| Category | Examples |
| --- | --- |
| scraping | scraping, scraper, aspiration, aspirateur, crawler, spider, moissonnage, harvesting |
| robots | robot, bot, automated / automatique / automatisé, programme informatique, logiciel d'extraction, script |
| extraction | extraction, extraire, copie systématique, téléchargement massif, bulk download |
| database | base de données, database, partie substantielle, substantial part, sui generis |
| mining | fouille de textes et de données, text and data mining, TDM, data mining, intelligence artificielle, entraînement, machine learning |
| reuse | réutilisation, reproduction, republication, redistribution, revente, resell, usage commercial |

Clauses about scraping and robots come first; at most 15 are kept, the report says when some were dropped. Long paragraphs are cut to the sentences that match and the sentence after each.

No match at all = "no clause about scraping, robots or reuse": nothing for the model to classify. That is not a permission by itself; for `lookup` it lets G4 apply.

## Known gaps

- A ban phrased without any of these words ("you may only access the site through a browser") is missed. When the user can, they should skim the terms themselves; the answer says the script only read the passages with these words.
- Terms in PDF or behind a login are not read (reported as not read).
- Languages other than French and English are not covered.
