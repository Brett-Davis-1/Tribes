# Tribes of the Lost Island — Living Rules

**Document version:** 1.3  
**Baseline date:** October 8, 2026 (America/Chicago)  
**Implemented ruleset ID:** `tribes-first-playable-audit-1`  
**Scope:** The current playable browser game, including its computer opponents.

**Latest update:** Brett's new rules are recorded in section 18 as the next gameplay revision. Sections 2–16 still describe the running v1.0 game. The new rules have not yet been applied to the engine; section 18 identifies the remaining details needed for implementation.

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

Source materials: `Copy of Tribes Official Rules 2.0.pdf`, `Tribes board 12_24_25.png`, and the supplied `Exportable Assests for chat` archive. The archive's `Copy of Kn Tree - Current.jpg` supplies the technology values used here, rather than the older tree pictured in the PDF. The current engine and interface were inspected for this baseline.

## 2. Quick reference

| Rule ID | Setting | Current value |
| --- | --- | --- |
| TURN-02 | Normal action allowance | 2 AP per own turn |
| ECON-01 | Base recurring income | +1 population and +1 knowledge per own turn |
| MOVE-01 | Move along one available trail | 1 AP |
| BUILD-01 | Build on beach / mangrove / caldera | 1 AP + 4 / 8 / 12 population |
| COMBAT-01 | Attack on beach / mangrove / caldera | 1 AP + 2 / 4 / 6 population |
| REST-01 | Rest | 1 AP for +1 population and +1 knowledge |
| REST-02 | Rest while owning Nomad | All remaining AP for the same +1 population and +1 knowledge |
| CITY-01 | Upgrade your settlement to a city | City technology + 1 AP + 10 population |
| CITY-02 | Maximum cities per tribe | 2 at a time |
| SPIRIT-01 | Buy a random spirit card | 5 population; 0 AP |
| SPIRIT-02 | Normal spirit-play allowance | 1 card per own turn; Spiritual raises it to 2 |
| RESEARCH-01 | Buy a technology | Listed knowledge cost; 0 AP |
| WIN-01 | Settler victory | Hold at least 6 settlements continuously until your next turn |
| WIN-02 | City victory | Hold at least one particular city continuously until your next turn |
| WIN-03 | King Slayer | Disabled |

AP means action points. Population and knowledge are separate balances; neither can pay for the other.

## 3. Players, setup and randomization

**SET-01 — Player count. Adaptation.** One human and 1–3 computer tribes: 2–4 tribes total. Default setup is two computer opponents on Standard difficulty. There is no local human multiplayer or online multiplayer.

**SET-02 — Leader selection. Adaptation.** The human chooses any of the six leaders. Computer leaders are randomly chosen from the remaining leaders, without duplicates. Computer tribes use the same leader benefits as a human using that leader.

**SET-03 — Tile selection. Confirmed total; provisional distribution.** The 24 spaces are eight beaches, eight mangroves and eight calderas. Each environment has a separate pool of ten tiles; eight are randomly selected and assigned to that environment's spaces. Two from each environment are left unused. The exact pool composition is provisional:

| Environment | Tiles in its pool | Population tiles | Knowledge tiles | Tiles used |
| --- | --- | --- | --- | --- |
| Beach | 10 | Five tiles yielding +1 population | Five tiles yielding +1 knowledge | 8 |
| Mangrove | 10 | Five tiles yielding +2 population | Five tiles yielding +2 knowledge | 8 |
| Caldera | 10 | Five tiles yielding +4 population | Five tiles yielding +3 knowledge | 8 |

Every tile yields one resource type. The face-down result is determined at setup, stays fixed, and is revealed when someone first builds there. Unbuilt tiles produce no income. The glowing central lake is artwork, not an additional playable space.

**SET-04 — Starting resources. Source.** Give each tribe its leader's population, knowledge, starting technology and cards, as listed in section 4. No settlements or cities exist at setup. The normal first-turn income is added when that tribe's first turn begins.

**SET-05 — Spirit deck. Provisional.** Shuffle 36 cards: six copies of each of the six types in section 11. Deal Daikotei's two starting cards from this deck.

**SET-06 — Arrival and turn order. Source with digital tie/order choices.** Each tribe rolls one D6. Sort all tribes from highest roll to lowest; ties favor the lower player ID, with the human at ID 0. Each tribe chooses a starting space in that order. There is no reroll. Turns continue in this same fixed order throughout the game. This differs from the PDF's wording of highest roller first, then clockwise seating.

**SET-07 — Starting position. Source.** A leader may start on any of the 24 spaces, including an interior space or one already occupied by another leader. Placement costs nothing and does not build a settlement. Computer tribes currently choose beaches; see section 14.

