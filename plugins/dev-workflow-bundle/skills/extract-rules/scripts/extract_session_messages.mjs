#!/usr/bin/env node
/**
 * Extract user/assistant text messages from a Claude Code session .jsonl file.
 *
 * Loads the entire file then processes lines in reverse to prioritize recent messages (where
 * corrections and preferences are most likely to appear). Outputs only text
 * content, skipping tool_use, thinking, and other non-text blocks.
 * Also recovers user responses from interactive tools (AskUserQuestion, etc.)
 * stored as tool_result entries — these contain explicit user preferences.
 *
 * Usage:
 *   node extract_session_messages.mjs <session.jsonl> [--output <file>] [--max-chars <n>] [--max-per-message <n>]
 *
 * Options:
 *   --output           Output file path (default: stdout)
 *   --max-chars        Total output character cap (default: no limit)
 *   --max-per-message  Per-message character cap (default: no limit)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const INTERACTIVE_TOOL_NAMES = new Set([
  "AskUserQuestion",
  "request_user_input",
]);

const TRUNCATION_NOTICE = "_truncation_notice";

const isObj = (v) => typeof v === "object" && v !== null;

const extractToolResultText = (block) => {
  const rc = block.content ?? "";
  if (typeof rc === "string") return [`[user response] ${rc}`];
  if (!Array.isArray(rc)) return [];
  return rc
    .filter((sub) => isObj(sub) && sub.type === "text")
    .map((sub) => `[user response] ${sub.text ?? ""}`);
};

const extractTextFromContent = (content, interactiveToolIds = null) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const extractBlock = (block) => {
    if (!isObj(block)) return [];
    if (block.type === "text") return [block.text ?? ""];
    if (block.type === "tool_result" && interactiveToolIds?.has(block.tool_use_id)) {
      return extractToolResultText(block);
    }
    return [];
  };

  return content.flatMap(extractBlock).join("\n");
};

const tryParseJson = (line) => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};

const collectToolIds = (content) =>
  Array.isArray(content)
    ? content
        .filter((b) => isObj(b) && b.type === "tool_use" && INTERACTIVE_TOOL_NAMES.has(b.name))
        .map((b) => b.id)
    : [];

const parseSessionLines = (lines) => {
  const parsed = lines.map((l) => l.trim()).filter(Boolean).map(tryParseJson);
  const skippedLines = parsed.filter((obj) => obj === null).length;
  const entries = parsed.filter((obj) => obj !== null);

  const interactiveIds = new Set(
    entries
      .filter((obj) => obj.type === "assistant")
      .flatMap((obj) => collectToolIds(obj.message?.content))
  );

  const messages = entries
    .reverse()
    .filter((obj) => obj.type === "user" || obj.type === "assistant")
    .map((obj) => ({
      role: obj.message?.role ?? obj.type,
      text: extractTextFromContent(obj.message?.content ?? "", interactiveIds),
    }))
    .filter((msg) => msg.text.trim());

  return { messages, skippedLines };
};

const applyLimits = (messages, maxChars, maxPerMessage) => {
  const kept = [];
  let totalChars = 0;

  for (let i = 0; i < messages.length; i++) {
    let truncated = messages[i].text.slice(0, maxPerMessage);
    const remaining = maxChars - totalChars;
    if (remaining <= 0) {
      kept.push({ role: TRUNCATION_NOTICE, text: "" });
      break;
    }
    if (truncated.length > remaining) {
      if (i === 0) {
        truncated = truncated.slice(0, remaining);
      } else {
        kept.push({ role: TRUNCATION_NOTICE, text: "" });
        break;
      }
    }
    kept.push({ role: messages[i].role, text: truncated });
    totalChars += truncated.length;
  }

  return { kept: kept.reverse(), totalChars };
};

const formatOutput = (kept) =>
  kept
    .map(({ role, text }) =>
      role === TRUNCATION_NOTICE
        ? "=== NOTICE ===\nEarlier messages were truncated due to size limit.\n"
        : `=== ${role} ===\n${text}\n`,
    )
    .join("\n");

const parseNonNegativeInt = (value, name) => {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0) {
    console.error(`Error: ${name} must be a non-negative integer, got "${value}"`);
    process.exit(1);
  }
  return n;
};

const main = () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      output: { type: "string", short: "o" },
      "max-chars": { type: "string" },
      "max-per-message": { type: "string" },
    },
  });

  const sessionFile = positionals[0];
  if (!sessionFile) {
    console.error(
      "Usage: node extract_session_messages.mjs <session.jsonl> [--output <file>] [--max-chars <n>] [--max-per-message <n>]",
    );
    process.exit(1);
  }

  const maxChars = values["max-chars"] ? parseNonNegativeInt(values["max-chars"], "--max-chars") : Infinity;
  const maxPerMessage = values["max-per-message"] ? parseNonNegativeInt(values["max-per-message"], "--max-per-message") : Infinity;

  // Entire file loaded into memory — acceptable for typical session files up to ~10MB
  const lines = readFileSync(sessionFile, "utf-8").split("\n");
  const { messages, skippedLines } = parseSessionLines(lines);
  const { kept, totalChars } = applyLimits(messages, maxChars, maxPerMessage);
  const result = formatOutput(kept);

  if (skippedLines > 0) {
    console.error(`Warning: skipped ${skippedLines} malformed JSON line(s)`);
  }

  if (values.output) {
    writeFileSync(values.output, result, "utf-8");
    console.error(`Extracted ${kept.length} messages (${totalChars} chars) to ${values.output}`);
  } else {
    process.stdout.write(result);
  }
};

main();
