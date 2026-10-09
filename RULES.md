# Tribes of the Lost Island — Living Rules

**Document version:** 2.1  
**Baseline date:** October 8, 2026 (America/Chicago)  
**Implemented ruleset ID:** `tribes-rules-2`  
**Scope:** The current playable browser game, including its computer opponents.

**Latest update:** October 9, 2026: Hard bots now have leader-specific priorities informed by Brett's six playtests, value profitable raids, and prioritize reachable claim interceptions. Bot policy: `leader-playstyles-2026-10-09`. The underlying rules remain edition 2, using `Kn Tree - Current (5).png` and Brett's explicit dice clarification: base D6 + D4; Archery and Shields give 2D6.

This is our working reference for auditing and changing the video game. It describes the implementation as it exists, including assumptions and known differences from the supplied board-game materials. Documenting a behavior does not mean you have approved it as a final design decision.

Editing this document alone does not change gameplay. For an accepted rules change, we will update this document, the game, the relevant checks, and the change log together. Use the stable rule IDs below when requesting a change.

## 1. Status and sources

| Label | Meaning |
| --- | --- |
| Confirmed | Explicitly specified by Brett in this conversation. |
| Source | Taken from the supplied rules, leader cards or current knowledge tree. |
| Adaptation | A behavior introduced to make the digital version work. |
| Provisional | An interpretation or balance value that still needs your decision. |
| Review item | A mismatch or edge case discovered in the implementation. |

**Confirmed direction:** Expand the board game into a single-player video game against computer tribes. There are 30 environment tiles, of which 24 are randomly used per game. King Slayer is omitted for now.

Source materials: `Copy of Tribes Official Rules 2.0.pdf`, `Tribes board 12_24_25.png`, and the supplied `Exportable Assests for chat` archive. `Kn Tree - Current (5).png` is the current technology reference. Brett’s subsequent explicit clarifications take precedence over image text, including the dice upgrades. The earlier Armor proposal is withdrawn and is not a technology in the game.

## 2. Quick reference

| Rule ID | Setting | Current value |
| --- | --- | --- |
| TURN-02 | Normal action allowance | 2 AP per own turn |
| ECON-01 | Base recurring income | +1 population and +1 knowledge per own turn |
| MOVE-01 | Move along one available trail | 1 AP |
| BUILD-01 | Build on beach / mangrove / caldera | 1 AP + 4 / 8 / 12 population |
| COMBAT-01 | Initiate an attack on any biome | 1 AP; 0 population entry fee |
| COMBAT-07 | Optional combat commitment, either side | 2 population per +1; public and adjustable before confirmation |
| REST-01 | Rest, once per own turn | 1 AP for +1 population and +1 knowledge; turn continues |
| REST-02 | Rest while owning Nomad | Same 1 AP cost and once-per-turn limit |
| CITY-01 | Upgrade your settlement to a city | City technology + 1 AP + 10 population |
| CITY-02 | Maximum cities per tribe | 2 at a time |
| SPIRIT-01 | Buy a random spirit card | 5 population; 0 AP |
| SPIRIT-02 | Normal spirit-play allowance | 1 card per own turn; Spiritual raises it to 2 |
| RESEARCH-01 | Buy a technology | Listed knowledge cost; 0 AP |
| WIN-01 | Settler victory | Hold at least 6 settlements continuously until your next turn |
| WIN-02 | City victory | Hold at least one particular city continuously until your next turn |
| WIN-03 | King Slayer | Disabled |
| WIN-04 | Kingmaker | Capture cities at two distinct locations during their holding period; immediate |
| WIN-05 | Science | Reach 40 unspent knowledge; immediate |

AP means action points. Population and knowledge are separate balances; neither can pay for the other.

## 3. Players, setup and randomization

**SET-01 — Player count. Adaptation.** One human and 1–3 computer tribes: 2–4 tribes total. Default setup is two computer opponents on Standard difficulty. There is no local human multiplayer or online multiplayer.

**SET-02 — Leader selection. Adaptation.** The human chooses any of the six leaders. Computer leaders are randomly chosen from the remaining leaders, without duplicates. Computer tribes use the same leader benefits as a human using that leader.

**SET-03 — Tile selection. Confirmed total and randomized placement; provisional pool composition.** Shuffle one pool of 30 biome tiles, choose 24 without replacement and assign them across all 24 board spaces. Six tiles are unused. There is no requirement to select exactly eight of each biome. Calderas can occupy printed beach locations and vice versa. Building costs, tile yields and biome defense follow the assigned tile, not its board ring.

| Biome | Tiles in the provisional pool | Population tiles | Knowledge tiles |
| --- | --- | --- | --- |
| Beach | 10 | Five yielding +1 population | Five yielding +1 knowledge |
| Mangrove | 10 | Five yielding +2 population | Five yielding +2 knowledge |
| Caldera | 10 | Five yielding +4 population | Five yielding +3 knowledge |

Biome identity is public, marked B / M / C on the board. A tile’s single resource yield is fixed at setup and revealed when first built. Unbuilt tiles have no income. Spaces are labeled 1–24 for identity; movement links remain fixed. The central lake is artwork, not an extra space.

**SET-04 — Starting resources. Confirmed.** Give each tribe its leader's population, knowledge, starting technology and cards, as listed in section 4. No settlements or cities exist at setup. The normal first-turn income is added when that tribe's first turn begins.

**SET-05 — Spirit deck. Provisional.** Shuffle 36 cards: six copies of each of the six types in section 11. Deal Daikotei's two starting cards from this deck.

**SET-06 — Arrival and turn order. Source with digital tie/order choices.** Each tribe rolls one D6. Sort all tribes from highest roll to lowest; ties favor the lower player ID, with the human at ID 0. Each tribe chooses a starting space in that order. There is no reroll. Turns continue in this same fixed order throughout the game. This differs from the PDF's wording of highest roller first, then clockwise seating.

