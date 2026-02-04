const CONCURRENCY = 1;
let completed = 0;
let total = 0;

const CLONE_KEYWORDS = [
  "slot", "slots", "gacor", "resmi", "apk", "jaya",
  "login", "maxwin", "rtp", "hoki"
];

const CLONE_TLDS = [".xyz", ".org", ".top", ".site"];

function isLikelyCloned(url) {
  const u = url.toLowerCase();

  if (CLONE_KEYWORDS.some(k => u.includes(k))) return true;
  if (CLONE_TLDS.some(tld => u.endsWith(tld))) return true;

  return false;
}


async function run() {
  const urls = document.getElementById("urls").value
    .split("\n")
    .map(u => u.trim())
    .filter(Boolean);

  total = urls.length;
  completed = 0;
  updateProgress();

  const results = document.getElementById("results");
  results.innerHTML = "";

  const queue = [...urls];
  const workers = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(queue, results));
  }

  await Promise.all(workers);
}

async function worker(queue, results) {
  while (queue.length) {
    await createCard(queue.shift(), results);
    completed++;
    updateProgress();
  }
}

function updateProgress() {
  const bar = document.getElementById("progressBar");
  const percent = total ? Math.round((completed / total) * 100) : 0;
  bar.style.width = percent + "%";
  bar.textContent = `${completed} / ${total}`;
}

/* ---------------- CARD HANDLING ---------------- */

function createCard(url, results) {
  const card = document.createElement("div");
  card.className = "card";
  results.appendChild(card);
  return runCheck(url, card);
}

async function runCheck(url, card) {
  // 🚫 AUTO-SKIP CLONED SITES
  if (isLikelyCloned(url)) {
    card.innerHTML = `
      <div class="domain">
        ${url}
        <span class="badge cloned">Cloned</span>
      </div>

      <div class="error">
        PageSpeed too low – likely a cloned site.<br>
        PageSpeed checking skipped.
      </div>

      <div class="actions">
        <button onclick="openPSI('${url}','mobile')">Open PageSpeed</button>
      </div>
    `;
    return;
  }

  // NORMAL PSI FLOW
  card.innerHTML = `
    <div class="domain">${url}</div>
    <div>Checking PageSpeed…</div>
  `;

  try {
    const mobile = await fetchPSI(url, "mobile");
    const desktop = await fetchPSI(url, "desktop");

    card.innerHTML = `
      <div class="domain">${url}</div>

      <div class="scores">
        ${scoreBox("Mobile", mobile.score)}
        ${scoreBox("Desktop", desktop.score)}
      </div>

      <div class="metrics">
        <strong>Mobile</strong><br>
        LCP: ${mobile.metrics.lcp} | CLS: ${mobile.metrics.cls} | INP: ${mobile.metrics.inp}
        <br><br>
        <strong>Desktop</strong><br>
        LCP: ${desktop.metrics.lcp} | CLS: ${desktop.metrics.cls} | INP: ${desktop.metrics.inp}
      </div>

      <div class="actions">
        <button onclick="retryCard('${url}', this)">Retry</button>
        <button onclick="openPSI('${url}','mobile')">Open Mobile</button>
        <button onclick="openPSI('${url}','desktop')">Open Desktop</button>
      </div>
    `;
  } catch (err) {
    handlePsiFailure(url, card, err.message);
  }
}
}

/* ---------------- ERROR CLASSIFICATION ---------------- */

function handlePsiFailure(url, card, message) {
  const lower = message.toLowerCase();

  const isTimeout =
    lower.includes("timeout") ||
    lower.includes("sandbox") ||
    lower.includes("timed out");

  if (isTimeout) {
    card.innerHTML = `
      <div class="domain">${url}</div>
      <div class="error">
        PageSpeed too low – likely a cloned site.<br>
        PageSpeed checking skipped.
      </div>

      <div class="actions">
        <button onclick="retryCard('${url}', this)">Retry</button>
        <button onclick="openPSI('${url}','mobile')">Open PageSpeed</button>
      </div>
    `;
  } else {
    card.innerHTML = `
      <div class="domain">${url}</div>
      <div class="error">${message}</div>

      <div class="actions">
        <button onclick="retryCard('${url}', this)">Retry</button>
      </div>
    `;
  }
}

/* ---------------- RETRY (SAME CARD) ---------------- */

function retryCard(url, btn) {
  const card = btn.closest(".card");
  runCheck(url, card);
}

/* ---------------- PSI FETCH ---------------- */

async function fetchPSI(url, strategy) {
  const res = await fetch("/.netlify/functions/pagespeed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, strategy })
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);

  const data = JSON.parse(text);
  if (data.error) throw new Error(data.error);
  return data;
}

/* ---------------- UTIL ---------------- */

function openPSI(url, strategy) {
  if (!url.startsWith("http")) url = "https://" + url;
  window.open(
    `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}&form_factor=${strategy}`,
    "_blank"
  );
}

function scoreBox(label, score) {
  const color = score >= 90 ? "green" : score >= 50 ? "yellow" : "red";
  return `
    <div class="score-box ${color}">
      ${score}
      <div class="label">${label}</div>
    </div>
  `;
}


