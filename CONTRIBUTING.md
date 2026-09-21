# Contributing to BREAQ

Thank you for your interest in contributing to BREAQ! We welcome contributions, bug reports, and feature proposals from the community.

## Code of Conduct

Please maintain a respectful, welcoming, and constructive tone in all issues, discussions, and pull requests.

## How to Contribute

### Reporting Bugs

1. Search existing issues to ensure the bug hasn't already been reported.
2. If opening a new issue, clearly describe:
   - What happened vs. what you expected to happen.
   - Steps to reproduce the issue.
   - Any relevant console logs or browser errors.
   - Browser version and operating system.

### Suggesting Enhancements

1. Open an issue detailing the proposal and its potential utility for traders and technical analysts.
2. Explain the rationale and mathematical or technical logic behind the suggested indicator or feature.

### Submitting Pull Requests

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Ensure you have installed dependencies:
   ```bash
   npm install
   ```
3. Run all tests and verify that the build succeeds:
   ```bash
   npm test
   npm run build
   ```
4. Follow existing conventions:
   - Clean, modular React and vanilla CSS styles.
   - Zero hardcoded secrets or personal credentials.
   - Maintain client-side performance and courteous Binance API rate-limiting.
5. Commit your changes with clear, descriptive commit messages.
6. Submit a pull request to the `main` branch.

## Development Guidelines

- **Zero-Backend Constraint**: BREAQ runs entirely in the client browser without a dedicated backend server. Any additions must work within the browser's public capabilities.
- **Rate-Limiting & Weights**: Binance's public REST endpoints enforce a 1,200 weight/minute limit per IP. Any changes to data fetching must respect batching and avoid triggering HTTP 429 rate limit bans.
- **Testing**: Add or update tests in `tests/` whenever changing technical analysis or API services.
