export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    let { url, strategy } = body;

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "URL required" })
      };
    }

    // Normalize URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const apiKey = process.env.PSI_API_KEY;

    const apiUrl =
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
      `?url=${encodeURIComponent(url)}` +
      `&strategy=${strategy || "mobile"}` +
      `&key=${apiKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({
          error: data?.error?.message || "PageSpeed API failed"
        })
      };
    }

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits || {};

    // ✅ SAFE ACCESS (no crashes)
    const getAudit = (id) =>
      audits[id]?.displayValue || "N/A";

    return {
      statusCode: 200,
      body: JSON.stringify({
        score: Math.round(lighthouse.categories.performance.score * 100),
        metrics: {
          lcp: getAudit("largest-contentful-paint"),
          cls: getAudit("cumulative-layout-shift"),
          inp: getAudit("interaction-to-next-paint")
        }
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
