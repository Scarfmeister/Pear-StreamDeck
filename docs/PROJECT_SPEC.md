I want you to build a complete Stream Deck plugin for Pear Desktop, using the existing YTMD Connector Stream Deck plugin as the starting point.

You have permission to use my connected GitHub account. Carry this project through to a working implementation rather than stopping at a design or code examples.

## Repositories

Upstream Stream Deck plugin:

https://github.com/XeroxDev/YTMD-StreamDeck

Pear Desktop:

https://github.com/pear-devs/pear-desktop

My GitHub username is:

Scarfmeister

Create a fork of XeroxDev/YTMD-StreamDeck under my account if possible. Rename or otherwise establish the project as:

Pear-StreamDeck

If GitHub does not permit renaming the fork cleanly, use an appropriate repository name such as Pear-StreamDeck-Connector.

The YTMD-StreamDeck project is MIT licensed. Preserve all required original copyright and MIT license notices. Add appropriate attribution for the fork and clearly document that this project targets Pear Desktop rather than the old YouTube Music Desktop App.

Do not modify the upstream XeroxDev repository.

## Goal

Recreate the functionality of YTMD Connector as a Stream Deck plugin for Pear Desktop.

The plugin must use Pear's native API Server rather than the old ytmdesktop-ts-companion connection.

Target Pear Desktop 3.12.0 or later where compatible.

Pear has a built-in API Server plugin. Its default API port is 26538 and its API version is currently v1.

Use both:

- REST API for commands and state queries.
- WebSocket API for real-time state updates.

Do not poll constantly when Pear can push the state through the WebSocket.

Support Pear's normal AUTH_AT_FIRST authentication. On first connection, request authorization from Pear using its /auth/{id} endpoint, allow Pear to display its authorization prompt, store the returned access token in Stream Deck global settings, and reuse it on future connections.

Also support Pear installations configured with authentication disabled.

The plugin should default to localhost and should not require Pear to expose its API to the LAN.

## Actions

Implement the following normal Stream Deck button actions:

1. Play / Pause
2. Next Track
3. Previous Track
4. Like Track
5. Dislike Track
6. Mute
7. Volume Down
8. Volume Up
9. Track Info
10. Shuffle
11. Repeat Mode
12. Play Playlist

Where applicable, actions must be state-aware.

### Play / Pause

The button must show the actual player state:

- Show Play when paused/stopped.
- Show Pause when playing.

Do not infer state only from the last button press.

Use Pear WebSocket player-state events.

### Next / Previous

Normal transport commands.

### Like / Dislike

Show the current like/dislike state where Pear exposes it.

Pressing Like when already liked should follow the most sensible behavior supported by Pear. Do the same for Dislike.

Do not invent an unsupported state transition.

### Mute

Show whether Pear is muted.

Use Pear state rather than assuming a successful button press changed the state.

### Volume Up / Volume Down

Each action must have a user-configurable volume step in its Stream Deck Property Inspector.

Examples:

- 1%
- 2%
- 5%
- 10%

Use the current volume from Pear, add/subtract the configured amount, clamp to 0–100, and send the new value.

Default step: 5%.

### Track Info

Make this useful on a normal Stream Deck key.

At minimum display:

- Track title
- Artist

Use album artwork as the key image if practical and reliable.

If possible within Stream Deck limitations, allow the Property Inspector to select a display format such as:

- Title
- Artist
- Title + Artist
- Album
- Title + Artist + Album

Keep the display readable on normal Stream Deck keys.

### Shuffle

This must be state-aware.

- Show an off state when shuffle is disabled.
- Show an on state when shuffle is enabled.
- Press toggles the real Pear shuffle state.

Use Pear's WebSocket shuffle state updates.

### Repeat

Support all Pear repeat modes:

- NONE
- ALL
- ONE

Each mode should have a distinct displayed state.

Pressing the button cycles through the modes in a predictable order.

Use Pear's actual repeat state from its API/WebSocket.

### Play Playlist

Allow the user to configure either:

- A YouTube Music playlist URL, or
- A playlist ID.

If a URL is entered, extract and store/use its playlist ID automatically when practical.

Add a setting for how the playlist starts:

- Follow Shuffle State
- Always Normal
- Always Shuffle

Follow Shuffle State should be the default.

Important requirement:

