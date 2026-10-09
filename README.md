# Tribes of the Lost Island

A local single-player strategy prototype using Brett's original board and card artwork. Choose any of six leaders and play against one to three computer tribes.

## Play

The complete editable rulebook is **RULES.md**. Read **rules-reference.html** in a browser for a formatted copy with contents navigation. Rule IDs, provisional assumptions, review items and a version log make it the reference for future changes. Regenerate the reading copy with `npm run docs` after editing the Markdown source.

Run `node server.mjs` in this directory, then open http://127.0.0.1:4178 in a browser. Node.js is the only runtime requirement; no package installation, API key, paid service, or internet connection is required.

Choose a leader and rival count. The tribes roll for arrival order; select a location and click **Land here** when it is your turn. Select locations to inspect them, then use the right-hand action buttons. Research and spirit cards remain available even after all actions are spent. Your match saves automatically in this browser.

The game can be restarted using `Start Tribes.cmd` on Windows. Leave the server console open while playing. The game uses local port 4178.

## Implemented

- All six supplied leaders and their starting conditions.
- Original 24-location island, with 24 of 30 biome tiles shuffled across all locations.
- Movement, building, resting, attacking, settlement income, public population commitments, biome defense, city upgrades, held Settlement/City victories and immediate Science/Kingmaker victories.
- The supplied Kn Tree - Current (5).png knowledge tree, with confirmed 2D6 Archery/Shields upgrades, including free actions, teleportation, immediate yields, defensive/offensive upgrades and one-time rewards.
- Six spirit card types, including targeted technology theft and Guardian Turtle's defensive response window.
- Three difficulty settings (Relaxed, Standard, Hard), fast turns, a chronicle, and local save/resume. Hard uses victory planning, public combat odds, resource reserves and claim interception without resource or dice bonuses.
- Responsive interface, reduced-motion support and animated leader movement.

## Provisional rules to confirm

The user confirmed random selection of 24 from 30 tiles and requested omission of King Slayer. The following other details remain assumptions and are disclosed in **How to play**:

- Each environment's ten tiles contain five population and five knowledge tiles. Beach yields 1; mangrove 2; caldera 4 population or 3 knowledge. Change the pool in `createGame` once exact quantities are supplied.
- Base combat is D6 + D4. Archery upgrades attack to 2D6; Shields upgrades defense to 2D6. These values are confirmed.
- Nomad permits travel along dashed coastal routes, at one action per neighboring beach. Boat numbers are not applied. Standard trails were traced from the supplied board and should be confirmed in playtesting.
- The 36-card spirit deck has six of each type and reshuffles its discards when empty.
- Theft removes passive benefits and unused once-only privileges, keeps already-unlocked descendants and existing cities, and never replays immediate rewards for the thief.
- Stamina gives its extra action immediately. Every player rests once per own turn for 1 AP; Nomad uses that same rule.
- The newest knowledge tree supersedes older illustrated values. Technologies with no supplied name have short descriptive names in the interface.
- Computer tribes use public state and expected environment values, never hidden tile yields or a human's unrevealed cards. Relaxed mode reduces research consistency without changing costs or dice.

## Game audits

Use **Export audit** in the game header, menu, or victory screen to download:

- **HTML:** a standalone readable report with player filtering, event search, resource balance tables, expandable exact records, and print/save-PDF support.
- **CSV:** one row per affected player per event, including before/change/after columns for population, knowledge, action points, income rates, cards, settlements and cities. Opens in Excel or other spreadsheet apps.
- **JSON:** the complete audit record, including initial seed and setup, the current rules catalog and assumptions, requested actions, all player and tile changes, deck changes, combat dice/modifiers/results, and the final state.

Turn-start income is recorded separately from the preceding player's end-turn action, with a source breakdown. Events are never truncated like the small on-screen chronicle. All human and computer actions are recorded. Reports include secret hands and tile yields so the game can be audited completely.

**Game audits** on the leader selection screen (or **Game history** in the menu) lists all recorded games, including unfinished or replaced matches. History is automatically stored in this browser's IndexedDB; downloading files provides an independent copy. Clearing browser data removes the local history. No reports are uploaded anywhere.

Earlier-rules saves remain available for audit export but cannot resume under rules edition 2. Older audits retain their original ruleset; saves made before recording began remain explicitly partial. Start a new match to record every action from setup onward. Export filenames include a unique game ID and the event count. File timestamps are UTC; the history screen shows Central Time.

## Verification details

Open `http://127.0.0.1:4178/?difficulty=hard` to preselect Hard for a new match. Existing saved matches retain their original difficulty. The in-game header shows the current bot difficulty, and exported audits record it. Hard's policy is documented in RULES.md under AI-07. Run `node hard-bot-benchmark.mjs` for the reproducible 120-duel comparison against Standard.

Hard was updated October 9 with six leader playstyles based on Brett's own games (RULES.md AI-08). Refresh the browser to load it, and begin a new Hard match for a clean comparison. New bot actions include `botPolicy: leader-playstyles-2026-10-09` in audit details. Run `node leader-bot-benchmark.mjs` for 72 duels against the previous Hard policy plus 36 paired three-player setups; the previous policy is preserved in `bot-history/hard-v1.mjs`. The initial benchmark gave the new policy 61/72 duel wins and moved Ku's average first attack from round 5.42 to 1.67 among games where Ku attacked.

Run `node hard-bot-audit.mjs --games=200` for a larger self-play audit: 200 setups at each of 2, 3 and 4 players, each replayed with all-current and all-previous Hard bots (1,200 matches). Timestamped results go into `bot-audits/`, including a Markdown report, per-game and per-player JSON summaries, and a compressed full action/resource audit for each current-bot game. The report separates lobby sizes, records attacks per player turn and claim interruptions, and compares leader wins with their expected share of wins given lobby size. These simulations do not touch browser saves or change game rules. `--seed-offset=2001` controls the reproducible seed series.

Run `node --test tests.mjs` (or `npm test`). The suite covers tile selection, map connectivity, illegal actions, income timing, combat ties, city capture, defensive spirit timing, public population commitments, rest limits, all four victories, the entire supplied technology table, dice upgrades, save compatibility, theft, hidden-information isolation, and 18 complete seeded simulations across all leaders.

## Files

- `engine.mjs`: game state, rules, setup and computer decisions.
- `app.mjs`: interface and local persistence.
- `styles.css`: presentation and responsive layout.
- `assets/`: runtime copies of supplied artwork and recovered spirit cards.
- `source-assets/`: the supplied ZIP's source artwork, preserved for reference.
- `DESIGN.md`: initial source review and adaptation brief.

This is rules edition 2 of the playable skirmish, ready for rule confirmation and balance feedback. Campaigns, island events, online multiplayer and native installers are not implemented.

For isolated browser UI checks, open `ui-test.html`. Its scenarios use a separate local-storage key and skip audit-history persistence. Normal matches and their reports are unaffected.
