# GitHub Project Analyzer

A clean, minimal developer tool to analyze any GitHub repository — built with Node.js, Express, and vanilla JS.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v16 or higher
- npm

### Installation

```bash
# 1. Navigate into the project folder
cd github-analyzer

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

---

## 📁 Folder Structure

```
github-analyzer/
├── server.js              # Express backend + GitHub API logic
├── package.json
├── README.md
└── public/
    ├── index.html          # Single-page app shell
    ├── css/
    │   └── style.css       # Dark theme styles
    └── js/
        └── app.js          # Frontend logic
```

---

## 🔑 GitHub Token (Optional)

The GitHub API allows ~60 requests/hour without authentication. For higher limits (5000/hr):

1. Go to https://github.com/settings/tokens
2. Generate a new token (classic) with no special scopes required
3. Paste it into the "Add GitHub Token" field on the app

---

## 🧠 How the Difficulty Score Works

The score (1–10) is computed from:

| Factor | Points |
|---|---|
| Commits ≥ 1000 | +3 |
| Commits ≥ 300 | +2 |
| Commits ≥ 50 | +1 |
| Contributors ≥ 20 | +2 |
| Contributors ≥ 5 | +1 |
| Languages ≥ 6 | +2 |
| Languages ≥ 3 | +1 |
| Repo size ≥ 50MB | +2 |
| Repo size ≥ 5MB | +1 |
| Stars ≥ 1000 | +1 |

---

## Features

- Repository overview (stars, forks, issues, license)
- Language breakdown with animated bars
- Commit count + contributor list with avatars
- Difficulty score (1–10) with visual gauge
- Activity level (Low / Medium / High)
- Auto-generated project summary from README/description
- GitHub token support for higher API limits
- Quick-try example repos

---

Built with Node.js · Express · Vanilla JS · GitHub REST API
