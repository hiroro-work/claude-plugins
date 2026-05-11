---
name: caffeinate
description: Manage macOS caffeinate to prevent system sleep. Supports start/stop/status. macOS only.
allowed-tools: Bash(bash */caffeinate/caffeinate.sh *)
---

# Caffeinate Manager

Prevent macOS system sleep using `caffeinate`.

**Requires**: macOS (`caffeinate` command)

Use `caffeinate.sh` located in the same directory as this SKILL.md.

## Start (default)

1. Run `bash <skill-dir>/caffeinate.sh start`

## Stop

When the user requests "stop":

1. Run `bash <skill-dir>/caffeinate.sh stop`

## Status

1. Run `bash <skill-dir>/caffeinate.sh status`

## Notes

- Automatically stopped on session end via SessionEnd hook
- To stop manually, run `/caffeinate stop`
