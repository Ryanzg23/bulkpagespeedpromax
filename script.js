const CONCURRENCY = 3;

async function run() {
  const urls = document
    .getElementById("urls")
    .value.split("\n")
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
  card.textContent = `Checking ${url}...`;
  results.appendChild(card);

  try {
    const res = await fetch("/.netlify/functions/pagespeed", {
      method: "POST",
      body: JSON.stringify({ url, strategy: "mobile" })
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);

    card.innerHTML = `
      <strong>${url}</strong>
      <div class="score ${scoreColor(data.score)}">${data.score}</div>
      <small>LCP: ${data.metrics.lcp}</small><br>
      <small>CLS: ${data.metrics.cls}</small><br>
      <small>INP: ${data.metrics.inp}</small>
    `;
  } catch (e) {
    card.innerHTML = `
      <strong>${url}</strong>
      <div class="error">Error</div>
    `;
  }
}

function scoreColor(score) {
  if (score >= 90) return "green";
  if (score >= 50) return "yellow";
  return "red";
}