**SET-07 — Starting position. Source.** A leader may start on any of the 24 spaces, including an interior space or one already occupied by another leader. Placement costs nothing and does not build a settlement. Computer tribes currently choose beaches; see section 14.

**SET-08 — Random outcomes. Adaptation.** Setup, card shuffles and dice use a seeded pseudorandom sequence. Dice results range from 1 through the die's number of sides. New games receive a fresh time-derived seed. The audit records the initial seed for new games and RNG state around actions. Computer decision randomness also consumes the sequence; the initial seed alone is not a complete replay script.

## 4. All six leaders

Population and knowledge use Brett’s updated starting values; other leader benefits come from the supplied leader cards. The personality column describes the current computer strategy. The interface's descriptive leader titles are presentation text and grant no additional powers.

| Leader | Starting population | Starting knowledge | Starting technology | Other starting benefit | Computer personality |
| --- | --- | --- | --- | --- | --- |
| Ku Nuele | 10 | 5 | Hunter | +2 AP on the first own turn only | Conqueror |
| Asinya | 16 | 5 | None | Larger population balance is the whole starting benefit | Builder |
| Herysi | 10 | 5 | Gatherer | No additional benefit beyond Gatherer | Builder |
| Hecatl | 10 | 5 | Nomad | No additional benefit beyond Nomad | Explorer |
| Tao Zhe | 10 | 5 | Spiritual | No additional benefit beyond Spiritual | Scholar |
| Daikotei | 10 | 5 | None | Two random spirit cards at setup | Conqueror |

Starting technologies are free; they do not deduct their normal research costs. Thus Ku Nuele normally starts the first playable turn with 11 population, 6 knowledge, Hunter, and 4 AP.

## 5. Turn sequence and action points

**TURN-01 — Start of turn.** In order: check whether this tribe has completed a held victory condition; if so, end the game immediately. Otherwise, reset its AP allowance, rest allowance, attack count, normal spirit-play count and temporary War Cry bonus, then collect its current income.

**TURN-02 — AP calculation.** The allowance is 2, plus 1 if the tribe owns Stamina, plus 2 if it is Ku Nuele's first own turn. Buying or stealing Stamina grants one AP immediately. Swift Jaguar grants two additional AP immediately. Unspent AP does not carry into the next own turn: the allowance is reset, not added to the old balance.

**TURN-03 — Action order.** After receiving income, the active tribe may move, build, attack, upgrade, rest, research, draw cards, play permitted cards, and use unlocked once-only abilities in any affordable order. It may repeat ordinary actions except rest, which is limited to once per own turn. A battle must finish before another action is taken.

**TURN-04 — Zero AP does not end the turn.** Research, card purchases, eligible spirit plays, Wayfinder and Tribute cost no AP. They remain available at zero AP and can grant resources or new AP. The human explicitly presses End turn. A player may also end early and leave AP unused.

**TURN-05 — Turns and rounds.** A turn belongs to one tribe. A round is one pass through the fixed turn order. The audit has a global turn number; round 1 begins with the first playable turn, while placement uses turn 0. There is no gameplay round limit, time limit or automatic draw rule.

## 6. Economy and income

**ECON-01 — Recurring income.** At the start of each own turn, collect:

- Population = 1 base + population yields of all owned settlements + 2 if Fertility is owned.
- Knowledge = 1 base + knowledge yields of all owned settlements + 2 if Wisdom is owned.

Cities remain settlements for income calculations. A city does not multiply a tile's yield. Income comes from every owned settlement, regardless of the leader's position.

**ECON-02 — Timing.** Building, capturing or losing a settlement changes the income rate immediately, but the new recurring payout is collected at the next own turn. Harvest the Land adds a separate immediate payment when building a new settlement. It does not remove that settlement's later recurring income.

**ECON-03 — Resource limits.** Population and knowledge carry over between turns with no cap, upkeep, decay, bank shortage or trade conversion. Costs must be affordable before acting. Spending population reduces a numeric balance; there is no separate army, worker pool or unit-health system.

**ECON-04 — Immediate gains.** Rest, New Followers, Wise Owl, Harvest the Land, Tribute, Spoils of War and successful defense with Rallying Cry can add resources immediately. Immediate gains do not increase recurring income unless the action also grants ownership or an income technology.

## 7. Movement and the implemented map

**MOVE-01 — Ordinary movement.** Pay 1 AP to move your leader along one connected trail. Every traversed edge costs another AP. There are no terrain surcharges, terrain-specific movement limits, hostile blocking, zones of control or entry tolls.

**MOVE-02 — Shared spaces.** Any number of leaders may occupy the same space. Entering a rival settlement does not automatically start combat. Moving away does not surrender your settlement or remove its income. Battles do not kill, displace or eliminate leaders.

**MOVE-03 — Coastal routes. Provisional.** Owning Nomad enables the extra route between each neighboring pair of outer-ring spaces, regardless of assigned biome. Each such move costs 1 AP. These represent the dashed coastal paths. The numbers printed on boats are currently ignored; they do not restrict player counts or travel.

**MOVE-04 — Teleports.** Wayfinder and Soaring Eagle can reach any of the 24 spaces for no AP. Neither requires Nomad, an empty destination, or a friendly destination. Choosing the current space is allowed and still consumes the ability/card. Fighting Tiger teleports only to a rival settlement and immediately attacks it.

**MAP-01 — Exact route graph. Provisional tracing of the artwork.** Physical spaces 1–8 are the outer ring clockwise from the upper left; 9–16 are the middle ring clockwise from the top; 17–24 are the inner ring clockwise from the upper left. Assigned biomes do not change these links. All links work both ways.

