/* -------------------------------------------------
   Helpers
------------------------------------------------- */

function getRootDomain(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* -------------------------------------------------
   Handler
------------------------------------------------- */

export async function handler(event) {
  try {
    const { url, strategy } = JSON.parse(event.body || "{}");

    if (!url || !strategy) {
      return {
        statusCode: 400,
        body: JSON.stringify({ type: "error", message: "Invalid request" })
      };
    }

    const finalUrl = url.startsWith("http") ? url : "https://" + url;

    /* ---------------------------------------------
       1️⃣ REDIRECT DETECTION (ROOT-DOMAIN AWARE)
       - http ↔ https  ❌ ignore
       - www ↔ non-www ❌ ignore
       - domain → other domain ✅ 301
    --------------------------------------------- */

    try {
      const headRes = await fetch(finalUrl, {
        method: "HEAD",
        redirect: "manual"
      });

      if ([301, 302, 307, 308].includes(headRes.status)) {
        const location = headRes.headers.get("location");

        if (location) {
          const absoluteLocation = location.startsWith("http")
            ? location
            : new URL(location, finalUrl).href;

          const fromRoot = getRootDomain(finalUrl);
          const toRoot = getRootDomain(absoluteLocation);

          // ✅ Only mark 301 if ROOT DOMAIN CHANGES
          if (fromRoot && toRoot && fromRoot !== toRoot) {
            return {
              statusCode: 200,
              body: JSON.stringify({
                type: "redirect",
                from: finalUrl,
                to: absoluteLocation
              })
            };
          }
        }
      }
    } catch {
      // Ignore redirect detection errors and continue
    }

    /* ---------------------------------------------
       2️⃣ PAGE SPEED INSIGHTS
    --------------------------------------------- */

    const apiKey = process.env.PSI_API_KEY;

    const apiUrl =
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
      `?url=${encodeURIComponent(finalUrl)}` +
      `&strategy=${strategy}` +
      `&key=${apiKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    // PSI failed / blocked / unusable → treat as cloned
    if (!res.ok || !data.lighthouseResult) {
      return {
        statusCode: 200,
        body: JSON.stringify({ type: "cloned" })
      };
    }

    const audits = data.lighthouseResult.audits || {};
    const getAudit = (id) => audits[id]?.displayValue || "N/A";

    return {
      statusCode: 200,
      body: JSON.stringify({
        type: "ok",
        score: Math.round(
          data.lighthouseResult.categories.performance.score * 100
        ),
        metrics: {
          lcp: getAudit("largest-contentful-paint"),
          cls: getAudit("cumulative-layout-shift"),
          inp: getAudit("interaction-to-next-paint")
        }
      })
    };

  } catch {
    // Any unexpected error → cloned (PSI unusable)
    return {
      statusCode: 200,
      body: JSON.stringify({ type: "cloned" })
    };
  }
}
