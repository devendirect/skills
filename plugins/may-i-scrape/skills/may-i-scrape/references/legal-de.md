# Legal framework: Germany

German points on top of the EU rules in `legal-eu.md`. Statutes are quoted from gesetze-im-internet.de (Federal Ministry of Justice; marked there as a non-official table of contents, the texts are the consolidated versions), decisions from the Hamburg courts' press releases. Anything marked *(to verify)* has not been checked: do not present it as a fact. **We are not lawyers**; every answer ends with the disclaimer.

Last checked: **2026-10-04**. Sources and URLs: `sources.md`.

## 1. Statutes: Urheberrechtsgesetz (UrhG)

**Text and data mining, § 44b UrhG**:

- (1): "Text und Data Mining ist die automatisierte Analyse von einzelnen oder mehreren digitalen oder digitalisierten Werken, um daraus Informationen insbesondere über Muster, Trends und Korrelationen zu gewinnen."
- (2): "Zulässig sind Vervielfältigungen von rechtmäßig zugänglichen Werken für das Text und Data Mining. Die Vervielfältigungen sind zu löschen, wenn sie für das Text und Data Mining nicht mehr erforderlich sind."
- (3): "Nutzungen nach Absatz 2 Satz 1 sind nur zulässig, wenn der Rechtsinhaber sich diese nicht vorbehalten hat. Ein Nutzungsvorbehalt bei online zugänglichen Werken ist nur dann wirksam, wenn er in maschinenlesbarer Form erfolgt."

**Scientific research, § 60d UrhG**: copies for TDM "für Zwecke der wissenschaftlichen Forschung" by research organisations, which must "1. nicht kommerzielle Zwecke verfolgen, 2. sämtliche Gewinne in die wissenschaftliche Forschung reinvestieren oder 3. im Rahmen eines staatlich anerkannten Auftrags im öffentlichen Interesse tätig sein"; excluded when a private company has "einen bestimmenden Einfluss auf die Forschungsorganisation und einen bevorzugten Zugang zu den Ergebnissen". Also libraries, museums, archives, and individual researchers (§ 60d(3)).

**Database right, §§ 87a, 87b, 87e UrhG**:

- § 87a(1): a database is a collection "deren Beschaffung, Überprüfung oder Darstellung eine nach Art oder Umfang wesentliche Investition erfordert"; a substantially changed database counts as a new one.
- § 87b(1): exclusive right to reproduce, distribute and communicate "die Datenbank insgesamt oder einen nach Art oder Umfang wesentlichen Teil"; the "wiederholte und systematische" use of insubstantial parts counts too when it conflicts with normal exploitation or unreasonably harms the maker. § 87b(3): not applicable in the cases of Article 43 of the Data Act (`legal-eu.md` § 1).
- § 87e: a contract forbidding the use of insubstantial parts is ineffective as far as that use neither conflicts with normal exploitation nor unreasonably harms the maker.

## 2. Decisions: the LAION case (Hamburg)

A photographer sued LAION, an association that publishes a free dataset of image-text pairs usable to train generative AI, for downloading one of his photos from a photo agency's website to check it against its description.

**Landgericht Hamburg, 27 September 2024, 310 O 227/23** (press release of the same day). Claim dismissed under § 60d (scientific research). On § 44b, as an aside: the agency's reservation "war … (nur) in 'natürlicher Sprache' formuliert"; whether such a reservation is "maschinenlesbar" depends on "der technischen Entwicklung zum jeweiligen Nutzungszeitpunkt", and given AI that can understand natural language, "dürften jedenfalls zum jetzigen Zeitpunkt nicht (mehr) nur im Webseiten-Code hinterlegte Nutzungsvorbehalte, sondern auch in natürlicher Sprache formulierte Nutzungsvorbehalte als maschinenlesbar im Sinne der Vorschrift anzusehen sein" *(quoted from the press release; the judgment itself was not read)*.

