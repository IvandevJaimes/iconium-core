# AGENTS.md — Project Guidelines

## Code Style

### Comments
- **Don't** explain the obvious. If code speaks for itself, leave it silent.
- **Do** explain: non-obvious workarounds, business logic reasons, complex decisions.
- Example of unnecessary: `// Loop through users` ❌
- Example of useful: `// Retry logic: using exponential backoff to handle rate limits` ✅

### Naming Conventions

| Element | Convention | Ejemplo |
|---------|------------|---------|
| Archivos | camelCase | `iconService.ts` |
| Componentes React | PascalCase | `UserProfile.tsx` |
| Funciones | camelCase | `getUserById` |
| Constantes | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Interfaces | PascalCase + sufijo | `UserDto`, `ApiResponse` |

### Formatting
- Prettier for formatting, ESLint for linting.
- Run `npm run lint` before committing.
- TypeScript: strict mode, no `any`.

---

## Git & Commits

### Branch Strategy
```
main
  └── develop
        ├── feature/[name]
        ├── fix/[name]
        └── chore/[name]
```

### Commit Messages (Spanish only)
Format: `type: description`

| Type | When to use |
|------|--------------|
| feat | New feature |
| fix | Bug fix |
| refactor | Code improvement without behavior change |
| chore | Dependencies, configs, tooling |
| docs | Documentation only |
| test | Adding/updating tests |

Examples:
```
feat: add user authentication endpoints
fix: resolve login redirect loop on expired token
refactor: extract validation logic to middleware
chore: update ts-node to latest version
```

### Rules
- Never commit to `main` directly.
- PRs require lint + build passing.
- Squash commits when merging.

---

## Documentation

**Language**: English primary, Spanish secondary.

### Code Comments
- Keep minimal, explain "why" not "what".
- Use English for inline comments.

### README & External Docs
- English.
- Spanish allowed for internal team notes.

---

## Testing

- Unit tests for business logic.
- Integration tests for API endpoints.
- Naming: `[feature].test.ts`, `[feature].integration.test.ts`

---

## Stack

- Node.js + TypeScript
- Express
- Jest / Vitest for testing
