# Cypher - Solana Portfolio Analytics

A modern, responsive web application for tracking Solana portfolios, whale movements, market data, and social trading features.

## Features

- 🔗 **Wallet Integration**: Connect with Phantom wallet
- 📊 **Portfolio Analytics**: Real-time portfolio tracking and performance charts
- 🐋 **Whale Tracking**: Monitor large transactions and follow successful wallets
- 🔔 **Price Alerts**: Set custom price alerts for tokens
- 🏆 **Achievement System**: 50+ achievements to unlock
- 👥 **Social Trading**: Leaderboards and community features
- 📱 **Responsive Design**: Works on desktop and mobile

## Project Structure

```
cypher-portfolio/
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── script.js           # JavaScript functionality
└── README.md          # This file
```

## Local Development

1. **Clone or download the files**
   - Create a new folder for your project
   - Save the three files (`index.html`, `styles.css`, `script.js`) in the folder

2. **Open locally**
   - Simply open `index.html` in your web browser
   - Or use a local server like Live Server (VS Code extension)

## Deploying to GitHub Pages

### Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"New"** button or **"+"** icon
3. Name your repository (e.g., `cypher-portfolio` or `solana-analytics`)
4. Make sure it's set to **Public**
5. ✅ Check **"Add a README file"**
6. Click **"Create repository"**

### Step 2: Upload Your Files

**Option A: Using GitHub Web Interface**
1. In your new repository, click **"Add file"** → **"Upload files"**
2. Drag and drop or select your files:
   - `index.html`
   - `styles.css`
   - `script.js`
3. Write a commit message like "Initial commit - Cypher Portfolio App"
4. Click **"Commit changes"**

**Option B: Using Git Command Line**
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
cd YOUR_REPOSITORY_NAME

# Add your files to the repository folder
# Copy index.html, styles.css, and script.js to this folder

# Add and commit files
git add .
git commit -m "Initial commit - Cypher Portfolio App"
git push origin main
```

### Step 3: Enable GitHub Pages

1. In your repository, click **"Settings"** (top menu)
2. Scroll down to **"Pages"** in the left sidebar
3. Under **"Source"**, select **"Deploy from a branch"**
4. Choose **"main"** branch and **"/ (root)"** folder
5. Click **"Save"**

### Step 4: Access Your Live Site

1. GitHub will show you the URL (usually `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY_NAME/`)
2. It may take a few minutes to deploy
3. Visit the URL to see your live portfolio analytics app!

## Customization Options

### Updating Content
- **App Name**: Change "Cypher" in `index.html` and update the logo
- **Colors**: Modify the gradient colors in `styles.css`
- **API Endpoints**: Update RPC endpoints in `script.js` for different networks

### Adding Features
- **Custom Tokens**: Modify the mock data in `script.js`
- **Additional Achievements**: Add to the `ACHIEVEMENTS` object
- **New Sections**: Add new tabs and sections to `index.html`

### Styling Changes
All styles are in `styles.css`:
- **Theme Colors**: Look for gradient definitions with `#ff6b6b` and `#4ecdc4`
- **Layout**: Modify grid templates and flexbox properties
- **Responsive**: Update media queries for different screen sizes

## Technical Features

- **No Build Process**: Pure HTML, CSS, and JavaScript
- **Responsive Design**: Works on all devices
- **Local Storage**: Saves user data (alerts, followed wallets, achievements)
- **Phantom Wallet Integration**: Connects to Solana wallets
- **Free APIs**: Uses public APIs with fallback mock data
- **Modern UI**: Glassmorphism design with smooth animations

## Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## Dependencies

All dependencies are loaded via CDN:
- [Chart.js](https://www.chartjs.org/) - For portfolio charts
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) - Blockchain interaction
- [Font Awesome](https://fontawesome.com/) - Icons

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Troubleshooting

### Common Issues

**1. GitHub Pages not updating**
- Wait 5-10 minutes after pushing changes
- Check the Actions tab for build status
- Ensure `index.html` is in the root directory

**2. Wallet connection issues**
- Install [Phantom Wallet](https://phantom.app/)
- Refresh the page and try again
- Check browser console for errors

**3. Styling not loading**
- Verify `styles.css` and `script.js` are in the same folder as `index.html`
- Check that file names match exactly (case-sensitive)

### Getting Help

1. **GitHub Issues**: Create an issue in your repository
2. **Community**: Ask on Solana Discord or Reddit
3. **Documentation**: Check Solana and Phantom wallet docs

## Roadmap

- [ ] Real token metadata integration
- [ ] Advanced portfolio analytics
- [ ] DeFi protocol integration
- [ ] Mobile app version
- [ ] Trading features
- [ ] Multi-wallet support

---

**Made with ❤️ for the Solana community**

*Remember to never share your private keys or seed phrases!*