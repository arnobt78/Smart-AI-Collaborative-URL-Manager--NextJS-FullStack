# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `0.2.x` (main) | Yes |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately to:

- **Email:** [contact@arnobmahmud.com](mailto:contact@arnobmahmud.com)
- **Subject:** `[SECURITY] Daily Urlist / urlist — short description`

Include (if possible):

1. Affected URL, route, or file
2. Steps to reproduce
3. Impact (data exposure, auth bypass, XSS, etc.)
4. Your contact for follow-up

You should receive an acknowledgment within a few business days. After a fix is available (or a mitigation is documented), we may credit you if you wish.

## Scope Notes

- This app uses **custom cookie sessions** (`session_token`), not NextAuth.
- Never commit real secrets (`.env.local`, Vercel tokens, API keys).
- Prefer responsible disclosure; do not test against the production demo in a way that harms other users' data.
