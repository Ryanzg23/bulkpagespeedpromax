function getRootDomain(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function handler(event) {
  try {
    const { url, strategy } = JSON.parse(event.body || "{}");
    if (!url || !strategy) {
      return {
        statusCode: 400,
        body: JSON.stringify({ type: "error" })
      };
    }

    const finalUrl = url.startsWith("http") ? url : "https://" + url;

    /* ---------- REDIRECT CHECK (ROOT DOMAIN CHANGE ONLY) ---------- */
    try {
      const head = await fetch(finalUrl, {
        method: "HEAD",
        redirect: "manual"
      });

      if ([301, 302, 307, 308].includes(head.status)) {
        const loc = head.headers.get("location");
        if (loc) {
          const abs = loc.startsWith("http")
            ? loc
            : new URL(loc, finalUrl).href;

          if (getRootDomain(finalUrl) !== getRootDomain(abs)) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                type: "redirect",
                from: finalUrl,
                to: abs
              })
            };
          }
        }
      }
    } catch {
      // ignore redirect detection errors
    }

    /* ---------- PAGE SPEED INSIGHTS ---------- */
    const apiUrl =
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
      `?url=${encodeURIComponent(finalUrl)}` +
      `&strategy=${strategy}` +
      `&key=${process.env.PSI_API_KEY}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    // PSI unusable → cloned
    if (!res.ok || !data.lighthouseResult) {
      return {
        statusCode: 200,
        body: JSON.stringify({ type: "cloned" })
      };
    }

    const audits = data.lighthouseResult.audits || {};
    const get = (id) => audits[id]?.displayValue || "N/A";

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
        },

        // ✅ BEST POSSIBLE RESULT LINK
        reportUrl:
          data.lighthouseResult.reportUrl ||
          `https://pagespeed.web.dev/report?url=${encodeURIComponent(finalUrl)}`
      })
    };

  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({ type: "cloned" })
    };
  }
}
