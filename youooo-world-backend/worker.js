const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    try {
      if (url.pathname === "/api/quote") {
        return await handleQuote(url, env);
      }

      if (url.pathname === "/api/candles") {
        return await handleCandles(url, env);
      }

      if (url.pathname === "/api/alerts/subscribe" && request.method === "POST") {
        return await handleAlertSubscribe(request, env);
      }

      return json(
        { ok: false, error: "Not found", path: url.pathname },
        { status: 404 }
      );
    } catch (error) {
      return json(
        {
          ok: false,
          error: error.message || "Internal server error"
        },
        { status: 500 }
      );
    }
  }
};

async function handleQuote(url, env) {
  const symbol = (url.searchParams.get("symbol") || "NVDA").trim().toUpperCase();

  if (!env.FINNHUB_API_KEY) {
    return json(
      {
        ok: false,
        error: "FINNHUB_API_KEY is missing in backend worker secrets"
      },
      { status: 500 }
    );
  }

  const apiUrl =
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}` +
    `&token=${encodeURIComponent(env.FINNHUB_API_KEY)}`;

  const res = await fetch(apiUrl);

  if (!res.ok) {
    return json(
      {
        ok: false,
        error: `Finnhub quote request failed with status ${res.status}`
      },
      { status: 502 }
    );
  }

  const data = await res.json();

  if (data.error) {
    return json(
      {
        ok: false,
        error: data.error
      },
      { status: 502 }
    );
  }

  return json(data);
}

async function handleCandles(url, env) {
  const symbol = (url.searchParams.get("symbol") || "NVDA").trim().toUpperCase();

  if (!env.FINNHUB_API_KEY) {
    return json(
      {
        ok: false,
        error: "FINNHUB_API_KEY is missing in backend worker secrets"
      },
      { status: 500 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 60 * 60 * 24 * 45;

  const apiUrl =
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}` +
    `&resolution=D&from=${from}&to=${now}&token=${encodeURIComponent(env.FINNHUB_API_KEY)}`;

  const res = await fetch(apiUrl);

  if (!res.ok) {
    return json(
      {
        ok: false,
        error: `Finnhub candles request failed with status ${res.status}`
      },
      { status: 502 }
    );
  }

  const data = await res.json();

  if (data.s !== "ok" || !Array.isArray(data.c) || !Array.isArray(data.t)) {
    return json(
      {
        ok: false,
        error: "No candle data returned for this symbol"
      },
      { status: 404 }
    );
  }

  const startIndex = Math.max(0, data.c.length - 30);
  const points = data.c.slice(startIndex).map((close, i) => {
    const ts = data.t[startIndex + i];
    const d = new Date(ts * 1000);
    return {
      close,
      ts,
      label: `${d.getMonth() + 1}/${d.getDate()}`
    };
  });

  return json({
    ok: true,
    symbol,
    points
  });
}

async function handleAlertSubscribe(request, env) {
  const body = await request.json().catch(() => ({}));

  const email = String(body.email || "").trim().toLowerCase();
  const symbol = String(body.symbol || "NVDA").trim().toUpperCase();
  const alertType = String(body.alertType || "watchlist").trim();

  if (!email || !email.includes("@")) {
    return json(
      {
        ok: false,
        error: "Valid email is required"
      },
      { status: 400 }
    );
  }

  if (!env.ALERTS_KV) {
    return json(
      {
        ok: false,
        error: "ALERTS_KV binding is missing in backend worker"
      },
      { status: 500 }
    );
  }

  const record = {
    email,
    symbol,
    alertType,
    createdAt: new Date().toISOString()
  };

  const key = `alert:${email}:${symbol}:${alertType}`;
  await env.ALERTS_KV.put(key, JSON.stringify(record));

  return json({
    ok: true,
    message: "Alert signup saved",
    record
  });
}

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}