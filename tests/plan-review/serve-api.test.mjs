// HTTP surface: what /api/plan ships, how /api/submit validates and records, and
// how the static handler refuses.

import test from "node:test";
import assert from "node:assert/strict";

import { PLAN_ID, SAMPLE_PLAN, getPlan, makeWorkspace, startViewer, submit } from "./helpers.mjs";

test("/api/plan ships the raw plan markdown untouched", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws, ["--wait", "--lang", "ja"]);

  const payload = await getPlan(server.base);

  assert.equal(payload.id, PLAN_ID);
  assert.equal(payload.markdown, SAMPLE_PLAN);
  assert.equal(payload.lang, "ja");
  assert.equal(payload.prevMarkdown, null);
  assert.deepEqual(payload.thread, []);
  assert.equal(typeof payload.instance, "string");
});

test("--lang falls back to en for an unsupported value", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws, ["--wait", "--lang", "fr"]);

  assert.equal((await getPlan(server.base)).lang, "en");
});

test("--prev is shipped as prevMarkdown when readable", async (t) => {
  const ws = await makeWorkspace(t, { "prev.md": "## Plan\n\nolder\n" });
  const server = await startViewer(t, ws, ["--wait", "--prev", ws.path("prev.md")]);

  assert.equal((await getPlan(server.base)).prevMarkdown, "## Plan\n\nolder\n");
});

test("/api/plan normalizes the stored thread and drops rounds it cannot repair", async (t) => {
  const thread = {
    plan: PLAN_ID,
    rounds: [
      {
        // An explicit round that differs from the array index, so the test can tell
        // a preserved round from a positional one — and can tell that entry ids are
        // built from the index rather than from the round.
        round: 7,
        submitted_at: "2026-01-01T00:00:00.000Z",
        entries: [
          {
            block: "overview::1",
            kind: "sketch",
            disposition: "maybe",
            body: "keep me",
            anchor: { section: "overview", excerpt: "Goal: sample" },
          },
          { id: "kept-id", block: "decisions::1", kind: "figure", disposition: "answered", reply: "sure" },
        ],
      },
      { round: 2, entries: "not an array" },
    ],
  };
  const ws = await makeWorkspace(t, { [`${PLAN_ID}.thread.json`]: JSON.stringify(thread) });
  const server = await startViewer(t, ws);

  const rounds = (await getPlan(server.base)).thread;

  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].round, 7, "an explicit round is preserved, not renumbered by position");
  const [first, second] = rounds[0].entries;
  assert.equal(rounds[0].submitted_at, "2026-01-01T00:00:00.000Z", "carried through unchanged");
  assert.equal(first.id, "r1-c1", "a missing id is built from the array index, not the round");
  assert.equal(first.kind, "prose", "an unknown kind falls back to prose");
  assert.equal(first.disposition, null, "a disposition outside the allowed set is cleared");
  assert.deepEqual(first.anchor, { section: "overview", excerpt: "Goal: sample" }, "carried through unchanged");
  assert.equal(first.block, "overview::1", "carried through unchanged");
  assert.equal(first.body, "keep me", "carried through unchanged");
  assert.equal(second.id, "kept-id", "an existing id is preserved");
  assert.equal(second.kind, "figure");
  assert.equal(second.disposition, "answered");
  assert.equal(second.reply, "sure", "carried through unchanged");
});

test("a thread file with no rounds array is ignored", async (t) => {
  const ws = await makeWorkspace(t, { [`${PLAN_ID}.thread.json`]: JSON.stringify({ plan: PLAN_ID }) });
  const server = await startViewer(t, ws);

  assert.deepEqual((await getPlan(server.base)).thread, []);
  assert.match(server.stderr, /no rounds array/);
});

test("instance changes across restarts so an open page can notice one", async (t) => {
  const ws = await makeWorkspace(t);

  const first = await startViewer(t, ws, ["--wait"]);
  const firstInstance = (await getPlan(first.base)).instance;
  assert.equal((await (await fetch(`${first.base}/api/instance`)).json()).instance, firstInstance);
  await submit(first.base, { decision: "approve", comments: [] });
  await first.closed;

  const second = await startViewer(t, ws, ["--wait"]);
  assert.notEqual((await getPlan(second.base)).instance, firstInstance);
});

test("/api/submit rejects a body that is not JSON", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  const res = await submit(server.base, "not json");

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "invalid JSON" });
});

test("/api/submit rejects a decision outside approve and revise", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  const res = await submit(server.base, { decision: "maybe", comments: [] });

  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /approve.*revise/);
});

