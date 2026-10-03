# TODO — améliorations de seo-geo-audit

Fichier temporaire : à supprimer quand tous les points sont faits. Dans l'ordre d'exécution proposé.

## Étape 1 — Rapide, résultats plus constants

- [x] **Déclencheurs en français dans la description** : « audit SEO », « visibilité IA », « être cité par ChatGPT », « référencement ». En passant le skill en anglais, les mots-clés français ont été réduits, alors qu'il est déclenché en français. *(effort S)*
- [x] **Modèle de fichier de plan fixe** : en-tête (date, périmètre, légende vérifié / non vérifié) ; chaque bloc avec une note impact (H/M/L) et effort (S/M/L). Aujourd'hui, la forme et l'ordre changent d'un audit à l'autre. *(effort S)*
- [x] **Fichier `00-summary.md`** : les 5 actions les plus rentables, les décisions à prendre, ce qui n'a pas pu être vérifié. La phase 4 ne laisse aujourd'hui qu'un résumé dans le chat. *(effort S)*

## Étape 2 — Fiabilité

- [x] **Scripts de vérification** dans `scripts/` (faits en Node : `check-live.mjs`, `robots-check.mjs`, `ai-crawlers.json`) : `check-live.sh <url>` (statut, en-têtes, redirections, JSON-LD extrait, échantillon du sitemap) et `robots-check` (quels robots du tableau sont bloqués). Résultat identique d'une fois à l'autre, moins de tokens, moins d'oublis. *(effort M)*

## Étape 3 — Preuve

- [x] **Projets de test avec résultat attendu** (`tests/seo-geo-audit/` : niveau 1 automatique fait et vert ; niveau 2, le skill complet, reste à lancer à la main) : site parfait, SPA vide, WordPress resté en noindex, JSON-LD qui ment, projet non déployé, site multilingue sans hreflang. Prouve que le skill marche et qu'une modification ne le casse pas. Sert aussi de niveaux pour l'épisode de la série. *(effort M)*

## Étape 4 — Publication

- [x] **Empaqueter le repo comme marketplace de plugins Claude Code** (reste : remplacer `OWNER/REPO` dans le README une fois le repo GitHub créé) (`.claude-plugin/marketplace.json`), et vérifier la compatibilité avec `npx skills add`. Installation en une commande, utile pour la série. *(effort S)*

## Ensuite — Priorité moyenne

- [x] **Mode « mise à jour »** : relancer sur des plans existants, cocher ce qui est fait (avec preuve), dater, signaler ce qui a régressé. *(effort M)*
- [x] **Options de périmètre** : `ai-only`, `technical-only`, `--url`, `--no-live`. *(effort S)*
- [x] **Comparer le HTML brut au HTML rendu** dans un vrai navigateur (Chrome est disponible). `curl` montre ce que voit un robot IA, pas ce que voit Googlebot après JavaScript. *(effort M)*
- [x] **Lire les logs serveur** (`access.log`, accessible sous WAMP) : compter les visites de chaque robot IA. *(effort M)*
- [x] **Modules optionnels selon le type de site** *(effort M)* :
  - [x] SEO local : `LocalBusiness`, fiche Google Business Profile, cohérence nom-adresse-téléphone
  - [x] E-commerce : `Product`, Merchant Center, navigation à facettes
  - [x] Images et vidéo : texte alternatif, sitemap images, `VideoObject`
- [x] **Vérifier les sources automatiquement** : script qui teste les URLs de `sources.md`, lancé chaque mois par une GitHub Action. *(effort S)*

## Bonus — Priorité basse

- [x] **Brancher les API Search Console et Bing** si l'utilisateur fournit un accès : vraies requêtes et couverture d'indexation.
- [x] **Mesurer la visibilité IA via les API** (recherche web OpenAI, Anthropic ou Perplexity) avec la requête cible. Payant, résultat variable.
- [x] **Mode « concurrents »** : comparer le HTML servi et le JSON-LD de 2 ou 3 sites concurrents, en lecture seule.
- [x] **Règles de politesse quand le skill visite un site** : peu de requêtes, user-agent identifié, prévenir si le site n'appartient pas à l'utilisateur. Indispensable si on fait le mode « concurrents ».
