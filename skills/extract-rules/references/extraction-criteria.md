# Extraction Criteria

Reference guide for determining what to extract and how to classify patterns.

## Principle Extraction Criteria

**Goal:** Extract abstract principles that guide AI to write code consistent with project style.

### Extract these principles

Principles where **multiple common approaches exist** and AI might choose differently without guidance:

- **Immutability vs Mutability** - AI often writes mutable code by default
- **Declarative vs Imperative** - Both are common approaches
- **Functional vs Class-based** - Both are valid paradigms
- **OOP vs FP** - Different design philosophies

### Do NOT extract these

Principles where **only one practical approach exists**:

- React components use PascalCase (no alternative)
- Python uses snake_case (language standard)
- TypeScript files use `.ts` extension

### Decision criterion

> "Would a general AI write code differently without this principle?"
> - **Yes** → Extract it
> - **No** → Skip it

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
| Prefer `const` over `let` | Principle only | Language built-in, AI knows this |
| `RefOrNull<T>` type usage | Concrete example | Project-defined type, AI cannot infer |
| Page Object Model | Principle + hints | Well-known pattern |
| `pathFor()` + `url()` combination | Concrete example | Project-specific API combination |

### Gray zone handling

For patterns that are **not clearly general or project-specific**:

- Extended types from node_modules (e.g., `type MyUser = User & { custom: string }`)
- Specific combinations of standard libraries (e.g., zod + react-hook-form patterns)

**Fallback rule: When uncertain, apply the scope criterion.**

- If the pattern is used project-wide or defines a convention → include
- If the pattern is a local utility (1-2 usage sites) → skip
- Rationale: Over-specifying with local utilities clutters rule files with implementation details rather than style guidance. Rules should answer "how to write new code" not "what utilities exist."
