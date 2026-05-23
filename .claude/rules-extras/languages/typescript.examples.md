# TypeScript Rules - Examples

## Principles Examples

### 型安全性
**Good:**
```typescript
const user: User = { name: 'Alice', role: 'admin' };
const getName = (user: User): string => user.name;
```
**Bad:**
```typescript
const user: any = { name: 'Alice' };
const getName = (user) => user.name;
```

### 不変性
**Good:**
```typescript
const updated = { ...user, name: 'Bob' };
const names = users.map(u => u.name);
const active = users.filter(u => u.active);
```
**Bad:**
```typescript
user.name = 'Bob';
const names: string[] = [];
for (const u of users) { names.push(u.name); }
```

### 型インポート分離
**Good:**
```typescript
import type { User } from '@local/shared';
import { createUser } from '@local/shared';
```
**Bad:**
```typescript
import { User, createUser } from '@local/shared';
```
