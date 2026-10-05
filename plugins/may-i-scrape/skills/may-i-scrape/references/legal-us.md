# Legal framework: United States

What the skill may say about US law, and nothing more. Each point quotes the official text (statute, Supreme Court, Court of Appeals or District Court opinion published on govinfo.gov or the court's site) with its date. Anything marked *(to verify)* has not been checked at an official source: do not present it as a fact.

**We are not lawyers.** US scraping law is mostly **case law**: it differs between federal circuits and states, and many decisions below are first-instance or preliminary. Use this file to explain, never to conclude "it is legal". Every answer ends with the disclaimer.

Last checked: **2026-10-04**. Sources and URLs: `sources.md`.

## 1. Anti-hacking law: the Computer Fraud and Abuse Act (CFAA)

**18 U.S.C. § 1030** (2023 edition, govinfo.gov).

- § 1030(a)(2)(C): punishes whoever "intentionally accesses a computer without authorization or exceeds authorized access, and thereby obtains … information from any protected computer".
- § 1030(e)(6): "the term 'exceeds authorized access' means to access a computer with authorization and to use such access to obtain or alter information in the computer that the accesser is not entitled so to obtain or alter".
- § 1030(g): "Any person who suffers damage or loss by reason of a violation of this section may maintain a civil action against the violator", under conditions.

**Van Buren v. United States, 593 U.S. 374 (Supreme Court, 3 June 2021)** (citation from the Court's preliminary print, vol. 593 part 2, pages 374–408). Held: "An individual 'exceeds authorized access' when he accesses a computer with authorization but then obtains information located in particular areas of the computer—such as files, folders, or databases—that are off-limits to him." The Court describes a "gates-up-or-down inquiry—one either can or cannot access a computer system, and one either can or cannot access certain areas within the system". Footnote 8 leaves open "whether this inquiry turns only on technological (or 'code-based') limitations on access, or instead also looks to limits contained in contracts or policies."

**hiQ Labs, Inc. v. LinkedIn Corp., No. 17-16783 (9th Cir., 18 April 2022, on remand after Van Buren)**. On a **preliminary injunction** (not a final judgment), the court held that hiQ "raised a serious question as to whether the CFAA 'without authorization' concept is inapplicable where, as here, prior authorization is not generally required but a particular person—or bot—is refused access", and that "Van Buren therefore reinforces our conclusion that the concept of 'without authorization' does not apply to public websites." It adds that site owners "are not without resort, even if the CFAA does not apply: state law trespass to chattels claims may still be available. And other causes of action, such as copyright infringement, misappropriation, unjust enrichment, conversion, breach of contract, or breach of privacy, may also lie." What happened in the case afterwards (contract claims in the district court) *(to verify)*.

**In the skill**: this is why logins, paywalls and technical barriers (O2) matter so much: getting past a "gate" is where anti-hacking law bites. For public pages, say that the CFAA may not apply in the Ninth Circuit (California, among others) according to hiQ, that other circuits may differ *(to verify)*, and that contract and state-law claims remain possible.

## 2. Terms of use (contract law)

**Meta Platforms, Inc. v. Bright Data Ltd., No. 23-cv-00077-EMC (N.D. Cal., 23 January 2024, Doc. 181)**. The court denied Meta's motion for partial summary judgment and granted Bright Data's on Meta's breach-of-contract claims, finding "there is no genuine issue of fact whether Bright Data scraped non-public data while logged in—it did not", and noting Bright Data's argument "that the Terms do not prohibit scraping publicly available data while not logged in". A first-instance decision on the specific wording of Meta's terms.

Whether terms only linked from a page ("browsewrap") bind a visitor, compared with terms accepted by clicking ("clickwrap"), is state contract law *(to verify)*.

**In the skill**: a `prohibited` clause stays red (R4) everywhere: the site expressed a ban. For US users, explain that its force depends on how the terms were accepted (account, click, mere link) and on state law, and that scraping while logged in is riskier than scraping logged-off public pages (Bright Data).

## 3. Copyright

**17 U.S.C. § 102(b)**: "In no case does copyright protection for an original work of authorship extend to any idea, procedure, process, system, method of operation, concept, principle, or discovery, regardless of the form in which it is described, explained, illustrated, or embodied in such work."

**17 U.S.C. § 103(b)**: "The copyright in a compilation or derivative work extends only to the material contributed by the author of such work, as distinguished from the preexisting material employed in the work, and does not imply any exclusive right in the preexisting material."

**Feist Publications, Inc. v. Rural Telephone Service Co., 499 U.S. 340 (Supreme Court, 27 March 1991)**. Syllabus: "Since facts do not owe their origin to an act of authorship, they are not original and, thus, are not copyrightable. Although a compilation of facts may possess the requisite originality …, copyright protection extends only to those components of the work that are original to the author, not to the facts themselves." The "sweat of the brow" test is rejected.

**There is no US equivalent of the EU database right**: the effort of collecting data is not protected as such. The selection and arrangement can be; the texts, photos and other creative content on a page are.

**Fair use, 17 U.S.C. § 107**: factors "(1) the purpose and character of the use, including whether such use is of a commercial nature or is for nonprofit educational purposes; (2) the nature of the copyrighted work; (3) the amount and substantiality of the portion used in relation to the copyrighted work as a whole; and (4) the effect of the use upon the potential market for or value of the copyrighted work."

**Fair use and AI training: first-instance decisions that point in different directions.**

- *Thomson Reuters v. Ross Intelligence*, No. 1:20-cv-613-SB (D. Del., 11 February 2025): summary judgment for Thomson Reuters on fair use; Ross's use of headnotes to build a competing legal research tool "is not transformative". The judge notes "only non-generative AI is before me today."
  **On interlocutory appeal, Third Circuit, No. 25-2153** (argued 11 June 2026, opinion filed 30 September 2026): the court notes that "ROSS's AI was not a generative AI"; it finds that the 2,243 headnotes at issue have "some creative spark" (Feist), and that "Given that ROSS's use was highly commercial and minimally transformative, we conclude that the first factor weighs against fair use." It also notes that Ross tried to access Westlaw "despite notice that doing so was prohibited by Westlaw's terms of service", weighing against fair use to the extent good faith matters. The final disposition (affirmed or not, on every point) was not read in the text *(to verify)*.
- *Bartz v. Anthropic PBC*, No. C 24-05417 WHA (N.D. Cal., 23 June 2025, "Order on Fair Use"): "the use of the books at issue to train Claude and its precursors was exceedingly transformative and was a fair use under Section 107"; but summary judgment was denied for "the pirated library copies", sent to trial. The case then went to a class settlement: "Memorandum Opinion on Preliminary Approval of Class Action Settlement", 17 October 2025. Final approval *(to verify)*.
- *Kadrey v. Meta Platforms, Inc.*, No. 23-cv-03417-VC (N.D. Cal., 25 June 2025): summary judgment for Meta on the record of that case, while writing that "in many circumstances it will be illegal to copy copyright-protected works to train generative AI models without permission", and that the plaintiffs had barely argued market dilution.
- U.S. Copyright Office, *Copyright and Artificial Intelligence, Part 3: Generative AI Training*, pre-publication version, 9 May 2025: an agency report, **not law**. Conclusion: "Various uses of copyrighted works in AI training are likely to be transformative. The extent to which they are fair, however, will depend on what works were used, from what source, for what purpose, and with what controls on the outputs"; "making commercial use of vast troves of copyrighted works to produce expressive content that competes with them in existing markets, especially where this is accomplished through illegal access, goes beyond established fair use boundaries." On opt-outs, it reports that "some commenters suggested that, to the extent copyright owners 'opt out' of having their material used to train AI, whether through terms of use, the robots.txt instructions, or other means, a defendant's decision to ignore such opt-outs might inform the fair use analysis" (the commenters' view, not a conclusion of the Office).

**Federal government works, 17 U.S.C. § 105(a)**: "Copyright protection under this title is not available for any work of the United States Government, but the United States Government is not precluded from receiving and holding copyrights transferred to it by assignment, bequest, or otherwise." Federal works only: not state or local governments, not third-party content on a federal site, not personal data. The script does not detect `.gov` hosts as public bodies.

**In the skill**: O4 (`bulk`) stays: in the US the risk is copyright in the selection or in creative contents, plus contract, rather than a database right; say so. O5 (`republish`): copyright applies to texts and photos; facts alone are not protected (Feist). For `ai-tdm`: no TDM exception or opt-out exists in US law; fair use is decided case by case, and courts disagree; the robots.txt and TDMRep signals remain the site's stated wishes.

## 4. Personal data

No general federal privacy law covers scraping *(to verify)*; state laws apply.

**California Consumer Privacy Act (Cal. Civ. Code § 1798.140, as amended effective 1 January 2026)**:

- (v)(1): "'Personal information' means information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household."
- (v)(2)(A): "'Personal information' does not include publicly available information or lawfully obtained, truthful information that is a matter of public concern."
- (v)(2)(B)(i): "publicly available" means "(I) Information that is lawfully made available from federal, state, or local government records. (II) Information that a business has a reasonable basis to believe is lawfully made available to the general public by the consumer or from widely distributed media. (III) Information made available by a person to whom the consumer has disclosed the information if the consumer has not restricted the information to a specific audience." (ii): it "does not mean biometric information collected by a business about a consumer without the consumer's knowledge."

The CCPA only applies to a "business" (§ 1798.140(d)(1)) that meets at least one threshold: "(A) … had annual gross revenues in excess of twenty-five million dollars ($25,000,000) in the preceding calendar year" (the amount is adjusted over time: current figure *(to verify)*), "(B) … annually buys, sells, or shares the personal information of 100,000 or more consumers or households", or "(C) Derives 50 percent or more of its annual revenues from selling or sharing consumers' personal information". Other states have their own laws *(to verify)*.

**In the skill**: O1 stays orange for US sites too. The CCPA's "publicly available" exclusion is narrower than "anything visible online" (it depends on how the person made it public), and the GDPR still applies to data about people in the EU, wherever the scraper is.

## 5. Not covered

- Trespass to chattels (state common law), mentioned in hiQ as a possible claim; *eBay v. Bidder's Edge* (N.D. Cal. 2000) is cited there *(to verify)*.
- Circuits other than the Ninth on the CFAA *(to verify)*.
- State privacy laws other than California; biometric laws (for instance Illinois) *(to verify)*.
- The DMCA anti-circumvention rule: 17 U.S.C. § 1201(a)(1)(A) reads "No person shall circumvent a technological measure that effectively controls access to a work protected under this title." Whether a captcha or an anti-bot challenge is such a measure in a scraping case *(to verify)*. Another reason never to work around a protection (O2).
