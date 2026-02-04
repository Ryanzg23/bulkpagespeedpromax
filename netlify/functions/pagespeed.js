export async function handler(event) {
  try {
    const { url, strategy } = JSON.parse(event.body || "{}");

    if (!url || !strategy) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "URL and strategy required" })
      };
    }

    let finalUrl = url;
    if (!finalUrl.startsWith("http")) {
      finalUrl = "https://" + finalUrl;
    }

    const apiKey = process.env.PSI_API_KEY;

    const apiUrl =
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
      `?url=${encodeURIComponent(finalUrl)}` +
      `&strategy=${strategy}` +
      `&key=${apiKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({
          error: data?.error?.message || "PageSpeed failed"
        })
      };
    }

    const audits = data.lighthouseResult.audits || {};
    const get = (id) => audits[id]?.displayValue || "N/A";

    return {
      statusCode: 200,
      body: JSON.stringify({
        score: Math.round(
          data.lighthouseResult.categories.performance.score * 100
        ),
        metrics: {
          lcp: get("largest-contentful-paint"),
          cls: get("cumulative-layout-shift"),
          inp: get("interaction-to-next-paint")
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