**SET-08 — Random outcomes. Adaptation.** Setup, card shuffles and dice use a seeded pseudorandom sequence. Dice results range from 1 through the die's number of sides. New games receive a fresh time-derived seed. The audit records the initial seed for new games and RNG state around actions. Computer decision randomness also consumes the sequence; the initial seed alone is not a complete replay script.

## 4. All six leaders

These starting values come from the supplied leader cards. The personality column describes the current computer strategy. The interface's descriptive leader titles are presentation text and grant no additional powers.

| Leader | Starting population | Starting knowledge | Starting technology | Other starting benefit | Computer personality |
| --- | --- | --- | --- | --- | --- |
| Ku Nuele | 12 | 5 | Hunter | +2 AP on the first own turn only | Conqueror |
| Asinya | 20 | 5 | None | Larger population balance is the whole starting benefit | Builder |
| Herysi | 12 | 5 | Gatherer | No additional benefit beyond Gatherer | Builder |
| Hecatl | 12 | 5 | Nomad | No additional benefit beyond Nomad | Explorer |
| Tao Zhe | 12 | 5 | Spiritual | No additional benefit beyond Spiritual | Scholar |
| Daikotei | 12 | 5 | None | Two random spirit cards at setup | Conqueror |

Starting technologies are free; they do not deduct their normal research costs. Thus Ku Nuele normally starts the first playable turn with 13 population, 6 knowledge, Hunter, and 4 AP.

## 5. Turn sequence and action points

**TURN-01 — Start of turn.** In order: check whether this tribe has completed a held victory condition; if so, end the game immediately. Otherwise, reset its AP allowance, attack exhaustion, normal spirit-play count and temporary War Cry bonus, then collect its current income.

**TURN-02 — AP calculation.** The allowance is 2, plus 1 if the tribe owns Stamina, plus 2 if it is Ku Nuele's first own turn. Buying or stealing Stamina grants one AP immediately. Swift Jaguar grants two additional AP immediately. Unspent AP does not carry into the next own turn: the allowance is reset, not added to the old balance.

**TURN-03 — Action order.** After receiving income, the active tribe may move, build, attack, upgrade, rest, research, draw cards, play permitted cards, and use unlocked once-only abilities in any affordable order. It may repeat ordinary actions. A battle must finish before another action is taken.

**TURN-04 — Zero AP does not end the turn.** Research, card purchases, eligible spirit plays, Wayfinder and Tribute cost no AP. They remain available at zero AP and can grant resources or new AP. The human explicitly presses End turn. A player may also end early and leave AP unused.

**TURN-05 — Turns and rounds.** A turn belongs to one tribe. A round is one pass through the fixed turn order. The audit has a global turn number; round 1 begins with the first playable turn, while placement uses turn 0. There is no gameplay round limit, time limit or automatic draw rule.

## 6. Economy and income

**ECON-01 — Recurring income.** At the start of each own turn, collect:

- Population = 1 base + population yields of all owned settlements + 2 if Fertility is owned.
- Knowledge = 1 base + knowledge yields of all owned settlements + 2 if Wisdom is owned.

Cities remain settlements for income calculations. A city does not multiply a tile's yield. Income comes from every owned settlement, regardless of the leader's position.

**ECON-02 — Timing.** Building, capturing or losing a settlement changes the income rate immediately, but the new recurring payout is collected at the next own turn. Harvest the Land adds a separate immediate payment when building a new settlement. It does not remove that settlement's later recurring income.

**ECON-03 — Resource limits.** Population and knowledge carry over between turns with no cap, upkeep, decay, bank shortage or trade conversion. Costs must be affordable before acting. Spending population reduces a numeric balance; there is no separate army, worker pool or unit-health system.

**ECON-04 — Immediate gains.** Rest, New Followers, Wise Owl, Harvest the Land, Tribute, Spoils of War and successful defense can add resources immediately. Immediate gains do not increase recurring income unless the action also grants ownership or an income technology.

## 7. Movement and the implemented map

**MOVE-01 — Ordinary movement.** Pay 1 AP to move your leader along one connected trail. Every traversed edge costs another AP. There are no terrain surcharges, terrain-specific movement limits, hostile blocking, zones of control or entry tolls.

**MOVE-02 — Shared spaces.** Any number of leaders may occupy the same space. Entering a rival settlement does not automatically start combat. Moving away does not surrender your settlement or remove its income. Battles do not kill, displace or eliminate leaders.

**MOVE-03 — Coastal routes. Provisional.** Owning Nomad enables the extra route between each neighboring pair of beach spaces. Each such move costs 1 AP. These represent the dashed coastal paths. The numbers printed on boats are currently ignored; they do not restrict player counts or travel.

