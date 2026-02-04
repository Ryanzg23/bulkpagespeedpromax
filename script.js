const CONCURRENCY = 1; // IMPORTANT: keep low

async function checkUrl(url, results) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<div class="domain">${url}</div><div>Checking mobile…</div>`;
  results.appendChild(card);

  try {
    const mobile = await fetchPSI(url, "mobile");

    card.innerHTML = `
      <div class="domain">${url}</div>
      <div>Mobile done… Checking desktop…</div>
    `;

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, strategy })
  });

  const text = await res.text();

  if (!res.ok) throw new Error(text);

  const data = JSON.parse(text);
  if (data.error) throw new Error(data.error);

  return data;
}