test("/api/submit drops blank comments and narrows kind to two values", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  await submit(server.base, {
    decision: "approve",
    comments: [
      { block: "overview::1", body: "  ", section: "overview" },
      { block: "   ", body: "orphaned" },
      { block: "overview::2", body: "kept", section: "overview", excerpt: "Goal", kind: "sketch" },
      { block: "decisions::1", body: "figure comment", kind: "figure" },
    ],
  });
  await server.closed;

  const written = await ws.readJson(`${PLAN_ID}.comments.json`);
  assert.deepEqual(
    written.comments.map((c) => [c.block, c.kind]),
    [
      ["overview::2", "prose"],
      ["decisions::1", "figure"],
    ],
  );
  assert.equal(written.comments[0].excerpt, "Goal");
  assert.equal(written.decision, "approve");
});

test("a revise with comments opens a thread round", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  await submit(server.base, {
    decision: "revise",
    comments: [{ block: "overview::1", body: "please rework", section: "overview", excerpt: "Goal" }],
  });
  await server.closed;

  const thread = await ws.readJson(`${PLAN_ID}.thread.json`);
  assert.equal(thread.rounds.length, 1);
  const [entry] = thread.rounds[0].entries;
  assert.equal(entry.id, "r1-c1");
  assert.equal(entry.body, "please rework");
  assert.deepEqual(entry.anchor, { section: "overview", excerpt: "Goal" });
  assert.equal(entry.reply, null, "the reply is the caller's to fill in");
  assert.equal(entry.disposition, null);
  assert.match(thread.rounds[0].submitted_at, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
});

test("a revise appends to an existing thread instead of restarting it", async (t) => {
  const seeded = {
    plan: PLAN_ID,
    rounds: [
      {
        round: 1,
        submitted_at: "2026-01-01T00:00:00.000Z",
        entries: [{ id: "r1-c1", block: "overview::1", body: "first round", reply: null, disposition: null }],
      },
    ],
  };
  const ws = await makeWorkspace(t, { [`${PLAN_ID}.thread.json`]: JSON.stringify(seeded) });
  const server = await startViewer(t, ws);

  await submit(server.base, {
    decision: "revise",
    comments: [{ block: "decisions::1", body: "second round", section: "decisions", excerpt: "Question" }],
  });
  await server.closed;

  const thread = await ws.readJson(`${PLAN_ID}.thread.json`);
  assert.equal(thread.rounds.length, 2);
  assert.equal(thread.rounds[0].entries[0].body, "first round", "the earlier round survives");
  assert.equal(thread.rounds[1].round, 2);
  assert.equal(thread.rounds[1].entries[0].id, "r2-c1");
  assert.equal(thread.rounds[1].entries[0].body, "second round");
});

test("an approve does not open a thread round", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  await submit(server.base, {
    decision: "approve",
    comments: [{ block: "overview::1", body: "advisory only" }],
  });
  await server.closed;

  await assert.rejects(ws.read(`${PLAN_ID}.thread.json`));
});

test("a revise carrying no comments does not open a thread round", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  await submit(server.base, { decision: "revise", comments: [] });
  await server.closed;

  await assert.rejects(ws.read(`${PLAN_ID}.thread.json`));
});

test("/api/submit rejects a body over the size cap", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  // Passed as a raw string: the cap fires while the body is still being read, so
  // nothing needs to parse and one allocation is enough.
  const res = await submit(server.base, "x".repeat(5_000_001));

  assert.equal(res.status, 413);
});

test("the static handler serves the viewer page, and nothing outside public/", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  const index = await fetch(`${server.base}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get("content-type"), /text\/html/);

  assert.equal((await fetch(`${server.base}/nope.css`)).status, 404);

  // `new URL` collapses `..` before the handler's containment guard sees it, so
  // none of these reaches the 403 branch. What is asserted is the observable
  // property: no spelling of an escape returns a file.
  const escapes = ["/../serve.mjs", "/%2e%2e/serve.mjs", "/..%2fserve.mjs", "/public/../../serve.mjs"];
  const results = await Promise.all(escapes.map((p) => fetch(`${server.base}${p}`)));

  for (const [i, res] of results.entries()) {
    assert.ok(res.status === 403 || res.status === 404, `${escapes[i]} returned ${res.status}`);
  }
});

test("only GET, plus POST to /api/submit, is served", async (t) => {
  const ws = await makeWorkspace(t);
  const server = await startViewer(t, ws);

  assert.equal((await fetch(`${server.base}/api/plan`, { method: "DELETE" })).status, 405);
  assert.equal(
    (await fetch(`${server.base}/api/plan`, { method: "POST" })).status,
    405,
    "POST is routed only for /api/submit",
  );
  assert.equal(
    (await fetch(`${server.base}/api/submit`)).status,
    404,
    "a GET on the submit path falls through to the static handler",
  );
});
