# Contributing to Cypher Portfolio Analytics

First off, thank you for considering contributing to Cypher! It's people like you that make Cypher such a great tool for the Solana community.

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose
- Git
- A Solana wallet for testing
- Basic understanding of:
  - JavaScript/ES6+
  - Solana blockchain
  - RESTful APIs
  - PostgreSQL

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cypher-portfolio.git
   cd cypher-portfolio
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Set up development environment**
   ```bash
   # Copy environment template
   cp .env.example .env.development
   
   # Start development services
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

4. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend (if using build tools)
   cd ../frontend && npm install
   ```

## 📝 Development Workflow

### 1. Making Changes

- **Write clean code**: Follow the existing code style
- **Comment your code**: Especially complex logic
- **Update documentation**: Keep README and inline docs current
- **Add tests**: All new features should have tests

### 2. Code Style

We use ESLint and Prettier for code formatting:

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

**JavaScript Style Guide:**
- Use ES6+ features
- Prefer `const` over `let`
- Use meaningful variable names
- Keep functions small and focused
- Use async/await over callbacks

**Example:**
```javascript
// Good
const calculatePortfolioValue = async (tokens) => {
  const prices = await fetchTokenPrices(tokens);
  return tokens.reduce((total, token) => {
    return total + (token.amount * prices[token.id]);
  }, 0);
};

// Bad
function calc(t) {
  return new Promise((resolve) => {
    getPrice(t, (p) => {
      let sum = 0;
      for(let i = 0; i < t.length; i++) {
        sum += t[i].amt * p[t[i].id];
      }
      resolve(sum);
    });
  });
}
```

### 3. Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(wallet): add multi-wallet support
fix(auth): resolve token refresh issue
docs(api): update endpoint documentation
```

### 4. Testing

**Write tests for:**
- New features
- Bug fixes
- Edge cases
- API endpoints

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=wallet.test.js

# Run tests in watch mode
npm run test:watch
```

**Test Structure:**
```javascript
describe('WalletManager', () => {
  describe('connect()', () => {
    it('should connect to Phantom wallet', async () => {
      // Arrange
      const mockWallet = createMockPhantomWallet();
      
      // Act
      const result = await walletManager.connect('phantom');
      
      // Assert
      expect(result).toBe(true);
      expect(walletManager.isConnected()).toBe(true);
    });
    
    it('should handle connection errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

### 5. Documentation

- Update README.md for significant changes
- Add JSDoc comments for new functions
- Update API documentation
- Include examples for complex features

**JSDoc Example:**
```javascript
/**
 * Calculates risk score for a portfolio
 * @param {Array<Token>} tokens - Array of token holdings
 * @param {number} totalValue - Total portfolio value in USD
 * @returns {Object} Risk assessment with score and breakdown
 * @example
 * const risk = calculateRiskScore(tokens, 10000);
 * console.log(risk.score); // 45
 */
const calculateRiskScore = (tokens, totalValue) => {
  // Implementation
};
```

## 🔄 Pull Request Process

1. **Before submitting:**
   - Ensure all tests pass
   - Update documentation
   - Run linter and fix issues
   - Test manually in browser
   - Check for console errors

2. **Pull Request Template:**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Manual testing completed
   - [ ] No console errors
   
   ## Screenshots (if applicable)
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests added/updated
   ```

3. **Review Process:**
   - PRs require at least one approval
   - Address review comments promptly
   - Keep PRs focused and small
   - Squash commits before merging

## 🏗️ Architecture Guidelines

### Frontend Structure
```
frontend/
├── modules/         # Core functionality
│   ├── wallet.js   # Blockchain interactions
│   ├── api.js      # API communication
│   └── ui.js       # UI updates
├── components/      # Reusable UI components
├── utils/          # Helper functions
└── styles/         # CSS modules
```

### Backend Structure
```
backend/
├── routes/         # API route handlers
├── services/       # Business logic
├── models/         # Database models
├── middleware/     # Express middleware
└── utils/          # Helper functions
```

### Best Practices

1. **Security First**
   - Never commit API keys
   - Validate all inputs
   - Use parameterized queries
   - Implement rate limiting

2. **Performance**
   - Cache expensive operations
   - Optimize database queries
   - Use pagination for lists
   - Implement lazy loading

3. **Error Handling**
   - Always catch errors
   - Provide meaningful messages
   - Log errors appropriately
   - Graceful degradation

## 🐛 Reporting Issues

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs
- Environment details

**Template:**
```markdown
**Describe the bug**
A clear description of the bug

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 100]
- Wallet: [e.g., Phantom 1.0]
```

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions
- Additional context

## 🎯 Areas for Contribution

### High Priority
- [ ] Mobile app development
- [ ] Additional blockchain integrations
- [ ] Advanced trading features
- [ ] Performance optimizations
- [ ] Security audits

### Good First Issues
- [ ] UI/UX improvements
- [ ] Documentation updates
- [ ] Test coverage expansion
- [ ] Bug fixes
- [ ] Translation support

### Feature Ideas
- Copy trading implementation
- NFT portfolio tracking
- DeFi yield tracking
- Tax reporting
- Social features expansion

## 📚 Resources

### Learning Resources
- [Solana Documentation](https://docs.solana.com/)
- [Web3.js Guide](https://solana-labs.github.io/solana-web3.js/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)

### Development Tools
- [Solana Explorer](https://explorer.solana.com/)
- [Phantom Wallet](https://phantom.app/)
- [Postman](https://www.postman.com/) - API testing
- [pgAdmin](https://www.pgadmin.org/) - Database management

## 🙏 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation
- Eligible for future rewards program

## 💬 Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/cypher)
- **GitHub Issues**: For bug reports and features
- **Email**: dev@cypher.finance
- **Twitter**: [@cypherfinance](https://twitter.com/cypherfinance)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Cypher! 🚀