| Outer space | Connected middle spaces | Middle space | Connected inner spaces |
| --- | --- | --- | --- |
| 1 | 9, 16 | 9 | 17, 18 |
| 2 | 10, 9 | 10 | 18, 19 |
| 3 | 11, 10 | 11 | 19, 20 |
| 4 | 12, 11 | 12 | 20, 21 |
| 5 | 13, 12 | 13 | 21, 22 |
| 6 | 14, 13 | 14 | 22, 23 |
| 7 | 15, 14 | 15 | 23, 24 |
| 8 | 16, 15 | 16 | 24, 17 |

Inner spaces also form a ring: 17–18–19–20–21–22–23–24–17. With Nomad, outer spaces form another ring: 1–2–3–4–5–6–7–8–1. There are no direct middle-to-middle links: 40 ordinary links and 8 Nomad links total.

## 8. Building, resting and cities

**BUILD-01 — Found a settlement. Source.** Your leader must stand on a tile with no settlement. Pay 1 AP and the environment's population cost, reveal the fixed tile yield, and gain ownership. There is at most one settlement per tile. No distance from other settlements, network connection, leader exclusivity or empty-neighbor requirement applies.

| Environment | Normal build cost | Build cost with Tent Culture | Attack cost, unchanged by Tent Culture |
| --- | --- | --- | --- |
| Beach | 4 population | 1 population | 0 population |
| Mangrove | 8 population | 5 population | 0 population |
| Caldera | 12 population | 9 population | 0 population |

Every entry also requires 1 AP. Tent Culture subtracts a flat 3 population from building; it does not halve costs and does not reduce attack or city costs. There is no per-tribe settlement-piece cap beyond the 24 spaces. Settlement ownership is changed by conquest; there is no sell, abandon or demolish action.

**REST-01 — Rest. Confirmed limit.** Pay 1 AP for +1 population and +1 knowledge, once per own turn. Rest does not end the turn. A second rest is illegal even after gaining extra AP. The allowance resets at the start of the next own turn.

**REST-02 — Nomad. Confirmed common allowance.** Nomad follows exactly the same rest rule; it does not consume all remaining AP.

**CITY-01 — Upgrade. Confirmed costs.** Research City once for 10 knowledge. Then own City technology, stand on your own ordinary settlement, have fewer than two cities, and spend 1 AP plus 10 population. The settlement becomes a city; it still counts as one settlement. This cost is identical in all environments and unaffected by Tent Culture.

**CITY-02 — City effects. Source.** A city adds +1 defense, grants a possible City victory, and retains the tile's original income. The owner may have at most two cities at once. There is no further upgrade or additional upkeep.

**CITY-03 — Capture. Source.** A successful attack destroys the city upgrade and transfers the underlying ordinary settlement to the attacker. The attacker receives no intact city, upgrade refund or city-construction bonus. Losing City technology alone does not destroy an existing city or cancel its victory eligibility.

## 9. Combat

**COMBAT-01 — Initiate an attack. Confirmed.** Stand on a rival settlement and spend 1 AP. The population entry fee is zero on every biome. The defending leader need not be present. Repeated attempts are allowed while AP remains. Fighting Tiger is the separate spirit-card exception that also waives AP. Initiation AP is never refunded for a loss or Guardian Turtle.

**COMBAT-02 — Dice. Confirmed clarification overriding image text.** Both sides normally roll one D6 and one D4. Archery gives the attacker two D6s; Shields gives the defender two D6s. The upgrades affect only their specified side. Resolve one battle at a time.

**COMBAT-03 — Additive modifiers.** Add every applicable modifier to the dice sum:

| Attack modifier | Amount | Defense modifier | Amount |
| --- | --- | --- | --- |
| Hunter | +1 | Gatherer | +1 |
| Ferocity | +2 | War Tribe | +2 |
| War Tribe | +2 | Defending leader present | +1 |
| War Cry in purchase turn | +3 | City | +1 |
| Each 2 population committed | +1 | Each 2 population committed | +1 |
| Earlier attacks | No penalty | Beach / mangrove / caldera | +1 / +2 / +3 |

Bonuses stack. For example, Hunter + Ferocity + War Tribe gives +5 attack. City defense adds to the underlying biome defense; it does not replace it.

**COMBAT-04 — Outcome.** The attacker wins only if its total is strictly greater; ties favor the defender.

- Attacker wins: transfer the settlement and recurring yield, destroy any city upgrade, grant Spoils of War (+1 population and +1 knowledge) and Spirit Favor (one card if available) when owned. Harvest the Land does not reward capture. A qualifying city capture also earns Kingmaker credit.
- Defender wins: keep ownership. No base population reward. Rallying Cry, if owned, grants exactly 3 population, including a Turtle victory.
- Both sides spend their finalized population commitments regardless of result. There are no further casualties, leader-health losses or retreats. Leaders stay where they are.

**COMBAT-05 — No exhaustion. Confirmed.** Earlier attacks do not reduce later rolls. Attack counts are still tracked for computer strategy and auditing; they impose no combat modifier.

**COMBAT-06 — Guardian Turtle.** The defender may choose Turtle when confirming its commitment, before dice. Both sides must confirm. Discard the card and award automatic defensive victory without rolling. The attack AP and both population commitments remain spent. Turtle does not use the defender’s own-turn spirit allowance. Only Rallying Cry grants a defensive resource reward.

**COMBAT-07 — Public population commitments. Confirmed cost and visibility; digital confirmation procedure.** Either side may propose any affordable nonnegative even amount of population: each 2 adds +1 to that side’s roll. Proposals are public, may increase or decrease, and are not yet charged. Any changed amount clears both confirmations, including a previous Turtle declaration. Both players confirm the current amounts; the game then charges both amounts and resolves combat. No roll occurs with only one confirmation. Computer counteroffers are displayed before the human confirms them. This procedure is a digital implementation choice, recorded in audit assumptions.

