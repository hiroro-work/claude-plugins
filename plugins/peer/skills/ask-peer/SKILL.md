---
name: ask-peer
description: Consult with a peer engineer for plan review, code review, implementation discussions, or problem-solving brainstorming. Use when you need a second opinion, want to validate your approach, or check for overlooked issues.
---

# Peer Engineer Consultation

Get a second opinion from a peer engineer (Claude subagent) for:

- **Planning review**: Validate your implementation approach before starting
- **Code review**: Check completed work for issues or improvements
- **Problem-solving**: Brainstorm solutions when stuck
- **Sanity check**: Confirm you're on the right track

## Usage

Invoke the peer agent via Task tool:

```
Task(subagent_type="peer", prompt="Your consultation request here")
```

## Examples

**Plan review before implementation:**

```
Task(subagent_type="peer", prompt="Review this implementation plan for adding user authentication. Check for security concerns and missing edge cases.")
```

**Code review after completion:**

```
Task(subagent_type="peer", prompt="Review the changes I made to the authentication module. Look for bugs, security issues, and code quality problems.")
```

**Problem-solving consultation:**

```
Task(subagent_type="peer", prompt="I'm getting intermittent test failures in the payment module. Help me think through possible causes.")
```

## What the Peer Agent Provides

- Frank, objective feedback as an equal
- Specific concerns with suggested alternatives
- Questions to challenge assumptions
- Practical solutions rather than perfection
