// GitHub Analyzer — Frontend App

const $ = id => document.getElementById(id);

// Screen management
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const screen = $(id);
  screen.style.display = 'flex';
  // force reflow then add class for transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => screen.classList.add('active'));
  });
}

// Error toast
let toastTimer;
function showError(msg) {
  const toast = $('error-toast');
  $('error-message').textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
}

// Token toggle
$('token-toggle').addEventListener('click', () => {
  const wrap = $('token-wrap');
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
});

// Example chips
document.querySelectorAll('.example-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    $('repo-input').value = chip.dataset.url;
    $('repo-input').focus();
  });
});

// Enter key support
$('repo-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') analyzeRepo();
});

$('analyze-btn').addEventListener('click', analyzeRepo);
$('back-btn').addEventListener('click', () => showScreen('home-screen'));

// Loading steps animation
const STEPS = ['step-1', 'step-2', 'step-3', 'step-4'];
let stepTimer;

function animateLoadingSteps() {
  let i = 0;
  STEPS.forEach(id => {
    const el = $(id);
    el.className = 'loading-step';
  });
  $(STEPS[0]).classList.add('active');

  stepTimer = setInterval(() => {
    if (i < STEPS.length - 1) {
      $(STEPS[i]).classList.remove('active');
      $(STEPS[i]).classList.add('done');
      i++;
      $(STEPS[i]).classList.add('active');
    }
  }, 600);
}

function stopLoadingSteps() {
  clearInterval(stepTimer);
  STEPS.forEach(id => {
    $(id).classList.remove('active');
    $(id).classList.add('done');
  });
}

// Main analyze function
async function analyzeRepo() {
  const url = $('repo-input').value.trim();
  const token = $('token-input').value.trim();

  if (!url) {
    showError('Please paste a GitHub repository URL.');
    return;
  }
  if (!url.includes('github.com')) {
    showError('That doesn\'t look like a GitHub URL. Try: https://github.com/owner/repo');
    return;
  }

  $('analyze-btn').disabled = true;
  showScreen('loading-screen');
  animateLoadingSteps();

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, token }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Analysis failed.');
    }

    stopLoadingSteps();
    await new Promise(r => setTimeout(r, 400));
    renderResults(json.data);
    showScreen('results-screen');

  } catch (err) {
    showScreen('home-screen');
    showError(err.message || 'Something went wrong. Check the URL and try again.');
  } finally {
    $('analyze-btn').disabled = false;
  }
}

// Formatting helpers
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function getDifficultyClass(score) {
  if (score <= 3) return 'easy';
  if (score <= 6) return 'medium';
  return 'hard';
}

function getDifficultyLabel(score) {
  if (score <= 3) return 'Beginner Friendly';
  if (score <= 5) return 'Moderate';
  if (score <= 7) return 'Advanced';
  return 'Expert Level';
}

