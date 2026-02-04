const cache = new Map();

export async function handler(event) {
  try {
    const { url, strategy } = JSON.parse(event.body || "{}");
    if (!url || !strategy) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
    }

    let finalUrl = url.startsWith("http") ? url : "https://" + url;
    const cacheKey = `${finalUrl}|${strategy}`;

    if (cache.has(cacheKey)) {
      return {
        statusCode: 200,
        body: JSON.stringify(cache.get(cacheKey))
      };
    }

    const apiKey = process.env.PSI_API_KEY;
    const apiUrl =
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
      `?url=${encodeURIComponent(finalUrl)}` +
      `&strategy=${strategy}&key=${apiKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data.error?.message }) };
    }

    const audits = data.lighthouseResult.audits || {};
    const get = id => audits[id]?.displayValue || "N/A";

    const result = {
      score: Math.round(data.lighthouseResult.categories.performance.score * 100),
      metrics: {
        lcp: get("largest-contentful-paint"),
        cls: get("cumulative-layout-shift"),
        inp: get("interaction-to-next-paint")
      }
    };

    cache.set(cacheKey, result);

    return { statusCode: 200, body: JSON.stringify(result) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
