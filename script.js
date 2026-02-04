const CONCURRENCY = 1;
let completed = 0;
let total = 0;

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
    await checkUrl(queue.shift(), results);
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

async function checkUrl(url, results) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<div class="domain">${url}</div><div>Checking mobile…</div>`;
  results.appendChild(card);

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
        <button onclick="retry('${url}')">Retry</button>
        <button onclick="openPSI('${url}','mobile')">Open Mobile</button>
        <button onclick="openPSI('${url}','desktop')">Open Desktop</button>
      </div>
    `;
  } catch (err) {
    card.innerHTML = `
      <div class="domain">${url}</div>
      <div class="error">${err.message}</div>
      <div class="actions">
        <button onclick="retry('${url}')">Retry</button>
      </div>
    `;
  }
}

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

function retry(url) {
  checkUrl(url, document.getElementById("results"));
}

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