**MOVE-04 — Teleports.** Wayfinder and Soaring Eagle can reach any of the 24 spaces for no AP. Neither requires Nomad, an empty destination, or a friendly destination. Choosing the current space is allowed and still consumes the ability/card. Fighting Tiger teleports only to a rival settlement and immediately attacks it.

**MAP-01 — Exact route graph. Provisional tracing of the artwork.** Spaces use the names shown by the game. Beach 1 is the upper-left beach; beach numbers proceed clockwise. Mangrove 1 is the top mangrove and proceeds clockwise. Caldera 1 is the upper-left caldera and proceeds clockwise. All listed links work in both directions:

| Space | Standard connections |
| --- | --- |
| Beach 1 | Mangrove 1, Mangrove 8 |
| Beach 2 | Mangrove 2, Mangrove 1 |
| Beach 3 | Mangrove 3, Mangrove 2 |
| Beach 4 | Mangrove 4, Mangrove 3 |
| Beach 5 | Mangrove 5, Mangrove 4 |
| Beach 6 | Mangrove 6, Mangrove 5 |
| Beach 7 | Mangrove 7, Mangrove 6 |
| Beach 8 | Mangrove 8, Mangrove 7 |
| Mangrove 1 | Caldera 1, Caldera 2, plus its beach links above |
| Mangrove 2 | Caldera 2, Caldera 3, plus its beach links above |
| Mangrove 3 | Caldera 3, Caldera 4, plus its beach links above |
| Mangrove 4 | Caldera 4, Caldera 5, plus its beach links above |
| Mangrove 5 | Caldera 5, Caldera 6, plus its beach links above |
| Mangrove 6 | Caldera 6, Caldera 7, plus its beach links above |
| Mangrove 7 | Caldera 7, Caldera 8, plus its beach links above |
| Mangrove 8 | Caldera 8, Caldera 1, plus its beach links above |

Calderas also form a ring: 1–2–3–4–5–6–7–8–1. With Nomad, beaches form a second ring: 1–2–3–4–5–6–7–8–1. There are no direct mangrove-to-mangrove links. There are 40 ordinary links and 8 Nomad links.

## 8. Building, resting and cities

**BUILD-01 — Found a settlement. Source.** Your leader must stand on a tile with no settlement. Pay 1 AP and the environment's population cost, reveal the fixed tile yield, and gain ownership. There is at most one settlement per tile. No distance from other settlements, network connection, leader exclusivity or empty-neighbor requirement applies.

| Environment | Normal build cost | Build cost with Tent Culture | Attack cost, unchanged by Tent Culture |
| --- | --- | --- | --- |
| Beach | 4 population | 1 population | 2 population |
| Mangrove | 8 population | 5 population | 4 population |
| Caldera | 12 population | 9 population | 6 population |

Every entry also requires 1 AP. Tent Culture subtracts a flat 3 population from building; it does not halve costs and does not reduce attack or city costs. There is no per-tribe settlement-piece cap beyond the 24 spaces. Settlement ownership is changed by conquest; there is no sell, abandon or demolish action.

**REST-01 — Rest without Nomad. Source.** Pay 1 AP for +1 population and +1 knowledge. Repeat as often as remaining AP permits.

**REST-02 — Rest with Nomad. Source prose; review the design.** Rest consumes all remaining AP but grants only +1 population and +1 knowledge, regardless of how many AP were spent. At least 1 AP is required. Rest does not force End turn; free abilities remain available, and gaining new AP can allow another action or rest.

**CITY-01 — Upgrade. Source.** Own City technology, stand on your own ordinary settlement, have fewer than two cities, and spend 1 AP plus 10 population. The settlement becomes a city; it still counts as one settlement. This cost is identical in all environments and unaffected by Tent Culture.

**CITY-02 — City effects. Source.** A city adds +1 defense, grants a possible City victory, and retains the tile's original income. The owner may have at most two cities at once. There is no further upgrade or additional upkeep.

**CITY-03 — Capture. Source.** A successful attack destroys the city upgrade and transfers the underlying ordinary settlement to the attacker. The attacker receives no intact city, upgrade refund or city-construction bonus. Losing City technology alone does not destroy an existing city or cancel its victory eligibility.

## 9. Combat

**COMBAT-01 — Initiate an attack. Source.** Your leader must occupy a settlement owned by a different tribe. Pay 1 AP and 2 / 4 / 6 population for beach / mangrove / caldera. The defending leader need not be present. A city uses the same attack cost as a normal settlement in its environment. The cost is paid before defense and is never refunded for a loss or Guardian Turtle.