// Render results dashboard
function renderResults(d) {
  const diffClass = getDifficultyClass(d.difficulty);
  const diffPct = (d.difficulty / 10) * 100;
  const [owner, repoName] = d.name.split('/');
  const repoUrl = `https://github.com/${d.name}`;

  const html = `
    <!-- Repo title bar -->
    <div class="repo-title-bar fade-in">
      <div class="repo-path">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
        <a href="${repoUrl}" target="_blank">${owner}</a>
        <span style="color:var(--border-hover)">/</span>
        <a href="${repoUrl}" target="_blank">${repoName}</a>
      </div>
      <h1 class="repo-main-title">${repoName}</h1>
      <p class="repo-description">${d.description}</p>
      ${d.topics.length ? `
        <div class="topic-chips">
          ${d.topics.slice(0, 8).map(t => `<span class="topic-chip">${t}</span>`).join('')}
        </div>
      ` : ''}
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">

      <!-- Overview Stats -->
      <div class="card col-4 fade-in" style="animation-delay:0.05s">
        <div class="card-label"><span class="card-label-dot"></span>Repository Overview</div>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value diff-${getDifficultyClass(d.difficulty)}">${d.difficulty}<span style="font-size:16px;color:var(--text-muted);font-weight:500">/10</span></div>
           <div class="stat-label">Difficulty</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${formatNumber(d.forks)}</div>
            <div class="stat-label">Forks</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${formatNumber(d.watchers)}</div>
            <div class="stat-label">Watchers</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${d.openIssues}</div>
            <div class="stat-label">Open Issues</div>
          </div>
        </div>
        <div class="meta-row">
          <div class="meta-item">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Updated ${timeAgo(d.updatedAt)}
          </div>
          <div class="meta-item">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
            ${d.license}
          </div>
          <div class="meta-item">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M18.4 6.4 20 8l-1.6 1.6M5.6 6.4 4 8l1.6 1.6M12 4V2M12 22v-2M20 12h2M2 12h2"/></svg>
            ${Math.round(d.size / 1024)} MB
          </div>
        </div>
      </div>

      <!-- Tech Stack -->
      <div class="card col-4 fade-in" style="animation-delay:0.1s">
        <div class="card-label"><span class="card-label-dot"></span>Tech Stack</div>
        <div class="lang-list" id="lang-list">
          ${Object.entries(d.languages).slice(0, 7).map(([lang, pct], i) => `
            <div class="lang-row">
              <div class="lang-meta">
                <span class="lang-name">${lang}</span>
                <span class="lang-pct">${pct}%</span>
              </div>
              <div class="lang-track">
                <div class="lang-fill lang-color-${i % 8}" data-pct="${pct}"></div>
              </div>
            </div>
          `).join('')}
          ${Object.keys(d.languages).length === 0 ? '<p style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px">No language data available</p>' : ''}
        </div>
      </div>

      <!-- Difficulty Score -->
      <div class="card col-4 fade-in" style="animation-delay:0.15s">
        <div class="card-label"><span class="card-label-dot"></span>Project Difficulty</div>
        <div class="difficulty-display">
          <span class="difficulty-number diff-${diffClass}">${d.difficulty}</span>
          <span class="difficulty-denom">/ 10</span>
        </div>
        <div class="difficulty-bar-track">
          <div class="difficulty-bar-fill diff-${diffClass}-bar" data-pct="${diffPct}"></div>
        </div>
        <div class="difficulty-label">${getDifficultyLabel(d.difficulty)}</div>
      </div>

      <!-- Activity -->
      <div class="card col-6 fade-in" style="animation-delay:0.2s">
        <div class="card-label"><span class="card-label-dot"></span>Activity</div>
        <div class="activity-badge ${d.activityLevel}">
          <span class="activity-dot"></span>
          ${d.activityLevel.toUpperCase()} ACTIVITY
        </div>
        <div class="activity-stats">
          <div class="activity-stat">
            <div class="activity-stat-value">${formatNumber(d.commits)}</div>
            <div class="activity-stat-label">Total Commits</div>
          </div>
          <div class="activity-stat">
            <div class="activity-stat-value">${d.contributorsCount}</div>
            <div class="activity-stat-label">Contributors</div>
          </div>
          <div class="activity-stat">
            <div class="activity-stat-value">${formatDate(d.createdAt).split(',')[1]?.trim() || formatDate(d.createdAt)}</div>
            <div class="activity-stat-label">Created</div>
          </div>
        </div>
      </div>

      <!-- Top Contributors -->
      <div class="card col-6 fade-in" style="animation-delay:0.25s">
        <div class="card-label"><span class="card-label-dot"></span>Top Contributors</div>
        ${d.topContributors.length ? `
          <div class="contributors-list">
            ${d.topContributors.map((c, i) => {
              const maxC = d.topContributors[0].contributions;
              const barPct = Math.round((c.contributions / maxC) * 100);
              return `
                <div class="contributor-row">
                  <div class="contributor-avatar">
                    ${c.avatar
                      ? `<img src="${c.avatar}" alt="${c.login}" loading="lazy" />`
                      : c.login.substring(0, 2).toUpperCase()
                    }
                  </div>
                  <span class="contributor-name">${c.login}</span>
                  <div class="contributor-bar-wrap">
                    <div class="contributor-bar" style="width:${barPct}%"></div>
                  </div>
                  <span class="contributor-commits">${formatNumber(c.contributions)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : '<p style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px">No contributor data available</p>'}
      </div>

      <!-- Quick Summary -->
      <div class="card col-12 fade-in" style="animation-delay:0.3s">
        <div class="card-label"><span class="card-label-dot"></span>Quick Summary</div>
        <p class="summary-text">${buildSummary(d)}</p>
      </div>

    </div>
  `;

  const container = $('results-container');
  container.innerHTML = html;
  container.scrollTop = 0;

  // Animate bars after render
  requestAnimationFrame(() => {
    setTimeout(() => {
      // Language bars
      document.querySelectorAll('.lang-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
      // Difficulty bar
      const diffBar = document.querySelector('.difficulty-bar-fill');
      if (diffBar) diffBar.style.width = diffBar.dataset.pct + '%';
    }, 150);
  });
}

// Build a human-readable summary
function buildSummary(d) {
  const [owner, repoName] = d.name.split('/');
  const langCount = Object.keys(d.languages).length;
  const topLang = Object.keys(d.languages)[0] || 'multiple languages';
  const diffLabel = getDifficultyLabel(d.difficulty).toLowerCase();
  const age = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365));
  const ageStr = age < 1 ? 'less than a year' : age === 1 ? 'about 1 year' : `about ${age} years`;

  let summary = `<strong>${repoName}</strong> by <strong>${owner}</strong> is a ${diffLabel} project `;
  summary += `primarily written in <strong>${topLang}</strong>`;
  if (langCount > 1) summary += ` across ${langCount} languages`;
  summary += `. The repository has been active for ${ageStr} `;
  summary += `and has accumulated <strong>${formatNumber(d.commits)} commits</strong> `;
  summary += `from <strong>${d.contributorsCount} contributor${d.contributorsCount !== 1 ? 's' : ''}</strong>. `;
  summary += `With <strong>★ ${formatNumber(d.stars)} stars</strong>, it has `;
  summary += d.stars > 10000 ? 'significant community adoption. ' : d.stars > 1000 ? 'a solid community following. ' : 'a growing community. ';

  if (d.summary && d.summary !== 'No description available.' && d.summary !== d.description) {
    summary += `<br/><br/>${d.summary}`;
  } else if (d.description) {
    summary += `<br/><br/>${d.description}`;
  }

  return summary;
}

// Init
showScreen('home-screen');
