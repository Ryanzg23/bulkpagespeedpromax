let completed = 0;
let total = 0;

/* ---------------- ENTRY ---------------- */

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

  for (const url of urls) {
    await createCard(url, results);
    completed++;
    updateProgress();
  }
}

/* ---------------- PROGRESS ---------------- */

function updateProgress() {
  const bar = document.getElementById("progressBar");
  const percent = total ? Math.round((completed / total) * 100) : 0;
  bar.style.width = percent + "%";
  bar.textContent = `${completed} / ${total}`;
}

/* ---------------- CARD FLOW ---------------- */

function createCard(url, results) {
  const card = document.createElement("div");
  card.className = "card";
  results.appendChild(card);
  return runCheck(url, card);
}

async function runCheck(url, card) {
  card.innerHTML = `<div class="domain">${url}</div><div>Checking…</div>`;

  const mobile = await fetchPSI(url, "mobile");

  /* ---------- 301 DOMAIN ---------- */
  if (mobile.type === "redirect") {
    const from = new URL(mobile.from).hostname.replace(/^www\./, "");
    const to = new URL(mobile.to).hostname.replace(/^www\./, "");

    const link = getFallbackLink(url);

    card.innerHTML = `
      <div class="domain">
        ${from}
        <span class="badge redirect">301</span>
      </div>
      <div style="font-size:13px;color:#1e40af;">→ ${to}</div>
      <div class="error">
        301 domain detected.<br>
        PageSpeed checking skipped.
      </div>
      <div class="actions">
        <a href="${link}" target="_blank">PageSpeed Result</a>
        <button onclick="copyCustomLink('${link}', this)">Copy Link</button>
      </div>
    `;
    return;
  }

  /* ---------- CLONED ---------- */
  if (mobile.type === "cloned") {
    const link = getFallbackLink(url);

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
        <a href="${link}" target="_blank">PageSpeed Result</a>
        <button onclick="copyCustomLink('${link}', this)">Copy Link</button>
      </div>
    `;
    return;
  }

  /* ---------- DESKTOP PSI ---------- */
  const desktop = await fetchPSI(url, "desktop");

  const reportLink = mobile.reportUrl || getFallbackLink(url);

  card.innerHTML = `
    <div class="domain">${url}</div>

    <div class="scores">
      ${scoreBox("Mobile", mobile.score)}
      ${scoreBox("Desktop", desktop.score)}
    </div>

    <div class="metrics">
      <strong>Mobile</strong><br>
      LCP: ${mobile.metrics.lcp} |
      CLS: ${mobile.metrics.cls} |
      INP: ${mobile.metrics.inp}
      <br><br>
      <strong>Desktop</strong><br>
      LCP: ${desktop.metrics.lcp} |
      CLS: ${desktop.metrics.cls} |
      INP: ${desktop.metrics.inp}
    </div>

    <div class="actions">
      <a href="${reportLink}" target="_blank">PageSpeed Result</a>
      <button onclick="copyCustomLink('${reportLink}', this)">Copy Link</button>
    </div>
  `;
}

/* ---------------- FETCH ---------------- */

async function fetchPSI(url, strategy) {
  const res = await fetch("/.netlify/functions/pagespeed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, strategy })
  });
  return await res.json();
}

/* ---------------- LINK HELPERS ---------------- */

function getFallbackLink(url) {
  if (!url.startsWith("http")) url = "https://" + url;
  return `https://pagespeed.web.dev/report?url=${encodeURIComponent(url)}`;
}

function copyCustomLink(link, btn) {
  navigator.clipboard.writeText(link).then(() => {
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1200);
  });
}

/* ---------------- UI HELPERS ---------------- */

function scoreBox(label, score) {
  const color = score >= 90 ? "green" : score >= 50 ? "yellow" : "red";
  return `
    <div class="score-box ${color}">
      ${score}
      <div class="label">${label}</div>
    </div>
  `;
}