**COMBAT-02 — Dice. Provisional interpretation.** Each side normally rolls two D4s. Archery changes the attacker's dice to one D6 and one D4. Shields changes the defender's dice to one D6 and one D4. Dice sides are independent of numeric bonuses. Resolve one battle at a time.

**COMBAT-03 — Additive modifiers.** Add all applicable modifiers to the dice sum:

| Attack modifier | Amount | Defense modifier | Amount |
| --- | --- | --- | --- |
| Hunter | +1 | Gatherer | +1 |
| Ferocity | +2 | War Tribe | +2 |
| War Tribe | +2 | Defending leader on this tile | +1 |
| War Cry active this turn | +3 | Defending a city | +1 |
| Each previous attack this turn | −1 | Defender's earlier offensive attacks | No penalty |

Bonuses stack. For example, Hunter + Ferocity + War Tribe gives +5 attack before temporary effects or exhaustion. Totals are not clamped to a minimum; heavy exhaustion can make an attack total negative.

**COMBAT-04 — Outcome. Source.** The attacker wins only if its total is strictly greater. A tie belongs to the defender.

- If the attacker wins, transfer the settlement and its recurring yield, and destroy any city upgrade. Spoils of War adds +1 population and +1 knowledge immediately. Spirit Favor draws one card if a card can be drawn. Harvest the Land does not pay on capture.
- If the defender wins, ownership stays the same and the defender gains +2 population, or +3 with Rallying Cry. Rallying Cry replaces the +2 payout; it does not add another +3.
- There are no additional casualties, knowledge losses, leader-health losses or compulsory retreats. Both leaders stay where they are.

**COMBAT-05 — Exhaustion. Source.** Your first initiated attack each own turn has no exhaustion penalty; the second has −1, the third −2, and so on. This counts attacks at different locations, failed attacks, Turtle-blocked attacks and Fighting Tiger attacks. It resets at your next own turn and never affects your defense. Repeated attacks are legal while you can pay their costs; computer attack limits are strategy choices, not human rules.

**COMBAT-06 — Guardian Turtle interruption. Source plus explicit outcome handling.** The defender may play Guardian Turtle before any dice are rolled to win automatically. The card is discarded; the attacker still paid the cost and incurred an attack for exhaustion. No dice are rolled. The defender still receives the normal +2 population, or +3 with Rallying Cry. Turtle does not use the defender's own-turn card allowance.

## 10. Research and the entire knowledge tree

**RESEARCH-01 — Purchase. Source.** During your own turn, pay the listed knowledge cost and 0 AP. You must not already own that technology. A root technology needs no prerequisite. For a technology with several listed parents, owning any one is sufficient; you do not need all of them. Multiple tribes may independently own the same technology.

**RESEARCH-02 — Timing and retention.** Abilities apply immediately unless they explicitly describe recurring income. Buying Wisdom or Fertility increases the rate but does not grant an immediate payout. Losing a prerequisite later does not remove already-owned descendant technologies. A stolen technology can be purchased again if its current prerequisites and cost are met.

**RESEARCH-03 — One-time effects.** A one-time purchase effect happens once for that purchase. Wayfinder and Tribute provide an unused ability that can be saved for a later own turn. There is no ordinary repurchase while you still own the technology. If it is stolen and you buy it again, the engine applies its purchase effect again. Stealing one-time technologies behaves differently; see SPIRIT-07.

