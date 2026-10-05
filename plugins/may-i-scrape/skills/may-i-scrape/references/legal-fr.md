# Legal framework: France

French points on top of the EU rules in `legal-eu.md`. Each point quotes the official text (Légifrance, CNIL) with the date it was checked. Anything marked *(to verify)* has not been checked: do not present it as a fact. **We are not lawyers**; every answer ends with the disclaimer.

Last checked: **2026-10-04**. Sources and URLs: `sources.md`.

## 1. Database right: code de la propriété intellectuelle (CPI)

- Art. L342-1 (in force since 1 January 1998): "Le producteur de bases de données a le droit d'interdire : 1° L'extraction, par transfert permanent ou temporaire de la totalité ou d'une partie qualitativement ou quantitativement substantielle du contenu d'une base de données sur un autre support, par tout moyen et sous toute forme que ce soit ; 2° La réutilisation, par la mise à la disposition du public de la totalité ou d'une partie qualitativement ou quantitativement substantielle du contenu de la base, quelle qu'en soit la forme."
- Art. L342-3 (version since 26 November 2021): when the database is made available to the public, the right holder may not forbid, among others, 1° "L'extraction ou la réutilisation d'une partie non substantielle, appréciée de façon qualitative ou quantitative, du contenu de la base", and 6° "Les extractions, copies ou reproductions numériques d'une base de données, en vue de la fouille de textes et de données réalisée dans les conditions prévues à l'article L. 122-5-3". Clauses contrary to 1° and 6° are void.

## 2. Text and data mining: CPI art. L122-5-3

Version in force since 26 November 2021 (ordonnance n° 2021-1518 du 24 novembre 2021).

- I: "On entend par fouille de textes et de données, au sens du 10° de l'article L. 122-5, la mise en œuvre d'une technique d'analyse automatisée de textes et données sous forme numérique afin d'en dégager des informations, notamment des constantes, des tendances et des corrélations."
- II: copies for TDM "aux seules fins de la recherche scientifique" by research organisations, libraries, museums, archives and heritage institutions; not applicable "lorsqu'une entreprise, actionnaire ou associée de l'organisme ou de l'institution diligentant les fouilles, dispose d'un accès privilégié à leurs résultats".
- III: "des copies ou reproductions numériques d'œuvres auxquelles il a été accédé de manière licite peuvent être réalisées en vue de fouilles de textes et de données menées à bien par toute personne, quelle que soit la finalité de la fouille, sauf si l'auteur s'y est opposé de manière appropriée, notamment par des procédés lisibles par machine pour les contenus mis à la disposition du public en ligne." The copies are then "détruites à l'issue de la fouille".

No French court decision on what counts as a machine-readable opposition was checked *(to verify)*; see the German decisions in `legal-de.md` § 2.

## 3. Personal data: the CNIL on web scraping

**CNIL**, "La base légale de l'intérêt légitime : fiche focus sur les mesures à prendre en cas de collecte des données par moissonnage (web scraping)", 19 June 2025. Written for collecting data **to train AI systems**; a useful reference for other scraping, but not written for it. Measures it lists include:

- "exclure de la collecte les sites qui s'opposent clairement au moissonnage de leur contenu à des fins de constitution de bases de données pour l'entrainement, par l'utilisation des protocoles d'exclusion robots.txt ou la mise en place de CAPTCHA";
- "exclure de la collecte certaines catégories de données lorsqu'elles ne sont pas nécessaires", and some types of sites (for instance those used mostly by minors);
- "limiter la collecte aux données librement accessibles (c'est-à-dire aux contenus accessibles à tout utilisateur non inscrit sur le site en question et sans création d'un compte)";
- "diffuser le plus largement possible les informations relatives à la collecte et aux droits des personnes".

**In the skill**: for `ai-tdm` with personal data (O1), quote these measures. For other purposes, say the GDPR applies and point to the CNIL, without claiming the AI sheet covers the case.

## 4. Reuse of public information: code des relations entre le public et l'administration (CRPA)

- Art. L321-1: "Les informations publiques figurant dans des documents communiqués ou publiés par les administrations mentionnées au premier alinéa de l'article L. 300-2 peuvent être utilisées par toute personne qui le souhaite à d'autres fins que celles de la mission de service public pour les besoins de laquelle les documents ont été produits ou reçus."
- Art. L321-2: not public information, among others, information in documents "sur lesquels des tiers détiennent des droits de propriété intellectuelle".
- Art. L322-1: "Sauf accord de l'administration, la réutilisation des informations publiques est soumise à la condition que ces dernières ne soient pas altérées, que leur sens ne soit pas dénaturé et que leurs sources et la date de leur dernière mise à jour soient mentionnées."
- Art. L322-2: "La réutilisation d'informations publiques comportant des données à caractère personnel est subordonnée au respect des dispositions de la loi n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés."

**In the skill**: G2 for `gouv.fr` hosts, presented as a presumption, with three caveats: third-party rights (L321-2 c), personal data (L322-2, and O1 stays), and the conditions of L322-1 (cite the source and the date of last update, do not alter). Which bodies count as "administrations" (art. L300-2) beyond `gouv.fr` is not checked by the script.

## 5. Not covered

- French decisions on scraping (for instance classified-ad sites): not checked at an official source, not used.
- Parasitism and unfair competition (case law) *(to verify)*.

## 6. Criminal law: intrusion into information systems (code pénal)

- Art. 323-1 (version since 26 January 2023): "Le fait d'accéder ou de se maintenir, frauduleusement, dans tout ou partie d'un système de traitement automatisé de données est puni de trois ans d'emprisonnement et de 100 000 € d'amende."
- Art. 323-3 (version since 27 July 2015): "Le fait d'introduire frauduleusement des données dans un système de traitement automatisé, d'extraire, de détenir, de reproduire, de transmettre, de supprimer ou de modifier frauduleusement les données qu'il contient est puni de cinq ans d'emprisonnement et de 150 000 € d'amende."

When scraping a public page is "frauduleux" (for instance after being blocked, or by getting round a protection) depends on case law that was not checked *(to verify)*.

**In the skill**: one more reason never to work around a protection or a login (O2). Do not tell a user that scraping public pages is a crime; say that getting past a barrier can raise criminal-law questions in France.
