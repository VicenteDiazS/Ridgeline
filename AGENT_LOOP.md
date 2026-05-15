# Ridgeline Site Agent Loop

This file defines the repeatable workflow for Anton, the main coding agent improving this site over many sessions.

## Goal

Continuously improve the 2019 Honda Ridgeline service site while keeping it correct, usable, verified, and easy to resume after tokens or time run out.

The agent should not make random changes just to stay busy. Each session should produce useful, reviewable improvements.

## Session Loop

1. Read `ANTON.md`, `AGENT_STATE.md`, `AGENT_BACKLOG.md`, and `SITE_QUALITY_AUDIT.md`.
2. Check `git status --short` and do not revert user changes.
3. Use internet research when it can reveal useful feature ideas, current best practices, or reliable source material.
4. Use temporary helper sub-agents when available and helpful for research, narrow implementation, or verification.
5. Pick the highest-value task that fits the current session.
6. Implement the task in small, understandable changes.
7. Verify with static checks, browser checks, and screenshots when UI changed.
8. Update `AGENT_STATE.md`, `AGENT_BACKLOG.md`, `SITE_QUALITY_AUDIT.md`, `ANTON.md`, and any useful Markdown memory files with:
   - what changed
   - what was verified
   - what remains
   - the best next task
   - useful sources or research ideas
   - durable lessons or preferences that should guide future Anton runs
9. Stop cleanly when tokens/time are low, leaving the project resumable.

## User Input Rules

Ask the user before:

- changing vehicle facts, fuse ratings, torque specs, fluids, or safety-critical instructions without a reliable source
- deleting large sections or changing the site direction
- adding paid services, accounts, cloud dependencies, or external hosting
- making a design choice where the user’s preference clearly matters
- creating, installing, or enabling additional automated coding agents

Proceed without asking when:

- fixing broken links, blank navigation, layout overflow, or obvious UI bugs
- improving accessibility, metadata, screenshots, docs, or verification
- organizing existing content without changing the facts
- adding small, reversible quality-of-life features

## Verification Standard

For every UI/navigation change:

- Run an internal link and anchor audit.
- Open the site in a real browser.
- Check desktop and mobile widths.
- Capture screenshots into `debug-screenshots/`.
- Confirm Search, More, and primary header navigation still work.

For every data/reference change:

- Record the source in the relevant code, page, or notes file.
- Prefer official owner/manual data when available.
- Use forums only as supporting context, not as the only authority for safety-critical information.

## Resume Prompt

Use this prompt when starting a new session:

> Continue the Ridgeline site agent loop. Read `ANTON.md`, `AGENT_STATE.md`, `AGENT_BACKLOG.md`, and `SITE_QUALITY_AUDIT.md`, then pick the highest-value next task, implement it, verify with screenshots/browser checks if UI changed, and update the state files before stopping.

## Local Automation

The scheduled Windows runner lives at `tools/agent-loop/ridgeline-agent-loop.ps1`. Scheduled Anton runs use full computer access with `approval_policy="never"` so Anton can keep the local automation, browser checks, logs, and site work moving without interactive prompts.

Run once:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\ridgeline-agent-loop.ps1 -Once
```

Install as a scheduled task:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\Install-AgentLoopTask.ps1 -IntervalMinutes 30
```

If Windows asks for Administrator permission, approve it. Updating an existing scheduled task's wake/logon triggers, retry behavior, or highest-privilege run level requires elevation.

Anton is installed with two triggers:

- every 30 minutes
- at Windows logon, so a missed sleep/lid-close run gets another chance as soon as the laptop wakes and signs in

The scheduled task is configured to request highest privileges and to retry up to 3 times at 5-minute intervals when a run fails. It still runs as the signed-in `diazv` user, so a full reboot may require signing in once before normal interactive tools are available.

Allow plugged-in laptop closed-lid operation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\Enable-AntonLaptopMode.ps1
```

This sets plugged-in lid close behavior to "do nothing", enables plugged-in wake timers, and updates Anton's scheduled task with `WakeToRun`. Use the `-IncludeBattery` switch only if you intentionally want the same behavior while unplugged.

If the laptop enters a deep sleep state that ignores wake timers, Anton cannot run while it is fully asleep. The site heartbeat panel will show "No recent check-in" after the grace period, and the logon trigger will run Anton when Windows wakes/signs in again.

Always-on Anton mode:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\Enable-AntonAlwaysOn.ps1 -DisableHibernate
```

This sets sleep and hibernate timers to never, sets lid close to do nothing, enables wake timers on plugged-in and battery power, and updates Anton's scheduled task to wake, keep running on battery, retry failures, and request highest privileges. Disabling hibernate requires administrator permission, so approve the Windows elevation prompt if it appears.

The runner uses `agent-loop.config.json`, writes logs to `agent-runs/`, updates `agent-last-run.json`, commits completed changes, and pushes them to the configured GitHub remote when Git authentication is available.

Scheduled mode may start with a dirty worktree. Anton must inspect existing changes, avoid reverting unknown user work, and keep commits focused on its own work whenever possible.

The site reads `agent-last-run.json` on the home page in the `#agent-status` section.

Manual full-access Anton mode:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\Start-AntonManual.ps1
```

Use manual mode when you want Anton to have complete computer access in the foreground. Scheduled mode also has full computer access and should keep its changes focused, reversible, and documented because a background task cannot reliably pause for a human approval conversation.

Home page start button:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\Start-AntonControlServer.ps1
```

This starts a small local control server at `http://127.0.0.1:8765`. The home page's Anton panel can POST to that helper to start the existing scheduled task immediately.

Anton Console:

Open `anton.html` to see Anton's instruction files, recent file history, current scheduled-task state, and controls. With the local control server running, the console can read allow-listed markdown files and append timestamped user notes to `ANTON.md`.

Desktop launcher:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\Open-AntonConsole.ps1
```

This starts the local control server if needed, waits for it to answer, and opens `anton.html`.

Keep the default localhost binding for normal use. If you intentionally expose it beyond this PC, pass a private token:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\agent-loop\Start-AntonControlServer.ps1 -Prefix "http://+:8765/" -Token "choose-a-long-private-token"
```

Then set the matching control URL and token from the home page's Anton panel. Exposing this helper may require Windows firewall or URL reservation changes, and it should only be used on a trusted private network or through a secure tunnel.