**COMBAT-08 — Biome defense. Confirmed.** The assigned biome adds +1 for beach, +2 for mangrove or +3 for caldera, wherever it appears on the board. This applies to settlements and cities.

## 10. Research and the entire knowledge tree

**RESEARCH-01 — Purchase. Source.** During your own turn, pay the listed knowledge cost and 0 AP. You must not already own that technology. A root technology needs no prerequisite. For a technology with several listed parents, owning any one is sufficient; you do not need all of them. Multiple tribes may independently own the same technology.

**RESEARCH-02 — Timing and retention.** Abilities apply immediately unless they explicitly describe recurring income. Buying Wisdom or Fertility increases the rate but does not grant an immediate payout. Losing a prerequisite later does not remove already-owned descendant technologies. A stolen technology can be purchased again if its current prerequisites and cost are met.

**RESEARCH-03 — One-time effects.** A one-time purchase effect happens once for that purchase. Wayfinder and Tribute provide an unused ability that can be saved for a later own turn. There is no ordinary repurchase while you still own the technology. If it is stolen and you buy it again, the engine applies its purchase effect again. Stealing one-time technologies behaves differently; see SPIRIT-07.

| ID | Technology | Knowledge cost | Any one prerequisite | Exact effect |
| --- | --- | --- | --- | --- |
| TECH-01 | Nomad | 5 | None | Open the coastal routes; rest follows the common once-per-turn rule. |
| TECH-02 | Stamina | 2 | Nomad | +1 AP allowance each own turn and +1 AP immediately when acquired. |
| TECH-03 | Wayfinder | 1 | Nomad | Store one free teleport to any tile; use it on any own turn. |
| TECH-04 | Tent Culture | 5 | Stamina or Wayfinder | New settlements cost 3 less population. |
| TECH-05 | Rallying Cry | 2 | Tent Culture | Successful defense pays 3 population; defense without this technology pays none. |
| TECH-06 | Tribute | 2 | Tent Culture or Wisdom | Store one collection of the yields from up to two distinct owned settlements; no AP cost. See the interface restriction below. |
| TECH-07 | Spiritual | 5 | None | Normal spirit-play allowance becomes 2 cards per own turn. |
| TECH-08 | New Followers | 1 | Spiritual | Immediately gain 5 population. |
| TECH-09 | Spirit Favor | 3 | Spiritual | Draw one spirit card after each successful attack, if available. |
| TECH-10 | Wisdom | 5 | New Followers or Spirit Favor | +2 recurring knowledge per own turn. |
| TECH-11 | Shields | 7 | Wisdom or Fertility | Defend with two D6s (Brett’s explicit override of the image). |
| TECH-12 | Gatherer | 5 | None | +1 defense. |
| TECH-13 | Harvest the Land | 2 | Gatherer | Immediately collect the yield of a newly built settlement, in addition to future recurring income. |
| TECH-14 | Spirit Offering | 1 | Gatherer | Immediately draw one spirit card, if available. |
| TECH-15 | Fertility | 5 | Harvest the Land or Spirit Offering | +2 recurring population per own turn. |
| TECH-16 | War Tribe | 8 | Fertility or Ferocity | +2 attack and +2 defense. |
| TECH-17 | Hunter | 5 | None | +1 attack. |
| TECH-18 | Spoils of War | 2 | Hunter | Each successful attack grants +1 population and +1 knowledge. |
| TECH-19 | War Cry | 2 | Hunter | +3 attack for the remainder of the turn in which it is purchased. The technology stays owned after the bonus expires. |
| TECH-20 | Ferocity | 5 | Spoils of War or War Cry | +2 attack. |
| TECH-21 | Archery | 7 | Ferocity | Attack with two D6s (Brett’s explicit override of the image). |
| TECH-22 | City | 10 | Tent Culture, Wisdom, Fertility or Ferocity | Permit a separate city-upgrade action costing 10 population and 1 AP. |

Costs and prerequisites follow `Kn Tree - Current (5).png`; Archery and Shields use the subsequent explicit 2D6 clarification. There is no Armor technology. TECH-23 is retired because that proposal was withdrawn. Several nodes in that image have effects but no distinct names; Wayfinder, Tribute, New Followers, Spirit Favor, Wisdom, Spirit Offering, War Cry and Ferocity are descriptive interface names.

**RESEARCH-04 — Tribute interface discrepancy. Review item.** The engine accepts one or two distinct owned settlements. The current screen automatically completes selection after two if you own at least two, or after one if you own only one. It does not currently let you finish with just one when you own several. It can collect from cities. It collects only selected tile yields, not base income or Wisdom/Fertility bonuses. Owning no settlements prevents using the stored ability.

**RESEARCH-05 — Empty deck rewards. Review item.** If the spirit deck is empty, discards are reshuffled. If every card is in a player's hand and no discards exist, an automatic draw from Spirit Offering or Spirit Favor gives no card. Spirit Offering is still purchased and paid for in this edge case; there is no waiting entitlement or refund.

## 11. Spirit cards and technology theft

**SPIRIT-01 — Buy and hold. Source.** Spend 5 population and 0 AP to draw a random card during your own turn. Buy as many as you can afford. There is no hand-size cap. A newly drawn card can be played immediately if the relevant allowance and targeting rules permit it.

**SPIRIT-02 — Play allowance. Source.** Normally play at most one non-Turtle card per own turn. Owning Spiritual raises the limit to two. The limit is checked against currently owned technologies each time you play. Both copies of the same card may be played if you have them and have allowance. Cards cost 0 AP and no additional population to play.

**SPIRIT-03 — Deck recycling. Provisional.** Cards are discarded when played. When a draw is needed and the deck is empty, shuffle the entire discard pile into a new deck. If both piles are empty, a card purchase is unavailable. There is no permanent removal from the deck.

