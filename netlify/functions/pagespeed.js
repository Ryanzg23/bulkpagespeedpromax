export async function handler(event) {
  try {
    const { url, strategy } = JSON.parse(event.body || "{}");
    if (!url || !strategy) {
      return {
        statusCode: 400,
        body: JSON.stringify({ type: "error", message: "Invalid request" })
      };
    }

    let finalUrl = url.startsWith("http") ? url : "https://" + url;

    /* ---------------- 301 DETECTION (SERVER-SIDE) ---------------- */

    try {
      const headRes = await fetch(finalUrl, {
        method: "HEAD",
        redirect: "manual"
      });

      if ([301, 302, 307, 308].includes(headRes.status)) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            type: "redirect",
            status: headRes.status,
            location: headRes.headers.get("location")
          })
        };
      }
    } catch {
      // ignore HEAD failures, continue to PSI
    }

    /* ---------------- PSI ---------------- */

    const apiKey = process.env.PSI_API_KEY;
    const apiUrl =
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
      `?url=${encodeURIComponent(finalUrl)}` +
      `&strategy=${strategy}&key=${apiKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!res.ok || !data.lighthouseResult) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          type: "cloned"
        })
      };
    }

    const audits = data.lighthouseResult.audits || {};
    const get = id => audits[id]?.displayValue || "N/A";

    return {
      statusCode: 200,
      body: JSON.stringify({
        type: "ok",
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

  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({ type: "cloned" })
    };
  }
}