| ID | Technology | Knowledge cost | Any one prerequisite | Exact effect |
| --- | --- | --- | --- | --- |
| TECH-01 | Nomad | 5 | None | Open the coastal routes; resting consumes all remaining AP. |
| TECH-02 | Stamina | 2 | Nomad | +1 AP allowance each own turn and +1 AP immediately when acquired. |
| TECH-03 | Wayfinder | 1 | Nomad | Store one free teleport to any tile; use it on any own turn. |
| TECH-04 | Tent Culture | 5 | Stamina or Wayfinder | New settlements cost 3 less population. |
| TECH-05 | Rallying Cry | 2 | Tent Culture | Successful defense pays 3 population instead of 2. |
| TECH-06 | Tribute | 2 | Tent Culture or Wisdom | Store one collection of the yields from up to two distinct owned settlements; no AP cost. See the interface restriction below. |
| TECH-07 | Spiritual | 5 | None | Normal spirit-play allowance becomes 2 cards per own turn. |
| TECH-08 | New Followers | 1 | Spiritual | Immediately gain 5 population. |
| TECH-09 | Spirit Favor | 3 | Spiritual | Draw one spirit card after each successful attack, if available. |
| TECH-10 | Wisdom | 5 | New Followers or Spirit Favor | +2 recurring knowledge per own turn. |
| TECH-11 | Shields | 7 | Wisdom or Fertility | Defend with a D6 and a D4. |
| TECH-12 | Gatherer | 5 | None | +1 defense. |
| TECH-13 | Harvest the Land | 2 | Gatherer | Immediately collect the yield of a newly built settlement, in addition to future recurring income. |
| TECH-14 | Spirit Offering | 1 | Gatherer | Immediately draw one spirit card, if available. |
| TECH-15 | Fertility | 5 | Harvest the Land or Spirit Offering | +2 recurring population per own turn. |
| TECH-16 | War Tribe | 8 | Fertility or Ferocity | +2 attack and +2 defense. |
| TECH-17 | Hunter | 5 | None | +1 attack. |
| TECH-18 | Spoils of War | 2 | Hunter | Each successful attack grants +1 population and +1 knowledge. |
| TECH-19 | War Cry | 2 | Hunter | +3 attack for the remainder of the turn in which it is purchased. The technology stays owned after the bonus expires. |
| TECH-20 | Ferocity | 5 | Spoils of War or War Cry | +2 attack. |
| TECH-21 | Archery | 7 | Ferocity | Attack with a D6 and a D4. |
| TECH-22 | City | 10 | Tent Culture, Wisdom, Fertility or Ferocity | Permit a separate city-upgrade action costing 10 population and 1 AP. |

Values above follow the current tree image. Several nodes in that image have effects but no distinct names; Wayfinder, Tribute, New Followers, Spirit Favor, Wisdom, Spirit Offering, War Cry and Ferocity are descriptive interface names.

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
| Fighting Tiger | 6 | Teleport to a rival settlement and immediately attack | Own turn; waives both attack AP and population cost |

**SPIRIT-04 — Fighting Tiger interactions.** The target may be a city or a settlement your leader already occupies. The attack uses your normal dice, bonuses and current exhaustion and counts as an initiated attack. It can be stopped by Guardian Turtle. Victory, capture and technology rewards work normally. You cannot target your own settlement or an unbuilt tile.

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

**WIN-04 — Resolution. Adaptation.** Victory is checked at the start of the eligible tribe's turn before income or further actions. The game ends as soon as one condition succeeds. If that same tribe satisfies both Settler and City, the result is labeled Settler because that condition is checked first. There is no shared victory, elimination victory, score-based tiebreak or draw condition.

## 13. Worked checks for playtesting

**EXAMPLE-01 — Ordinary build.** Start with 12 population and 2 AP on an empty beach. Build: population becomes 8 and AP becomes 1. If the tile reveals +1 knowledge, the knowledge income rate rises by 1, but no knowledge is paid immediately without Harvest the Land.

**EXAMPLE-02 — Discount plus harvest.** Start with 10 population and 2 AP, owning Tent Culture and Harvest the Land. Build on a mangrove that reveals +2 population. Pay 5 population and 1 AP, then receive 2 population immediately. End at 7 population and 1 AP; the recurring population income rate also rises by 2. The audit shows both the gross 5 cost and the 2 immediate reward.

**EXAMPLE-03 — Combat tie.** Attack dice sum to 5. Hunter adds 1; one previous attack subtracts 1: attack total 5. Defense dice sum to 4; the defending leader adds 1: defense total 5. The defender wins the tie and receives 2 population, or 3 with Rallying Cry. The attacker loses the prepaid attack cost.

**EXAMPLE-04 — A city does not win immediately.** You upgrade a settlement and end your turn. Every other tribe has a turn to intervene. If your city remains intact, you win when your next turn begins. You receive no additional start-of-turn income after that winning check.

**EXAMPLE-05 — Nomad rest.** With Nomad and 3 AP, rest gives only +1 population and +1 knowledge and leaves 0 AP. Playing Swift Jaguar afterward can give 2 AP, provided you have the card and a spirit play available.

## 14. Computer opponent policies

These are digital strategy settings, not restrictions on human play. All personalities use the same costs, dice and legal-action engine. There are no hidden resource grants. Decision code uses public information and its own cards; it does not inspect hidden tile yields or the human's hand.

**AI-01 — Setup.** Choose a beach as far as possible, by squared straight-line distance, from the nearest already-placed leader. If nobody has arrived, rank beaches randomly. This is a placement heuristic, not a path-distance calculation.

**AI-02 — Personalities and research order.** Consider the first technology in the relevant list that is not currently owned. Purchase it only if affordable and eligible. A technology stolen from that sequence becomes a priority again. The current lists are fixed:

