# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

We use [GitHub Private Vulnerability Reporting][pvr] to receive and manage
security disclosures.

[pvr]: https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability

To report a vulnerability:

1. Go to the [Security tab][security] of this repository
2. Click "Report a vulnerability"
3. Fill out the form with as much detail as possible

[security]: https://github.com/sjnims/mcp-list/security

### What to Include

- Type of vulnerability (XSS, injection, supply chain, etc.)
- Location of the affected code (file path, line numbers)
- Step-by-step reproduction instructions
- Proof of concept (if available)
- Potential impact assessment

## Response Timeline

| Stage              | Timeline                       |
| ------------------ | ------------------------------ |
| Acknowledgment     | Within 48 hours                |
| Initial assessment | Within 7 days                  |
| Status update      | Every 14 days until resolution |
| Resolution target  | Within 90 days                 |

We may request additional information during the assessment process.

## Scope

### In Scope

- Cross-site scripting (XSS) vulnerabilities in the frontend
- Injection vulnerabilities in data processing scripts
- Supply chain vulnerabilities in dependencies
- CI/CD security issues (workflow injection, secret exposure)
- Data validation issues that could serve malicious content
- Authentication/authorization bypasses (if applicable)

### Out of Scope

- Vulnerabilities in third-party services (npm, PyPI, GitHub API, Docker Hub)
- Denial of Service attacks (this is a static site hosted on GitHub Pages)
- Social engineering or phishing attacks
- Physical security attacks
- Issues requiring unlikely or complex user interaction
- Bugs without demonstrable security impact
- Outdated browsers or operating systems
- Missing security headers that don't lead to exploitable vulnerabilities

## Security Measures

This project implements the following security practices:

### Supply Chain Security

- GitHub Actions pinned to commit SHAs (not tags)
- Dependabot enabled for automated dependency updates
- `npm ci` used for reproducible builds
- No production dependencies (frontend is vanilla TypeScript)
- CodeQL analysis for JavaScript/TypeScript vulnerabilities

### CI/CD Security

- Minimal permissions in GitHub Actions workflows
- Workflow timeout limits to prevent resource abuse
- Concurrency controls to prevent race conditions
- Automated bot commits use dedicated bot identity

### Data Handling

- All data sourced from official registries (npm, PyPI, NuGet, Docker Hub)
- No user-submitted data or user authentication
- Static site with no server-side processing
- Content sanitization in frontend rendering

## Supported Versions

| Version        | Supported |
| -------------- | --------- |
| main branch    | Yes       |
| Other branches | No        |

Only the latest version deployed from the `main` branch receives security updates.

## Recognition

We appreciate security researchers who help keep this project safe.
With your permission, we will acknowledge your contribution in:

- The security advisory (if published)
- Release notes for the fix

## Non-Security Bugs

For bugs that don't have security implications, please
[open a regular issue][issues].

[issues]: https://github.com/sjnims/mcp-list/issues/new

## Questions

If you have questions about this security policy, please
[open a discussion][discussions] or contact the maintainer.

[discussions]: https://github.com/sjnims/mcp-list/discussions
