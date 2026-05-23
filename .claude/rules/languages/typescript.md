---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Rules

## Principles

- 型安全性 (strict mode, noUncheckedIndexedAccess, any禁止, 明示的型注釈)
- 関数型スタイル (arrow functions, pure functions, クラス不使用)
- 不変性 (const, spread, map/filter/reduce, Object.fromEntries)
- 宣言的記述 (命令的ループより宣言的変換)
- 型インポート分離 (import type, export type *, consistent-type-imports)

## Examples

When in doubt: ../../rules-extras/languages/typescript.examples.md
