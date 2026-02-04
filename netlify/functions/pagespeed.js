export async function handler(event) {
  try {
    const { url, strategy } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "URL required" })
      };
    }

    const apiKey = process.env.PSI_API_KEY;

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&strategy=${strategy}&key=${apiKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "PSI error");
    }

    const lighthouse = data.lighthouseResult;

    const score = lighthouse.categories.performance.score * 100;

    return {
      statusCode: 200,
      body: JSON.stringify({
        score,
        metrics: {
          lcp: lighthouse.audits["largest-contentful-paint"].displayValue,
          cls: lighthouse.audits["cumulative-layout-shift"].displayValue,
          inp: lighthouse.audits["interaction-to-next-paint"].displayValue
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