| Personality | Leaders | Research priorities, in order |
| --- | --- | --- |
| Conqueror | Ku Nuele, Daikotei | Hunter → Spoils of War → Ferocity → City → Archery → War Tribe |
| Builder | Asinya, Herysi | Gatherer → Harvest the Land → Fertility → City → War Tribe |
| Explorer | Hecatl | Nomad → Stamina → Tent Culture → City → Rallying Cry |
| Scholar | Tao Zhe | Spiritual → New Followers → Wisdom → City → Shields |

**AI-03 — Difficulty.** Standard attempts eligible priority research whenever this step is reached. Relaxed has a 55% chance to attempt it at each decision where it is eligible. This is checked per decision, not once per turn. Difficulty changes no resource costs, dice, starting resources or victory thresholds. Fast turns changes animation/decision delays only.

**AI-04 — Decision priority.** Re-evaluate after each action, in this order:

1. When defending, use Guardian Turtle whenever one is held; otherwise roll.
2. If normal card allowance remains, use Fighting Tiger against the first rival city or settlement belonging to a rival with a pending Settler claim.
3. If allowed and held, play Wise Owl; then, on a later decision, Swift Jaguar if at zero AP; then Cunning Fox against the eligible rival technology with the highest listed knowledge cost.
4. Use an unused Tribute ability on up to two owned settlements with the highest numeric tile yield. The two resource types are compared by their raw yield number.
5. If standing on its own ordinary settlement with City and 10 population and AP, try upgrading.
6. Try the next priority research using the difficulty rule above.
7. At zero AP, buy a spirit card if population is greater than 14, the hand has fewer than 3 cards, and the draw deck itself has cards. Otherwise end the turn. The current AI does not buy from an empty draw deck even when reshuffling discards would be legal.
8. Attack a rival settlement at the current location if affordable and fewer than two attacks have been initiated this turn, or if that location is an imminent victory threat.
9. Build at the current location if it is empty and affordable.
10. Score travel destinations as described below. Use a stored Wayfinder teleport first, or Soaring Eagle second, if the best destination is at least two edges away. Otherwise move along the first step of a shortest available route if that next step has not been visited this turn.
11. If no selected move is taken, rest.

**AI-05 — Destination scoring.** Let distance be the shortest number of available trails. Environment index is 0 for beach, 1 for mangrove, and 2 for caldera. A destination must be different from the current location.

| Destination | Starting score |
| --- | --- |
| Empty tile that the tribe can currently afford to build | 8 + 1.5 × environment index − 2 × distance |
| Enemy settlement that the tribe can currently afford to attack | 9 for Conqueror, otherwise 5; then subtract 2 × distance |
| Its own ordinary settlement when it has City and 10 population | 30 − 2 × distance |
| Other destinations | −100 |

For an affordable enemy target, add 24 if it is a city and 16 if its owner has a pending Settler claim. For any revealed tile not owned by the moving tribe, add 0.4 times its numeric yield. Subtract 4 for a destination already visited this turn. Choose the highest score; move only if it is positive. Equal scores use the current board-array order. Ordinary movement and Wayfinder mark visited locations; Eagle and Tiger currently do not update that visited list.

The AI uses these heuristics, not a full strategic search or an external AI service. It may make weak decisions. If an attempted AI action is rejected, the interface reports it and attempts to pass the turn rather than repeatedly retrying.

## 15. Audit records and saves

**AUDIT-01 — What is recorded.** New matches record setup, placements, actions, research, spirit plays, combat and victories for every tribe. Turn-start income is its own event. Resource entries show before, change and after for population, knowledge, AP, income rates, card counts, settlements and cities. Exact records include technology/hand changes, tile ownership, dice/modifier sources and deck changes.

**AUDIT-02 — Available files.** Export audit produces an HTML report for reading/filtering, CSV rows for spreadsheet analysis, or full JSON data. Exports reveal secret information for auditing. Filenames carry a unique game ID and event count. File timestamps are UTC; the local history screen displays Central Time.

**AUDIT-03 — History and coverage.** Detailed events are not trimmed to the small on-screen chronicle's 100-entry limit. Games are automatically archived locally as they progress, including unfinished matches that are replaced. Saves made before auditing existed are labeled partial: no missing earlier balances are invented. A new game is required for a complete setup-to-finish record.

**AUDIT-04 — Persistence.** The active save is in browser local storage; reports are in that browser's IndexedDB. They are not uploaded or synchronized to another browser/computer. Clearing browser data can remove local saves/history. Downloading a report makes an independent copy. There is no undo action, in-game resource editor, or audit import/replay interface.

## 16. Open decisions and discrepancies

These are recorded for review; none of the alternatives below has been applied.

