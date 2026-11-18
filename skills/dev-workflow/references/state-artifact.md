# State artifact

Read from `decomposition-state.md` § Resume when the `--resume` argument is a claude.ai artifact URL. Unqualified `§` references point into this file.

The state is the text inside the page's `<pre id="dev-workflow-state">`, with `&lt;`, `&gt;`, `&amp;` decoded: the state file text of `decomposition-state.md` § State file. This workflow never publishes a new state artifact.

## Read

`Artifact` `action: "read"` with the URL.

- The result says the user owns the artifact or can edit it → take the state from the `<pre>` in the HTML it returns, or in the saved file it names.
- The read fails, or the result says neither → stop: say the run needs edit access to this artifact.
- The page has no `<pre id="dev-workflow-state">` → stop: say the page is not a state artifact.

## Write

Every write-back, in this order:

1. `Artifact` `action: "read"` with the URL; take the state from the `<pre>`.
2. Apply to that text only the changes this run made to the state. An added subtask takes the largest `id` plus one, and a `depends_on` this run wrote follows it. Never renumber or reorder subtasks. When the current subtask's `status` there is not the one this run last read or wrote, change nothing: at `decomposition-state.md` § Resume, return to its step 4 with that text; later, say § Write step 4's `state-publish-failed` line with `changed elsewhere` as `<reason>`, and continue.
3. Write the text to `dev-workflow.<slug>.md` outside the repository (the session's scratchpad directory, else the OS temp directory). Run `node "<base dir>/scripts/state/page.mjs" --state <that file> --out <that path with .html in place of .md>`. Publish with `Artifact`: `file_path` the `.html`, `url` the URL. Never pass `force`.
4. A publish refused because the artifact changed → start again from step 1, three tries at most. Any other failed read or publish → retry that call once after 1–2 seconds. When that fails too, or at once when step 1 yields no state or one that fails validation, or the script exits non-zero, say `state-publish-failed (<reason>)` and the changes left unwritten in one line, and continue; `<reason>` is the failure's last non-empty line cut to 80 chars, or `(no reason)`.
