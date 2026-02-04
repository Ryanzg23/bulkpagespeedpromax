const CONCURRENCY = 1; // keep low to avoid PSI timeout

async function run() {
  const input = document.getElementById("urls").value;

  const urls = input
    .split("\n")
    .map(u => u.trim())
    .filter(Boolean);

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
    const url = queue.shift();
    await checkUrl(url, results);
  }
}

async function checkUrl(url, results) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="domain">${url}</div>
    <div>Checking mobile…</div>
  `;
  results.appendChild(card);

  try {
    // MOBILE FIRST
    const mobile = await fetchPSI(url, "mobile");

    card.innerHTML = `
      <div class="domain">${url}</div>
      <div>Mobile done… Checking desktop…</div>
    `;

    // DESKTOP SECOND
    const desktop = await fetchPSI(url, "desktop");

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
    `;
  } catch (err) {
    card.innerHTML = `
      <div class="domain">${url}</div>
      <div class="error">${err.message}</div>
    `;
  }
}

async function fetchPSI(url, strategy) {
  const res = await fetch("/.netlify/functions/pagespeed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url, strategy })
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Request failed");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from server");
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

function scoreBox(label, score) {
  const color =
    score >= 90 ? "green" :
    score >= 50 ? "yellow" :
    "red";

  return `
    <div class="score-box ${color}">
      ${score}
      <div class="label">${label}</div>
    </div>
  `;
}