| Review ID | Area | Current implementation / decision needed |
| --- | --- | --- |
| REVIEW-01 | Tile composition | Five population and five knowledge tiles per environment; confirm exact counts and yield values. |
| REVIEW-02 | Dice | Base 2D4; confirm against the rulebook's inconsistent D6 / eight-sided / D4 wording. |
| REVIEW-03 | Boats and hidden trails | Nomad opens all eight coastal links; clarify boat numbers and verify the full adjacency table. |
| REVIEW-04 | Spirit deck | Six copies of each of six types; confirm quantities and discard recycling. |
| REVIEW-05 | Nomad rest | All remaining AP for only +1/+1, retained from PDF prose; confirm intended interaction with the current tree. |
| REVIEW-06 | Arrival order | All tribes sorted by D6 result, with player-ID tie resolution; decide whether to use the PDF's clockwise sequence and rerolls. |
| REVIEW-07 | Technology theft | Confirm retained descendants/cities, Stamina's immediate AP transfer, erased unused abilities, and repurchase effects. |
| REVIEW-08 | Tribute selection | Engine permits one or two, but interface requires two when available. Decide the desired behavior and align them. |
| REVIEW-09 | Empty card rewards | Automatic draws silently award nothing when all cards are held; decide whether to block, defer or compensate. |
| REVIEW-10 | War Cry | Owned permanently but +3 attack only on purchase turn; confirm it is intended as a one-time technology reward. |
| REVIEW-11 | AI choices | Fixed research and travel heuristics, unconditional Turtle use, no discard-only purchase, and teleport visited-list differences are candidates for tuning. |
| REVIEW-12 | Limits and game end | No round cap, resource cap, player elimination or draw; decide whether any are wanted. |

## 17. How we will maintain this document

1. Reference a rule ID and describe the desired change: for example, “Change TURN-02 from 2 to 3 AP,” or “Change TECH-04 to a 2-population discount.”
2. Identify related effects: AI behavior, leader advantages, card combinations, income timing, victory pacing and interface wording.
3. Record the accepted change below with old value, new value, date and reason. Leave unaccepted ideas in section 16.
4. Update the implementation and targeted tests, then check that the document and the playable game agree.
5. Issue a new document version and a new audit ruleset ID for gameplay changes. Preserve the previous version in the rules history. Historical downloaded reports remain unchanged.
6. For balance changes, start a new playtest game. The current application does not provide version-isolated engines for old active saves, so continuing an old save after a code update may use new rules. We should explicitly decide migrations when needed.

Useful change-request format: **Rule ID / proposed value or behavior / reason / what to watch in playtesting**. You can also describe changes in ordinary language; the IDs give us a precise place to record them.

### Change log

| Document version | Date | Ruleset ID | Change | Gameplay changed? |
| --- | --- | --- | --- | --- |
| 1.0 | October 8, 2026 | tribes-first-playable-audit-1 | Established this implementation baseline, complete rule catalog, review queue and revision process. | No |
| 1.1 | October 8, 2026 | tribes-first-playable-audit-1 | Recorded Brett's updated combat, setup, rest and victory rules in section 18, with implementation questions explicitly separated. | No — next gameplay revision recorded |
| 1.2 | October 8, 2026 | tribes-first-playable-audit-1 | Clarified that attacks retain their 1 AP cost but have no population entry fee; optional population boosts are public and adjustable before rolling. | No — combat clarification recorded |
| 1.3 | October 8, 2026 | tribes-first-playable-audit-1 | Confirmed separate City research and upgrade costs; replaced Science cards with 40 held knowledge; recorded immediate Science/Kingmaker victories and held City/Settlement victories. Kingmaker requires preventing two different cities; its precise prevention event awaits clarification. New knowledge tree will supply technology revisions. | No — victory clarification recorded |

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

## 18. Next gameplay revision — Brett's updated rules

**Status:** These changes were supplied by Brett and supersede the corresponding older design choices for the next gameplay revision. They are recorded here before implementation so the current game and its audit reports remain accurately described. Unresolved details below are questions, not additional rules. Kingmaker is recorded under its supplied name; it is not assumed to mean the previously omitted King Slayer rule.

### Confirmed changes and retained values