| Card | Copies | Effect | Timing and targets |
| --- | --- | --- | --- |
| Cunning Fox | 6 | Steal one eligible technology from another tribe | Own turn; you must meet its prerequisite and not already own it |
| Swift Jaguar | 6 | Gain 2 AP immediately | Own turn, including when at zero AP |
| Guardian Turtle | 6 | Automatically win one defensive battle | Before dice; outside normal spirit-play allowance |
| Soaring Eagle | 6 | Teleport your leader to any tile | Own turn; no extra cost |
| Wise Owl | 6 | Gain 4 knowledge immediately | Own turn |
| Fighting Tiger | 6 | Teleport to a rival settlement and immediately attack | Own turn; waives attack AP; optional population commitments still apply |

**SPIRIT-04 — Fighting Tiger interactions.** The target may be a city or a settlement your leader already occupies. The attack uses your normal dice, bonuses and public population commitments, with no exhaustion; it counts as an initiated attack. It can be stopped by Guardian Turtle. Victory, capture and technology rewards work normally. You cannot target your own settlement or an unbuilt tile.

**SPIRIT-05 — Invalid plays.** A card lacking a legal target cannot be played and is not spent. Cunning Fox cannot take a technology you already own or one whose prerequisites you do not meet. A root technology can be stolen without a prerequisite. There is no need to stand near the rival.

**SPIRIT-06 — Information.** Each human sees their own card hand; computer hands are not displayed. Public resources, settlement ownership and revealed yields are visible. Audit exports deliberately include every hand, deck and hidden yield for verification; opening an audit during a match can reveal information the normal game screen hides.

**SPIRIT-07 — Exact theft behavior. Provisional edge-case policy.** Remove the technology from the victim and give it to the thief. Its ongoing bonuses stop for the victim and become available to the thief. The victim keeps already-owned descendants and already-built cities. In addition:

- Stamina: subtract 1 from the victim's stored AP, with a floor of zero, and give the thief +1 AP immediately. Future allowances use current ownership.
- Wayfinder: erase the victim's unused teleport; give the thief the technology but no teleport charge.
- Tribute: erase the victim's unused collection; give the thief the technology but no collection charge.
- War Cry: clear the victim's temporary bonus; give the thief no immediate +3 bonus.
- New Followers and Spirit Offering: do not replay their population/card reward for the thief; prior rewards are not taken back from the victim.
- Wisdom and Fertility: change future income rates; do not refund or claw back previously collected resources.
- City: transfers permission to upgrade. Existing cities remain owned by the victim and may still produce a City victory.
- Research eligibility depends on the technologies currently owned, but losing a prerequisite does not cascade through descendants.

## 12. Victory and game end

**WIN-01 — Settler. Source.** Own at least six settlements at once and continuously retain at least six until the beginning of your next own turn. Cities count toward the six. You may own more than six and lose some while remaining above the threshold. Dropping below six cancels the claim immediately. Regaining six creates a new claim; the earlier holding period does not count.

**WIN-02 — City. Source.** Upgrade at least one settlement to a city and keep that particular city's ownership and upgrade intact until the beginning of your next own turn. The game tracks each city separately. Losing one does not cancel the claim on another continuously held city. Capturing an enemy city grants only a regular settlement, so that capture does not itself qualify for City victory.

**WIN-03 — King Slayer. Confirmed.** Disabled, including the version printed on the supplied cheat sheet.

**WIN-04 — Kingmaker. Confirmed.** Immediately win after personally capturing cities at two different board locations during their owners’ holding periods (before their next own turns). Track location IDs permanently for this match. Recapturing a rebuilt city at the same location does not give a second credit. Destroying two cities belonging to the same opponent is valid if they occupy different locations. Ordinary settlements do not count. The captured city becomes an ordinary settlement as usual.

**WIN-05 — Science. Confirmed.** Immediately win upon holding at least 40 unspent knowledge. The threshold is checked after every successful action and turn-start income. It is not cumulative lifetime knowledge and requires no cards or purchase. Knowledge earned from income, Rest, Tribute, Wise Owl or Spoils of War counts.

**WIN-06 — Resolution order. Digital tie handling.** Settler and City are checked before income at the beginning of the eligible tribe’s next turn; if both apply, the label is Settler. Immediate Science and Kingmaker are checked after successful actions or income. If the same action qualifies that player for both immediate conditions, the label is Kingmaker. No further actions or income occur after victory. No shared victory, elimination victory, score tiebreak or draw is implemented.

## 13. Worked checks for playtesting

**EXAMPLE-01 — Ordinary build.** Start with 12 population and 2 AP on an empty beach. Build: population becomes 8 and AP becomes 1. If the tile reveals +1 knowledge, the knowledge income rate rises by 1, but no knowledge is paid immediately without Harvest the Land.

**EXAMPLE-02 — Discount plus harvest.** Start with 10 population and 2 AP, owning Tent Culture and Harvest the Land. Build on a mangrove that reveals +2 population. Pay 5 population and 1 AP, then receive 2 population immediately. End at 7 population and 1 AP; the recurring population income rate also rises by 2. The audit shows both the gross 5 cost and the 2 immediate reward.

**EXAMPLE-03 — Combat tie with commitments.** Attacker dice sum to 5, Hunter adds 1, and 4 committed population adds 2: total 8. Defender dice sum to 5, a beach adds 1, and 4 committed population adds 2: total 8. With no other bonuses, the defender wins the tie. Both sides lose 4 population; the attacker also spent 1 AP. The defender gains nothing unless it owns Rallying Cry, which awards 3 population.

**EXAMPLE-04 — A city does not win immediately.** You upgrade a settlement and end your turn. Every other tribe has a turn to intervene. If your city remains intact, you win when your next turn begins. You receive no additional start-of-turn income after that winning check.

