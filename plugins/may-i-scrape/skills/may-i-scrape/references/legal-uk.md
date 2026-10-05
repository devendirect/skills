# Legal framework: United Kingdom

The UK left the EU: EU directives no longer apply as such, and UK law has its own wording (legislation.gov.uk, current revised versions). Each point quotes the official text with the date it was checked. Anything marked *(to verify)* has not been checked: do not present it as a fact. **We are not lawyers**; every answer ends with the disclaimer.

Last checked: **2026-10-04**. Sources and URLs: `sources.md`.

## 1. Text and data mining: only for non-commercial research

**Copyright, Designs and Patents Act 1988 (CDPA), s. 29A** "Copies for text and data analysis for non-commercial research":

- (1): "The making of a copy of a work by a person who has lawful access to the work does not infringe copyright in the work provided that— (a) the copy is made in order that a person who has lawful access to the work may carry out a computational analysis of anything recorded in the work for the sole purpose of research for a non-commercial purpose, and (b) the copy is accompanied by a sufficient acknowledgement (unless this would be impossible for reasons of practicality or otherwise)."
- (2): copyright is infringed if the copy "is transferred to any other person" or "used for any purpose other than that mentioned in subsection (1)(a)", unless authorised.
- (5): "To the extent that a term of a contract purports to prevent or restrict the making of a copy which, by virtue of this section, would not infringe copyright, that term is unenforceable."

**No commercial TDM exception.** The government consulted on an exception with an opt-out (December 2024 – February 2025). Its *Report on Copyright and Artificial Intelligence* (18 March 2026, under section 136 of the Data (Use and Access) Act 2025) says: "A broad copyright exception with opt-out is no longer the government's preferred way forward. We propose to gather further evidence on how copyright laws are impacting the development and deployment of AI across the economy." and "We will not introduce reforms to copyright law until we are confident that they will meet our objectives for the economy and UK citizens."

**In the skill**: for `ai-tdm` under UK law, copying protected content for commercial mining or AI training needs permission (licence) unless it is non-commercial research under s. 29A; a robots.txt or TDMRep "opt-out" has no special legal role in UK copyright law, but it is still the site's stated wish (R2 / R3 stay red). Facts themselves are a different question (database right below, copyright in individual contents *(to verify)*).

## 2. Database right

**Copyright and Rights in Databases Regulations 1997 (SI 1997/3032)**, as amended:

- Reg. 13(1): "A property right ('database right') subsists, in accordance with this Part, in a database if there has been a substantial investment in obtaining, verifying or presenting the contents of the database."
- Reg. 16(1): "a person infringes database right in a database if, without the consent of the owner of the right, he extracts or re-utilises all or a substantial part of the contents of the database." Reg. 16(2): "the repeated and systematic extraction or re-utilisation of insubstantial parts of the contents of a database may amount to the extraction or re-utilisation of a substantial part of those contents."
- Reg. 17: fifteen years from the end of the year of completion, or of first making available; "Any substantial change to the contents of a database … which would result in the database being considered to be a substantial new investment shall qualify the database resulting from that investment for its own term of protection."
- Reg. 19(1): "A lawful user of a database which has been made available to the public in any manner shall be entitled to extract or re-utilise insubstantial parts of the contents of the database for any purpose." Reg. 19(2): a term preventing this "shall be void".
- Reg. 20(1): fair dealing with a substantial part, for "illustration for teaching or research and not for any commercial purpose", if "the source is indicated".
- Reg. 18(1): the right only subsists if, at the material time, the maker was "an individual who was a national of the United Kingdom or habitually resident within the United Kingdom", a body incorporated under UK law with its central administration or principal place of business in the UK (or its registered office there, with operations "linked on an ongoing basis with the economy of the United Kingdom"), a UK partnership, or the Isle of Man equivalents. The current text lists no EEA makers: a database made by an EU company may have no UK database right *(how this applies to databases made before 2021: to verify)*.

**In the skill**: O4 (`bulk`) and O5 (`republish`) as in the EU; for `monitor`, mention reg. 16(2).

## 3. Unauthorised access: Computer Misuse Act 1990

**s. 1(1)**: "A person is guilty of an offence if— (a) he causes a computer to perform any function with intent to secure access to any program or data held in any computer, or to enable any such access to be secured; (b) the access he intends to secure, or to enable to be secured, is unauthorised; and (c) he knows at the time when he causes the computer to perform the function that that is the case."

When scraping public pages is "unauthorised" access (for instance after being blocked, or against the terms) has not been checked in UK case law *(to verify)*.

**In the skill**: this is why protections and logins (O2) are never to be worked around; say that getting past a block or a login can raise criminal-law questions in the UK, and that a UK lawyer should check any doubt.

## 4. Personal data: UK GDPR and the ICO

**UK GDPR** (Regulation (EU) 2016/679 as it forms part of UK law, as amended), art. 6(1): lawful bases include "(ea) processing is necessary for the purposes of a recognised legitimate interest" (added by the Data (Use and Access) Act 2025; Annex 1, inserted on 5 February 2026, lists the recognised interests: disclosure to a body carrying out a public task, national security, public security and defence, emergencies, crime, safeguarding vulnerable individuals; none of them covers scraping) and "(f) processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child."

**ICO** (Information Commissioner's Office), outcomes of its consultation series on generative AI, chapter "The lawful basis for web scraping to train generative AI models", published on 12 December 2024 ("We are today publishing our outcomes report", ICO news of that date):

- "Legitimate interests remains the sole available lawful basis for training generative AI models using web-scraped personal data", provided the three-part test (purpose, necessity, balancing) is passed; controllers "should explain why they are unable to use a different source of data".
- "Web scraping for generative AI training is a high-risk, invisible processing activity", with transparency obligations under article 14.

**In the skill**: O1 as in the EU. For `ai-tdm` with personal data, quote the ICO; for other purposes, say UK GDPR applies (lawful basis, information, minimisation).

## 5. Not covered

- Whether website terms bind a scraper under English contract law (browsewrap) *(to verify)*.
- UK court decisions on scraping *(to verify)*.
- Scotland and Northern Ireland differences (the texts above are UK-wide or as stated on legislation.gov.uk) *(to verify)*.