| Rule ID | Updated rule from Brett | Implementation status / detail to resolve |
| --- | --- | --- |
| TECH-23 | Armor costs 2 knowledge and grants +1 attack. | The supplied bonus is attack. Brett will provide the newest knowledge tree to establish its prerequisite and whether it replaces another card. |
| COMBAT-01 | Initiating an attack costs 1 AP and 0 population. | Confirmed clarification: “free” removes only the old biome population entry fee. The existing AP cost remains, so retries consume another AP each. No new per-settlement attack limit has been specified. |
| COMBAT-07 | Either side may spend 2 population for +1 to its combat total: attack for the attacker, defense for the defender. Both sides can see each other's proposed population spending and adjust before rolling. | Confirmed public, adjustable commitments; do not implement secret simultaneous bidding. Human and computer must use the same visibility rules. The finalization step that ends adjustments and permits the roll still needs to be defined. |
| COMBAT-08 | Beach grants +1 defense; mangrove grants +2 defense; caldera grants +3 defense. | New biome defense bonus. A randomized tile's biome must be distinguished from its physical board position. |
| SET-04 | All tribes begin with 10 population, except Asinya begins with 16 population. Starting knowledge is 5. | Replaces the 12 / 20 population baseline. Existing first-turn income and other leader powers remain separate rules unless revised. |
| COMBAT-02 | Base combat roll is one D6 and one D4. | Applies to both sides. Await Brett's newest knowledge tree for the revised Archery and Shields effects. |
| SET-03 | Biomes are randomized across board spaces; a caldera can occupy a printed beach space, for example. | Retains the confirmed total of 24 tiles chosen from 30. The old restriction of eight tiles per biome and placement within matching rings must be removed. Exact composition of the 30-tile pool remains provisional. |
| COMBAT-04 | A defensive win no longer grants the base +2 population reward. | Remove the base payout. Await Brett's newest knowledge tree for Rallying Cry's revised effect. |
| TECH-02 | Stamina costs 2 knowledge. | Already matches the game; retain this price. Its existing +1 AP effect is not otherwise revised by this update. |
| WIN-01 | Settlement victory requires holding at least 6 settlements until your next own turn, regardless of player count. | Confirmed threshold and timing; already matches the game. |
| CITY-01 | Research City technology for 10 knowledge, then spend 10 population to convert an existing settlement into a city. | Confirmed separate research and upgrade costs; already matches the game. The 10 knowledge is research, not an additional fee on every city conversion. The existing 1 AP conversion cost remains unless revised. |
| WIN-02 | City victory requires holding the city until your next own turn. | Confirmed timing; already matches the game. |
| COMBAT-03 | A city grants only +1 defense. | The existing city modifier is already +1. How it combines with the new biome defense is to be stated explicitly in the completed revision. |
| WIN-04 | A player wins Kingmaker immediately upon successfully preventing two different cities from being made. | Confirmed threshold, distinct-city requirement and immediate timing. The precise event that counts as preventing a city remains to be defined; specifically, whether it means capturing a city during its holding period. Do not count the same city twice or substitute King Slayer. |
| WIN-05 | A player wins Science immediately upon holding at least 40 knowledge at one time. | Replaces the earlier two-card proposal entirely. This uses the current unspent knowledge balance, not lifetime knowledge earned or spent. No Science cards or purchase are required. |
| COMBAT-05 | There is no attacker exhaustion penalty. | Remove the cumulative -1 for earlier attacks in the turn, including from combat explanations and audit modifier sources. |
| REST-01 | Every player may rest only once per own turn, and resting does not end the turn. | Track and reset a once-per-turn rest allowance. The existing rest reward (+1 population, +1 knowledge) and 1 AP cost are retained unless revised. |
| REST-02 | The same rest limit applies to all players. | Replace Nomad's all-remaining-AP rest restriction with the common rest action; remaining actions can still be used. |

### Decisions needed to complete this revision

1. **Combat finalization:** Attack cost is settled at 1 AP and no population entry fee. Population boosts are public and adjustable before the roll. Define the step that finalizes both players' spending and ends adjustment; no secret-bid mechanism is intended.
2. **Kingmaker prevention event:** Does capturing a newly upgraded city before its owner's next turn count as preventing it? Does “two different cities” mean two distinct board locations? The threshold of two and immediate victory timing are confirmed.
3. **Technology updates — awaiting supplied asset:** Brett will provide the newest knowledge tree. Use it to place Armor and establish the current Archery, Shields and Rallying Cry rules. Their replacements or revised effects must not be invented.

### Audit and revision requirements

- Record both sides' declared population spending, the resulting bonuses, biome defense, city defense, technology modifiers and dice separately in each battle's audit.
- For Science, record the resource change that reaches 40 knowledge and the immediate victory. For Kingmaker, record each qualifying prevention event, the player responsible and the distinct city identity, followed by the immediate victory on the second qualifying city.
- Assign the completed gameplay revision a new ruleset ID so exported reports identify the rules used. Preserve earlier reports and this document's version history.
- Define how existing saves are handled before applying the revised engine; avoid silently presenting a match played under mixed rules as a complete match under only the new ruleset.
- Update the game interface and computer decisions with the revised engine, including randomized biome labels and once-per-turn rest availability.