**Hanseatisches Oberlandesgericht, 10 December 2025, 5 U 104/24** (press release of the same day). Appeal dismissed. The copying was covered by § 44b: "Der auf der Webseite der Bildagentur zum Zeitpunkt des Downloads der Fotografie vorhandene Nutzungsvorbehalt habe vorliegend aber nicht die gesetzlich vorgesehene Form (Maschinenlesbarkeit) aufgewiesen (§ 44b Abs. 3 S. 2 UrhG), so dass die streitgegenständliche Vervielfältigung zulässig gewesen sei." Also covered by § 60d: building the dataset is "ein methodisches, auf einen späteren Erkenntnisgewinn gerichtetes und nachprüfbares Vorgehen …, das der angewandten Forschung zuzurechnen sei", even though commercial providers can use the dataset. "Die Entscheidung ist nicht rechtskräftig. Der Senat hat die Revision zugelassen".

**Bundesgerichtshof, I ZR 281/25** ("Erstellen eines Datensatzes für KI-Training"): the further appeal is pending. Hearing on 3 September 2026; the judgment is announced for **17 December 2026** (BGH, Terminhinweise). Until then, the question stays open. After that date, read the BGH press release before relying on this section.

**What it means for a scraper**: in Germany, a reservation written only in the terms of use, in plain words, may not count as a valid TDM reservation (appeal court, for a download in the past), while the first-instance court thought it might today; the Federal Court of Justice may decide. Technical signals (TDMRep, robots.txt) are the safer way for a site to reserve, and the safer signal for a scraper to respect.

**In the skill**: R2 and R3 stay red for `ai-tdm`; R4 on a clause reserving TDM stays red too, because the site objects in writing, and the explanation says its legal force is disputed in Germany. Never present the LAION decisions as "terms-of-use reservations do not count".

## 3. Terms of use and screen scraping

**When terms of use bind, § 305(2) BGB**: "Allgemeine Geschäftsbedingungen werden nur dann Bestandteil eines Vertrags, wenn der Verwender bei Vertragsschluss 1. die andere Vertragspartei ausdrücklich … auf sie hinweist und 2. der anderen Vertragspartei die Möglichkeit verschafft, in zumutbarer Weise … von ihrem Inhalt Kenntnis zu nehmen, und wenn die andere Vertragspartei mit ihrer Geltung einverstanden ist." How this applies to a scraper that never concludes a contract *(to verify)*.

**Bundesgerichtshof, 30 April 2014, I ZR 224/12, "Flugvermittlung im Internet"** (press release no. 69/2014). An airline's terms, accepted by ticking a box when booking, forbade automated extraction of its data to show it on another site; a flight portal did it anyway. Under unfair competition law (§ 4 Nr. 10 UWG, as then in force): "Allein der Umstand, dass sich die Beklagte über den von der Klägerin in ihren Geschäftsbedingungen geäußerten Willen hinwegsetzt, keine Vermittlung von Flügen im Wege des sogenannten 'Screen-Scraping' zuzulassen, führt nicht zu einer wettbewerbswidrigen Behinderung der Klägerin. Ein Unlauterkeitsmoment kann allerdings darin liegen, dass eine technische Schutzvorrichtung überwunden wird". The case was sent back to the appeal court on other claims; it is about competition law, not copyright or contract.

**In the skill**: this is the German reason why **getting round a technical protection** (O2) is the clearest line not to cross, while a ban written only in the terms is weaker in competition law; the clause still gives R4, because the site objects and contract or copyright claims may remain.

## 4. Criminal law: § 202a StGB

"(1) Wer unbefugt sich oder einem anderen Zugang zu Daten, die nicht für ihn bestimmt und die gegen unberechtigten Zugang besonders gesichert sind, unter Überwindung der Zugangssicherung verschafft, wird mit Freiheitsstrafe bis zu drei Jahren oder mit Geldstrafe bestraft."

It targets data "gegen unberechtigten Zugang besonders gesichert" accessed "unter Überwindung der Zugangssicherung": again the line is getting past a protection, not reading a public page. How courts apply it to scraping *(to verify)*.

## 5. Not covered

- Unfair competition law as currently worded (the UWG was amended after 2014) *(to verify)*.
- Data protection authorities' guidance on scraping (federal and Länder) *(to verify)*.