**EXAMPLE-05 — Nomad rest.** With Nomad and 3 AP, rest gives +1 population and +1 knowledge, leaving 2 AP. You can use those AP but cannot rest again this turn, even after Swift Jaguar.

**EXAMPLE-06 — Immediate Science.** At 36 knowledge, play Wise Owl for +4. The balance becomes 40 and the match ends immediately with Science victory; there is no opportunity to spend the knowledge first.

**EXAMPLE-07 — Kingmaker locations.** Capture a pending city at space 3: one credit. Capture a rebuilt city at space 3: still one. Capture another pending city at space 19: two credits and immediate Kingmaker victory.

## 14. Computer opponent policies

These are digital strategy settings, not restrictions on human play. All personalities use the same costs, dice and legal-action engine. There are no hidden resource grants. Decision code uses public information and its own cards; it does not inspect hidden tile yields or the human's hand.

**AI-01 — Setup.** Choose a beach as far as possible, by squared straight-line distance, from the nearest already-placed leader. If nobody has arrived, rank beaches randomly. This is a placement heuristic, not a path-distance calculation.

**AI-02 — Personalities and research order.** Consider the first technology in the relevant list that is not currently owned. Purchase it only if affordable, eligible and current knowledge is below 30; at 30 or more, stop research to save toward Science. A technology stolen from that sequence becomes a priority again. The current lists are fixed:

| Personality | Leaders | Research priorities, in order |
| --- | --- | --- |
| Conqueror | Ku Nuele, Daikotei | Hunter → Spoils of War → Ferocity → City → Archery → War Tribe |
| Builder | Asinya, Herysi | Gatherer → Harvest the Land → Fertility → City → War Tribe |
| Explorer | Hecatl | Nomad → Stamina → Tent Culture → City → Rallying Cry |
| Scholar | Tao Zhe | Spiritual → New Followers → Wisdom → City → Shields |

**AI-03 — Difficulty.** Standard attempts eligible priority research whenever this step is reached. Relaxed has a 55% chance to attempt it at each decision where it is eligible. This is checked per decision, not once per turn. Difficulty changes no resource costs, dice, starting resources or victory thresholds. Fast turns changes animation/decision delays only.

**AI-04 — Standard / Relaxed decision priority.** Re-evaluate after each action, in this order:

1. In combat, use the public commitment policy below; confirm Guardian Turtle when defending with one in hand.
2. If normal card allowance remains, use Fighting Tiger against the first rival city or settlement belonging to a rival with a pending Settler claim.
3. If allowed and held, play Wise Owl; then, on a later decision, Swift Jaguar if at zero AP; then Cunning Fox against the eligible rival technology with the highest listed knowledge cost.
4. Use an unused Tribute ability on up to two owned settlements with the highest numeric tile yield. The two resource types are compared by their raw yield number.
5. If standing on its own ordinary settlement with City and 10 population and AP, try upgrading.
6. Try the next priority research using the difficulty rule above.
7. At zero AP, buy a spirit card if population is greater than 14, the hand has fewer than 3 cards, and the draw deck itself has cards. Otherwise end the turn. The current AI does not buy from an empty draw deck even when reshuffling discards would be legal.
8. Attack a rival settlement at the current location if affordable and fewer than two attacks have been initiated this turn, or if that location is an imminent victory threat.
9. Build at the current location if it is empty and affordable.
10. Score travel destinations as described below. Use a stored Wayfinder teleport first, or Soaring Eagle second, if the best destination is at least two edges away. Otherwise move along the first step of a shortest available route if that next step has not been visited this turn.
11. If no selected move is taken, rest if unused this turn; otherwise end the turn.

**AI-05 — Destination scoring.** Let distance be the shortest number of available trails. Environment index is 0 for beach, 1 for mangrove, and 2 for caldera. A destination must be different from the current location.

| Destination | Starting score |
| --- | --- |
| Empty tile that the tribe can currently afford to build | 8 + 1.5 × environment index − 2 × distance |
| Enemy settlement that the tribe can currently afford to attack | 9 for Conqueror, otherwise 5; then subtract 2 × distance |
| Its own ordinary settlement when it has City and 10 population | 30 − 2 × distance |
| Other destinations | −100 |

For an affordable enemy target, add 24 if it is a city and 16 if its owner has a pending Settler claim. For any revealed tile not owned by the moving tribe, add 0.4 times its numeric yield. Subtract 4 for a destination already visited this turn. Choose the highest score; move only if it is positive. Equal scores use the current board-array order. Ordinary movement and Wayfinder mark visited locations; Eagle and Tiger currently do not update that visited list.

The AI uses these heuristics, not a full strategic search or an external AI service. It may make weak decisions. If an attempted AI action is rejected, the interface reports it and attempts to pass the turn rather than repeatedly retrying.

**AI-06 — Public combat spending.** Reserve 2 population for Conquerors or 4 for other personalities; the remaining even amount is the maximum bid. Increase the current bid enough to match the opponent’s current total modifiers when defending, or exceed them by 1 when attacking, up to that budget. The AI only raises, never automatically lowers, so counteroffers terminate within its finite population budget. When no raise is needed or affordable, confirm. A defending AI with Turtle confirms it instead of raising. This policy uses public commitments and modifiers, not hidden cards or future rolls. Human players may raise or lower their proposals.

**AI-07 — Hard difficulty (added October 8, 2026).** Hard changes computer decisions only. It has the same starting resources, income, AP, dice, costs and victory conditions as the player. It uses public positions, technology, resource balances, commitments and revealed yields plus its own hand. It cannot inspect rival hands, hidden tile yields or future random rolls. Select Hard when starting a new game; resuming a saved match keeps that match's difficulty. Audits export the selected difficulty.