When starting a playlist in shuffle mode, reproduce YouTube Music's native **Shuffle Play** behavior.

Do NOT implement shuffled playlist startup as:

1. Start playlist normally.
2. Enable shuffle.
3. Skip the first track.

That changes playback/listening metrics and briefly starts the wrong song.

YouTube Music itself exposes a Shuffle Play command from the playlist's three-dot menu. Investigate Pear/YouTube Music's internal APIs and invoke the equivalent native operation before playback begins.

If Pear's current public REST API does not expose playlist start or Shuffle Play, implement the smallest maintainable Pear-side extension required.

Prefer submitting that extension as a separate branch/PR-compatible change against Pear rather than maintaining an invasive patch.

Clearly document any Pear changes that are required.

## Stream Deck Plus / Encoder Actions

Implement proper Stream Deck Plus support.

### Volume Dial

Provide a dedicated Volume encoder action.

- Rotate clockwise: increase volume.
- Rotate counter-clockwise: decrease volume.
- Press: toggle mute.
- Touch display: show current volume and mute state where appropriate.

The volume step should be configurable in the Property Inspector.

### Transport Dial

Also provide a transport encoder action because this was part of the intended layout:

- Rotate clockwise: Next Track.
- Rotate counter-clockwise: Previous Track.
- Press: Play/Pause.
- Show current playback state on the dial display.

The existing YTMD Connector already has similar encoder behavior. Preserve or improve it rather than removing it.

### Playlist Selector Dial

Implement a Stream Deck Plus playlist selector if the SDK permits a good user experience.

The user should be able to configure multiple playlist entries, each containing:

- Display name
- Playlist URL or playlist ID
- Optional custom image if practical

The dial should:

- Rotate: move through playlists.
- Press: start the selected playlist.
- Use the Shuffle button's current state when the playlist is configured for Follow Shuffle State.

Use a dial stack or equivalent Stream Deck Plus UI when supported by the current SDK.

If the Stream Deck SDK makes a true dynamic dial stack unsuitable, implement the closest reliable equivalent and document the limitation.

## Pear APIs already identified

Verify these against Pear 3.12.0 source before implementation.

Useful Pear REST endpoints include:

- POST /api/v1/toggle-play
- POST /api/v1/play
- POST /api/v1/pause
- POST /api/v1/next
- POST /api/v1/previous
- GET/POST /api/v1/shuffle
- GET /api/v1/repeat-mode
- POST /api/v1/switch-repeat
- GET/POST /api/v1/volume
- POST /api/v1/toggle-mute
- GET /api/v1/like-state
- POST /api/v1/like
- POST /api/v1/dislike
- GET /api/v1/song
- GET /api/v1/queue
- POST /api/v1/search

Pear also has a WebSocket endpoint:

/api/v1/ws

Use it for real-time updates including:

- PLAYER\_INFO
- VIDEO\_CHANGED
- PLAYER\_STATE\_CHANGED
- POSITION\_CHANGED
- VOLUME\_CHANGED
- REPEAT\_CHANGED
- SHUFFLE\_CHANGED

Pear authentication uses:

POST /auth/{client-id}

and can return an access token after the user approves the client.

Verify the required Authorization header/token behavior from Pear source rather than guessing.

## Architecture

Replace the old dependency:

ytmdesktop-ts-companion

with a clean Pear client abstraction.

Create something conceptually similar to:

- PearClient
- REST command layer
- WebSocket/state layer
- Authentication/token management
- Connection/reconnection management

Actions should consume this abstraction rather than independently making HTTP requests.

Maintain one shared connection/state model for the plugin.

The client should handle:

- Pear not running.
- API Server plugin disabled.
- Pear starting after Stream Deck.
- Pear restarting.
- WebSocket disconnect/reconnect.
- Expired/invalid authorization.
- API request failures.
- Stream Deck restarting while Pear is already running.

Do not spam logs or reconnect aggressively. Use sensible retry/backoff behavior.

## Property Inspector / Settings

Provide global connection settings for:

- Host
- Port
- Authentication/token status
- Reauthorize button
- Connection status if practical

Defaults:

- Host: 127.0.0.1
- Port: 26538

Per-action settings should be stored only where required.

Examples:

Volume Up/Down:

- Step size

Play Playlist:

- Playlist URL/ID
- Startup shuffle behavior

Track Info:

- Display format

Playlist Selector:

- List of configured playlists

## Existing YTMD Connector code

Do not rewrite functioning Stream Deck integration unnecessarily.

The upstream project already has separate action implementations for:

- Play/Pause
- Next/Previous
- Like/Dislike
- Mute
- Volume
- Track Info
- Shuffle
- Repeat
- Play Playlist

It also already declares Stream Deck encoder support.

Use this existing structure where it remains useful, but do not retain obsolete architecture just for compatibility.

The current upstream plugin uses:

- TypeScript
- streamdeck-typescript
- ytmdesktop-ts-companion
- Stream Deck SDK version 2 style manifest

Review the current Elgato Stream Deck SDK and determine whether it is better to:

A. modernize this fork to the current official Stream Deck SDK/package, or
B. retain the existing framework where it remains stable and compatible.

Prefer modernization if it materially improves Stream Deck Plus encoder/dial support, maintainability, or packaging.

Do not migrate merely for cosmetic reasons.

## Naming

Change the user-facing plugin name to something similar to:

Pear Desktop Connector

Category:

Pear Desktop

Use a new UUID namespace that does not collide with the original YTMD plugin.

Do not retain fun.shiro.ytmd UUIDs.

Use an appropriate reverse-domain namespace associated with this project/my GitHub identity. Pick a stable namespace and document it.

## Icons

Do not copy proprietary YouTube or Google branding.

The original repository contains custom icons and an icon PSD.

Review their licensing/status before reusing individual assets.

Prefer creating simple generic media-control icons or using assets that can legally be redistributed.

Required visual states include at least:

- Play
- Pause
- Next
- Previous
- Like on/off
- Dislike on/off
- Mute/unmute
- Volume up/down
- Shuffle on/off
- Repeat off/all/one
- Playlist
- Track info

Keep them visually consistent.

## OBS / Tuna

Do not implement OBS metadata export in this Stream Deck plugin.

Pear already has a Tuna OBS integration and I will use Tuna separately for:

- Track metadata
- Album information
- Album artwork
- OBS sources

Keep this project focused on Stream Deck control.

## Testing

Build and test as much as can be done automatically.

Add unit tests for the Pear client where practical, including:

- REST command construction
- Volume clamping
- State transitions
- WebSocket message parsing
- Authentication handling
- Reconnection behavior
- Playlist URL → ID parsing
- Playlist start-mode selection

Build the .streamDeckPlugin distributable if the tooling supports it.

Validate the Stream Deck manifest with current Elgato tooling where possible.

Do not report success merely because TypeScript compiles.

## Documentation

Rewrite the README for the new project.

Include:

1. What the plugin does.
2. Supported actions.
3. Stream Deck Plus features.
4. Required Pear version.
5. How to enable Pear's API Server plugin.
6. First-run authorization procedure.
7. Default host/port.
8. Installation instructions.
9. Development/build instructions.
10. Playlist Shuffle Play behavior.
11. Known limitations.
12. Attribution to XeroxDev/YTMD-StreamDeck and its MIT license.
13. Any Pear-side modification required for native playlist start/Shuffle Play.

Include a clear setup section for a normal user.

## Git workflow

Work on a development branch rather than directly on the default branch.

Use logical commits.

Run builds/tests before finalizing.

When the implementation is ready, create a pull request from the development branch into the fork's default branch.

Do not merge it automatically unless there is a strong reason.

In the PR description, summarize:

- Architecture changes
- Supported actions
- Encoder support
- Authentication
- Playlist behavior
- Testing performed
- Any remaining limitations
- Any required Pear-side changes

If a Pear modification is necessary, keep that work separately organized and give me a patch/branch/PR plan rather than mixing Pear source into the Stream Deck repository.

## Decision authority

Make reasonable engineering decisions without stopping to ask me about minor implementation details.

If an existing approach is obsolete or broken, replace it.

If one requirement is blocked by an upstream Pear or Stream Deck limitation, continue implementing everything else and clearly document the blocked item.

Do not stop after analysis or provide only a proposed architecture. Implement the project, build it, test it, commit it, and prepare the PR.

At completion, give me:

- Repository link
- Branch
- PR link
- Implemented feature checklist
- Installation/build artifact if available
- Pear configuration instructions
- Any remaining manual testing I need to perform on my Stream Deck Plus
- Any Pear-side change still required
GitHub


