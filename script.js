async function checkUrl(url, results) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<strong>${url}</strong><div>Checking…</div>`;
  results.appendChild(card);

  try {
    const res = await fetch("/.netlify/functions/pagespeed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        strategy: "mobile"
      })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || "Failed");
    }

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
      <div class="error">${e.message}</div>
    `;
  }
}
