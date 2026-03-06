# Security Considerations

**Sensitive Information Protection:**

- `git ls-files` only analyzes tracked files, automatically excluding untracked `.env`, credentials, and other gitignored files
- **Warning:** If `.env` or credential files are accidentally tracked in git, they WILL be included in analysis
- Hardcoded secrets in source code may appear in examples
- When generating rule files, avoid including:
  - API keys, tokens, or credentials found in code
  - Internal URLs or endpoints
  - Customer names or personal information
  - High-entropy strings that may be secrets
- If sensitive information is detected in samples, redact with placeholders (e.g., `API_KEY_REDACTED`)
- Review generated rule files before committing to repository
- **Conversation extraction:** Same rules apply - do not extract sensitive information from conversation history (API keys, credentials, internal URLs mentioned in chat)
