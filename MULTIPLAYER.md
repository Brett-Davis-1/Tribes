# Private-room multiplayer — local edition

Implemented October 12, 2026. Uses the approved `2.3-leaders-2026-10-12` rules with all four victories, including Science at 40 knowledge.

## Try it on this computer

1. Run `Start Tribes.cmd`, or run `npm start` in this project. Requires Node 22.14 or later (built-in SQLite); no extra packages are needed. Node 22 may print an experimental SQLite warning.
2. Open **http://127.0.0.1:4178/?multiplayer=1**.
3. Enter a name, choose a leader, and click **Create private room**.
4. Copy the invite. Open it in a **different browser or a private window** to simulate a second person. Tabs in the same browser normally share a saved seat.
5. The second player enters a name and a different leader, then clicks **Join room**.
6. The host may add hard bots, up to four total seats. At least two seats are required; one human plus bots is supported.
7. Every human clicks **I’m ready**, then the host clicks **Start match**.
8. Choose landing spaces in the rolled order. Play normally. The other players receive changes automatically, usually within a second.

The normal single-player game remains at **http://127.0.0.1:4178/**. Its browser save and IndexedDB audits are separate from multiplayer.

## What is supported

- Private room codes and invite links; 2–4 unique leaders.
- Named human seats, optional hard bots, host-controlled lobby, readiness, and lobby seat removal.
- The same board, technology tree, public ownership portraits, rules, and four victory conditions as single-player.
- Server-owned turn order, resource changes, bot decisions, dice, deck and battle resolution.
- Public adjustable population offers. Changes reset both confirmations; the server resolves once both players confirm. Guardian Turtle is selected with the defender’s confirmation.
- Player-specific state. Rival spirit hands, unrevealed tile yields and identities, deck order, random seed, and full audit records are withheld during play.
- Automatic refresh/reconnect, persistent seats, and server-side saves after every accepted command and bot action.
- Server-stored complete audit records. Any seated human can export JSON, CSV or HTML **after victory**. Full exports are blocked during play because they reveal hidden information.

## Reconnection and persistence

The server saves rooms, game state, audit events, seat credentials and recent command receipts in **`data/tribes.sqlite`**. This folder is excluded from Git and cannot be downloaded through the web server. Do not upload it to GitHub.

The browser stores its private seat token locally. Invite links contain only the room code, never seat credentials. Keep using the same browser and origin to reconnect. Clearing browser storage or closing a private browsing session loses that browser’s ability to reclaim its seat; this first version has no account-based recovery or seat-transfer flow.

If a player loses their connection, the room continues to exist. Other players and bots can finish their own turns, but the game waits when the disconnected player must take a turn or respond to combat. Players are never silently replaced with bots. There are no turn timers, surrender, in-game removal, or host migration in this first version.

After a server restart, saved rooms reload and any pending bot turn resumes. Refreshing does not create a new player. Duplicate command receipts and revision checks prevent retried requests from double-spending resources or overwriting a newer state.

If rules change, existing multiplayer matches pause when their saved rules revision differs from the running engine. Restore the matching version to finish them, or create a new room. Avoid deploying rule changes during an active match.

For a backup, stop the server cleanly and copy the `data` directory to a safe location. It contains private match data and seat credentials. Download completed audits for independent playtest records.

## Local versus internet play

`127.0.0.1` works only on this computer. The current server defaults to this address; friends on the East Coast cannot use this local link yet.

The next step is deploying this server with persistent storage. No account, hosting purchase, firewall change, router port forwarding, GitHub upload, or public deployment was performed as part of this local build.

Hosting configuration is ready for a Node web service:

- Runtime: Node 22.14+ (pin a supported Node release on the host).
- Start command: `npm start`.
- Root directory: the directory containing `package.json`.
- Port: read from `PORT`; when it is supplied, the default bind address is `0.0.0.0`. `HOST` can override the bind address.
- Storage: set `TRIBES_DB` to a file under a mounted persistent disk, for example `/var/data/tribes.sqlite`.
- Health check: `/health`.
- Run **one** server instance against this SQLite database. This version does not support multiple replicas.
- Serve through the host’s HTTPS endpoint. Keep the site and API on the same origin.

The web server serves an explicit list of game files and artwork, not the entire repository. Source artwork archives, experiment results, database files, server modules, and logs are not public routes. GitHub Pages can still host single-player; multiplayer requires this Node service.

## Implementation notes

`multiplayer-server.mjs` handles authentication, rooms, authoritative commands, per-player views, SQLite commits, and bot scheduling. `server.mjs` provides the API and static file allowlist. `multiplayer-client.mjs` handles lobby, invite, reconnect, command retry, and seat storage. `app.mjs` uses the existing board and dialogs for either local or server-controlled games.

The first version uses authenticated HTTP commands and one-second polling, rather than WebSockets. This suits the turn-based game and keeps the local server dependency-free. Dice and combat resolution still happen exactly once on the server. If needed, polling can later be replaced by push notifications without changing the rules or command protocol.

The server accepts only allowed action fields, derives the acting player from the private seat token, checks turn/battle permissions, rejects stale revisions, and validates actions with the shared engine. SQLite commits the updated room and command receipt together before the result is returned. Failed validation or disk writes leave the prior state intact.

This is intended for a small private playtest group. Public matchmaking, spectator mode, accounts, chat, multi-server scaling, and a hosting dashboard are outside this first version.

## Verification

Run `npm test` for the existing rule suite and multiplayer tests. The latter covers lobby authority, approved starts, hidden-information filtering, invalid actions, duplicate/stale commands, multi-human combat, bots, Science, audit access, failed writes, SQLite restart recovery, six complete 2–4-player simulated matches, and HTTP/static-file boundaries.

HTTP tests need loopback socket access; a restricted execution sandbox may require running them outside that sandbox. The local browser test exercised a host, a second independently authenticated human client, a hard bot, landing, building, turn handoff, public defender commitment, and server dice resolution.