Hard evaluates routes after every action. Starting positions consider affordability, nearby cheap spaces and leader preferences. Ku favors proximity for early raids; economic leaders put more value on affordable richer biomes. Unrevealed yields use biome averages, never their actual hidden values. Capture value includes income gained and denied, Spoils and Spirit Favor rewards, and progress toward six settlements. Bots consider combat improvements before an immediately reachable raid. At 30 or more knowledge, if two turns of current income can reach 40, they stop buying research to preserve a Science victory. They immediately use Owl at 36 knowledge or rest at 39 when legal.

**AI-08 — Leader playstyles (October 9, 2026).** The six supplied human audits inform preferences rather than fixed move sequences. Every leader adapts to the public position and can take a favorable attack or alternative victory.

| Leader | Playtest influence and bot priorities |
| --- | --- |
| Ku Nuele | Early raids; Spoils and Ferocity, followed by Spiritual/Favor and Archery. More willing to invest population in profitable attacks. |
| Asinya | Use starting population to establish an economy; Spiritual, New Followers and Wisdom; knowledge income, mobility, Shields and a City finish. |
| Herysi | Spirit Offering, Fertility and Harvest, then War Tribe; population income supports later conquest and defense. |
| Hecatl | Wayfinder, Tent Culture and Stamina for expansion; save the teleport for a rival claim or a potential victory of its own; develop combat afterward. |
| Tao Zhe | New Followers and Wisdom, valuable population income, then Hunter/Spoils/Favor and stronger combat; use both spirit plays and buy cards with surplus population. |
| Daikotei | Use starting spirits, acquire mobility and discounted building, then Hunter/Spoils/Ferocity for selective raids; support later attacks with defensive research and cards. |

Hard prioritizes interceptions that can actually produce an attack this turn, using Tiger, Wayfinder, Eagle or Jaguar when available. A reachable defended settlement can take priority over an unreachable weak one. When several players have pending victories, earlier winning turns take priority. Bots may research mobility when it makes an interception possible now. They steal technologies based on their cost and contribution to the leader's plan. City placement considers nearby rivals and remaining defensive population. When holding a city, a bot tries to station its leader there, rests, and may buy cards from surplus population for a Turtle defense. These are strategic estimates, not a guarantee that every rival claim can be stopped.

Hard combat enumerates all possible dice totals, including defense winning ties. For an ordinary battle it reserves half its population income, rounded down and limited to 4–10 population (2–10 for Ku); for a city, pending Settler claim, or attack by a tribe already holding at least five settlements, it can commit all its population. It chooses the affordable even bid maximizing estimated win probability times the value of the location, minus population spent. Bids only increase, so automatic counteroffers terminate. A defending bot with Turtle confirms it. The policy uses the current public offer, and does not predict or read the next dice roll.

Hard remains a heuristic opponent. `leader-bot-benchmark.mjs` compares the new policy with the preserved previous Hard policy: 72 duels with seats swapped and 36 paired three-player setups. The initial comparison produced 61/72 duel wins for the new policy; average ending round in the three-player games increased from 6.75 to 12.72. These are bot results, not a prediction of human difficulty. `hard-bot-benchmark.mjs` also supports comparison against Standard. New computer actions record their policy identifier in audit details so resumed games can distinguish later decisions from earlier ones.

## 15. Audit records and saves

**AUDIT-01 — What is recorded.** New matches record setup, placements, actions, research, spirit plays, combat and victories for every tribe. Turn-start income is its own event. Resource entries show before, change and after for population, knowledge, AP, income rates, card counts, settlements and cities. Exact records include technology/hand changes, tile ownership, dice/modifier sources and deck changes. Combat proposals, confirmations, finalized spending and Kingmaker city identities are recorded explicitly; immediate wins have a separate victory event.

**AUDIT-02 — Available files.** Export audit produces an HTML report for reading/filtering, CSV rows for spreadsheet analysis, or full JSON data. Exports reveal secret information for auditing. Filenames carry a unique game ID and event count. File timestamps are UTC; the local history screen displays Central Time.

**AUDIT-03 — History and coverage.** Detailed events are not trimmed to the small on-screen chronicle's 100-entry limit. Games are automatically archived locally as they progress, including unfinished matches that are replaced. Saves made before auditing existed are labeled partial: no missing earlier balances are invented. A new game is required for a complete setup-to-finish record.

**AUDIT-05 — Ruleset compatibility.** New games use `tribes-rules-2` and save version 2. Earlier saves are retained for audit export but cannot be resumed with this engine. Starting a new match archives the previous report and replaces the active save. The interface displays an earlier-match export option, and exports retain the original ruleset/catalog. Start a new match to test the revised rules.

**AUDIT-04 — Persistence.** The active save is in browser local storage; reports are in that browser's IndexedDB. They are not uploaded or synchronized to another browser/computer. Clearing browser data can remove local saves/history. Downloading a report makes an independent copy. There is no undo action, in-game resource editor, or audit import/replay interface.

## 16. Open decisions and discrepancies

These are recorded for review; none of the alternatives below has been applied.

