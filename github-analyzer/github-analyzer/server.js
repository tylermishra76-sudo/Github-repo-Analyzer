

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Parse GitHub URL to extract owner/repo
function parseGitHubUrl(url) {
  try {
    const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

// Calculate difficulty score 1–10
function calculateDifficulty(data) {
  let score = 1;

  // Commits factor (up to 3 points)
  if (data.commits >= 1000) score += 3;
  else if (data.commits >= 300) score += 2;
  else if (data.commits >= 50) score += 1;

  // Contributors factor (up to 2 points)
  if (data.contributorsCount >= 20) score += 2;
  else if (data.contributorsCount >= 5) score += 1;

  // Languages factor (up to 2 points)
  const langCount = Object.keys(data.languages).length;
  if (langCount >= 6) score += 2;
  else if (langCount >= 3) score += 1;

  // Repo size factor (up to 2 points)
  if (data.size >= 50000) score += 2;
  else if (data.size >= 5000) score += 1;

  // Stars factor (up to 1 point)
  if (data.stars >= 1000) score += 1;

  return Math.min(10, Math.max(1, score));
}

// Activity level based on commits and recency
function getActivityLevel(commits, updatedAt) {
  const daysSinceUpdate = (Date.now() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
  if (commits > 500 && daysSinceUpdate < 30) return 'high';
  if (commits > 100 || daysSinceUpdate < 90) return 'medium';
  return 'low';
}

// GitHub API helper
async function githubFetch(url, token) {
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'github-analyzer' };
  if (token) headers['Authorization'] = `token ${token}`;
const res = await fetch(url, {
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`
  }
});  if (res.status === 404) throw new Error('Repository not found');
  if (res.status === 403) throw new Error('API rate limit exceeded. Try again later.');
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
const token = req.body.token?.trim() || null;

  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const parsed = parseGitHubUrl(url);
  if (!parsed) return res.status(400).json({ error: 'Invalid GitHub URL. Format: https://github.com/owner/repo' });

  const { owner, repo } = parsed;
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    // Fetch all data in parallel
    const [repoData, languagesData, contributorsData, commitsData, readmeData] = await Promise.allSettled([
      githubFetch(base, token),
      githubFetch(`${base}/languages`, token),
      githubFetch(`${base}/contributors?per_page=100&anon=true`, token),
      githubFetch(`${base}/commits?per_page=1`, token),
      githubFetch(`${base}/readme`, token),
    ]);

    if (repoData.status === 'rejected') throw new Error(repoData.reason.message);

    const repo_info = repoData.value;
    const languages = languagesData.status === 'fulfilled' ? languagesData.value : {};
    const contributors = contributorsData.status === 'fulfilled' && Array.isArray(contributorsData.value)
      ? contributorsData.value : [];
    const contributorsCount = contributors.length;

    // Get commit count from Link header or use a fallback fetch
    let commitCount = 0;
    try {
      const commitRes = await fetch(`${base}/commits?per_page=1`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'github-analyzer',
          ...(token ? { 'Authorization': `token ${token}` } : {})
        }
      });
      const linkHeader = commitRes.headers.get('link');
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match) commitCount = parseInt(match[1]);
      }
      if (!commitCount) {
        const commitData = await commitRes.json();
        commitCount = Array.isArray(commitData) ? commitData.length : 1;
      }
    } catch {
      commitCount = repo_info.size > 0 ? Math.floor(repo_info.size / 10) : 0;
    }

    // Decode README
    let readmeSummary = repo_info.description || 'No description available.';
    if (readmeData.status === 'fulfilled' && readmeData.value.content) {
      try {
        const decoded = Buffer.from(readmeData.value.content, 'base64').toString('utf-8');
        const lines = decoded.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('!') && !l.startsWith('<'));
        if (lines.length > 0) {
          readmeSummary = lines[0].replace(/[*_`[\]]/g, '').trim();
          if (readmeSummary.length > 300) readmeSummary = readmeSummary.substring(0, 300) + '...';
        }
      } catch {}
    }

    // Language percentages
    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
    const languagePercentages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [lang, bytes]) => {
        acc[lang] = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;
        return acc;
      }, {});

    const analysisData = {
      name: repo_info.full_name,
      description: repo_info.description || 'No description provided.',
      stars: repo_info.stargazers_count,
      forks: repo_info.forks_count,
      watchers: repo_info.watchers_count,
      openIssues: repo_info.open_issues_count,
      defaultBranch: repo_info.default_branch,
      size: repo_info.size,
      createdAt: repo_info.created_at,
      updatedAt: repo_info.updated_at,
      license: repo_info.license ? repo_info.license.name : 'None',
      topics: repo_info.topics || [],
      languages: languagePercentages,
      commits: commitCount,
      contributorsCount,
      topContributors: contributors.slice(0, 5).map(c => ({
        login: c.login || 'anonymous',
        contributions: c.contributions,
        avatar: c.avatar_url || ''
      })),
      summary: readmeSummary,
    };

    analysisData.difficulty = calculateDifficulty(analysisData);
    analysisData.activityLevel = getActivityLevel(analysisData.commits, analysisData.updatedAt);

    res.json({ success: true, data: analysisData });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to analyze repository' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  GitHub Analyzer running at http://localhost:${PORT}\n`);
});
