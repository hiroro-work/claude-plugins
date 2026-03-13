# Extraction Criteria

Reference guide for determining what to extract and how to classify patterns.

## Principle Extraction Criteria

**Goal:** Extract only project/team-specific coding principles that AI cannot determine from general knowledge.

### Extract these principles

Principles where the **project/team has made a specific choice** that differs from or goes beyond general best practices:

- **FP only (classes prohibited)** - Team chose a specific paradigm and prohibits the alternative
- **Zustand only (Redux prohibited)** - Team chose a specific library over common alternatives
- **No ORM, raw SQL only** - Team chose an unconventional approach for specific reasons
- **Barrel exports required** - Team requires a specific module organization pattern

### Do NOT extract these

Principles that are **general software engineering best practices** — knowledge any experienced developer or AI already has:

- Language/framework best practices documented in official style guides
- Common code review feedback applicable to any project (const over let, no magic numbers, DRY, SOLID, early returns, etc.)
- Patterns where only one practical approach exists (PascalCase for React components, snake_case for Python, etc.)

**Rule of thumb:** If you would give this advice on ANY codebase regardless of context, it is general knowledge — do not extract it.

### Decision criterion

> "Is this a project/team-specific choice that differs from or goes beyond general best practices?"
> - **Yes** → Extract it (e.g., "classes prohibited, FP only", "Zustand only, no Redux")
> - **No** → Skip it (e.g., const over let, no magic numbers, DRY, early returns)

---

## Concrete Example Criteria

**Goal:** Determine when to include concrete code examples vs abstract principles.

### Include concrete examples when

Pattern involves **project-defined symbols** that AI cannot infer, **AND** meets at least one scope criterion:

**Symbol criteria** (what):
- **Custom types/interfaces** defined in the project (not from node_modules)
- **Project-specific hooks** (e.g., `useAuthClient`, `useDataFetch`)
- **Utility functions** with non-obvious signatures
- **Non-obvious combinations** (e.g., `pathFor()` + `url()` must be used together)

**Scope criteria** (why it matters):
- **Project-wide usage**: Used across many files/modules, AI needs to know about it to write consistent code
- **Convention-defining**: Not using it would break project consistency (e.g., required wrapper, mandatory type)

**Important: Keep examples minimal**
- One line per pattern: `signature` - context (2-5 words)
- Include only the type signature or function signature
- Omit implementation details, only show the "shape" AI needs to know

### Keep abstract (principles only) when

Pattern uses only **language built-ins** or **well-known patterns**:

- `const`, `let`, spread operators, map/filter/reduce
- Standard design patterns with well-known implementations
- Framework APIs documented in official docs

### Decision criterion

> "Would AI writing **new code** in this project produce **inconsistent results** without knowing this pattern?"
> - **Yes** → Include concrete example (e.g., `useAuth()` — without it, AI would write custom auth logic)
> - **No** → Skip or abstract principle only (e.g., a utility hook used in 2 files — AI not knowing it won't cause inconsistency)

### Example classification

| Pattern | Classification | Reason |
|---------|---------------|--------|
| Prefer `const` over `let` | Do not extract | General best practice, AI already knows |
| No magic numbers | Do not extract | General best practice, AI already knows |
| FP only, no classes | Principle | Team-specific paradigm choice |
| `RefOrNull<T>` type usage | Concrete example | Project-defined type, AI cannot infer |
| `pathFor()` + `url()` combination | Concrete example | Project-specific API combination |

### Gray zone handling

For patterns that are **not clearly general or project-specific**:

- Extended types from node_modules (e.g., `type MyUser = User & { custom: string }`)
- Specific combinations of standard libraries (e.g., zod + react-hook-form patterns)

**Fallback rule: When uncertain, apply the scope criterion.**

- If the pattern is used project-wide or defines a convention → include
- If the pattern is a local utility (1-2 usage sites) → skip
- Rationale: Over-specifying with local utilities clutters rule files with implementation details rather than style guidance. Rules should answer "how to write new code" not "what utilities exist."