| Review ID | Area | Current implementation / decision needed |
| --- | --- | --- |
| REVIEW-01 | Tile composition | Five population and five knowledge tiles per environment; confirm exact counts and yield values. |
| REVIEW-02 | Dice — resolved | Base D6 + D4; Archery/Shields 2D6, confirmed by Brett. |
| REVIEW-03 | Boats and hidden trails | Nomad opens all eight coastal links; clarify boat numbers and verify the full adjacency table. |
| REVIEW-04 | Spirit deck | Six copies of each of six types; confirm quantities and discard recycling. |
| REVIEW-05 | Nomad rest — resolved | All players use the same 1 AP, once-per-turn rest; it does not end the turn. |
| REVIEW-06 | Arrival order | All tribes sorted by D6 result, with player-ID tie resolution; decide whether to use the PDF's clockwise sequence and rerolls. |
| REVIEW-07 | Technology theft | Confirm retained descendants/cities, Stamina's immediate AP transfer, erased unused abilities, and repurchase effects. |
| REVIEW-08 | Tribute selection | Engine permits one or two, but interface requires two when available. Decide the desired behavior and align them. |
| REVIEW-09 | Empty card rewards | Automatic draws silently award nothing when all cards are held; decide whether to block, defer or compensate. |
| REVIEW-10 | War Cry | Current tree confirms +3 attack on the purchase turn. Technology stays owned; theft/repurchase behavior remains as documented. |
| REVIEW-11 | AI choices | Fixed research and travel heuristics, unconditional Turtle use, no discard-only purchase, and teleport visited-list differences are candidates for tuning. |
| REVIEW-12 | Limits and game end | No round cap, resource cap, player elimination or draw; decide whether any are wanted. |

## 17. How we will maintain this document

1. Reference a rule ID and describe the desired change: for example, “Change TURN-02 from 2 to 3 AP,” or “Change TECH-04 to a 2-population discount.”
2. Identify related effects: AI behavior, leader advantages, card combinations, income timing, victory pacing and interface wording.
3. Record the accepted change below with old value, new value, date and reason. Leave unaccepted ideas in section 16.
4. Update the implementation and targeted tests, then check that the document and the playable game agree.
5. Issue a new document version and a new audit ruleset ID for gameplay changes. Preserve the previous version in the rules history. Historical downloaded reports remain unchanged.
6. For balance changes, start a new playtest game. This release rejects old-rule saves for gameplay, retaining their audit export. Future revisions must similarly preserve ruleset identity or provide an explicit migration.

Useful change-request format: **Rule ID / proposed value or behavior / reason / what to watch in playtesting**. You can also describe changes in ordinary language; the IDs give us a precise place to record them.

### Change log

| Document version | Date | Ruleset ID | Change | Gameplay changed? |
| --- | --- | --- | --- | --- |
| 1.0 | October 8, 2026 | tribes-first-playable-audit-1 | Established this implementation baseline, complete rule catalog, review queue and revision process. | No |
| 1.1 | October 8, 2026 | tribes-first-playable-audit-1 | Recorded Brett's updated combat, setup, rest and victory rules in section 18, with implementation questions explicitly separated. | No — next gameplay revision recorded |
| 1.2 | October 8, 2026 | tribes-first-playable-audit-1 | Clarified that attacks retain their 1 AP cost but have no population entry fee; optional population boosts are public and adjustable before rolling. | No — combat clarification recorded |
| 1.3 | October 8, 2026 | tribes-first-playable-audit-1 | Confirmed separate City research and upgrade costs; replaced Science cards with 40 held knowledge; recorded immediate Science/Kingmaker victories and held City/Settlement victories. Kingmaker requires preventing two different cities; its precise prevention event awaits clarification. New knowledge tree will supply technology revisions. | No — victory clarification recorded |

| 2.0 | October 8, 2026 | tribes-rules-2 | Applied the latest tree, withdrawn Armor, explicit 2D6 upgrades, pooled biomes, new starts, public combat spending, no exhaustion, common rest, Science and Kingmaker. Updated interface, AI, audits and save compatibility. | Yes |
| 2.1 | October 9, 2026 | tribes-rules-2 | Added six Hard leader playstyles based on Brett's audits, more valuable raids, reachable claim interceptions, and policy labels on computer audit events. | AI decisions only; rules and costs unchanged |

### Implementation index

| Code location | Rules it implements |
| --- | --- |
| `engine.mjs`: LEADERS, TECHS, CARDS | Starting leader data and technology/card definitions |
| `engine.mjs`: createGame, EDGES, MAP | Setup, pools, turn order and route graph |
| `engine.mjs`: income, beginTurn, syncClaims | Economy, turn resets and held victories |
| `engine.mjs`: applyAction, grantTech | Costs, actions, research, immediate rewards and card interactions |
| `engine.mjs`: attack, combatBonuses, resolveBattle | Combat costs, dice, modifiers and capture |
| `engine.mjs`: aiAction, route | Computer priorities and shortest-route search |
| `app.mjs`: selectTile, schedule, perform | Target selection, computer scheduling and interface behavior |
| `audit.mjs`, `audit-store.mjs` | Audit records, exports and local report history |
| `tests.mjs` | Rules and audit verification checks |

The living source is `RULES.md`. The browser reading copy is generated from it; update the source and regenerate the reading copy when revising the rules.

## 18. Revision decisions implemented in edition 2

- The authoritative technology asset is `Kn Tree - Current (5).png`. Armor is withdrawn. All 22 costs and prerequisite links have been checked against it.
- Brett’s dice clarification overrides the image: base D6 + D4; Archery/Shields 2D6.
- Rallying Cry remains 2 knowledge and awards 3 population per defensive victory; normal defense awards none.
- Attacks cost 1 AP and no population entry fee. Optional population spending is public and adjustable. No attacker exhaustion.
- Starting population is 10, or 16 for Asinya; knowledge is 5. All 24 selected tiles are randomized across locations.
- Rest is once per own turn for every leader and does not end the turn. Stamina stays 2 knowledge.
- City research costs 10 knowledge; conversion costs 10 population and retains its existing 1 AP cost. City adds +1 defense on top of biome defense.
- Settlement and City must survive until the next own turn. Science is 40 unspent knowledge and immediate. Kingmaker is two different city locations captured during their holding periods and immediate.
- Public commitment confirmations, reserve-based computer bidding, and charging both finalized commitments even when Turtle resolves combat are documented digital procedures for playtesting.

Earlier document versions and the pre-update engine are preserved in `rules-history/`.
