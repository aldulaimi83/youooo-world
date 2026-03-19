const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

const WATCHLIST = ["SPY", "QQQ", "AMD", "NVDA", "TSLA", "AAPL", "MSFT", "META", "AMZN", "GOOGL"];

const JOB_KEYWORDS = [
  "layoff", "layoffs", "job cut", "job cuts", "workforce",
  "restructuring", "headcount", "hiring freeze", "staff reduction",
  "downsizing", "hiring slowdown", "cost cuts", "job reduction"
];

const AI_KEYWORDS = [
  "openai", "nvidia", "amd", "microsoft", "google", "meta",
  "artificial intelligence", "ai", "chip", "gpu", "inference",
  "training", "datacenter", "cloud ai", "model", "llm", "foundation model",
  "semiconductor", "accelerator", "deepseek", "anthropic"
];

const AI_NEGATIVE_KEYWORDS = [
  "automobile", "auto sales", "gas supply", "tourism", "election polling",
  "sports", "travel", "real estate"
];

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/health") {
        return json({
          ok: true,
          service: "youooo-world-api",
          time: new Date().toISOString()
        });
      }

      if (path === "/api/watchlist") {
        const data = await getWatchlist(env);
        return json({ ok: true, updatedAt: new Date().toISOString(), data });
      }

      if (path === "/api/movers") {
        const data = await getMovers(env);
        return json({ ok: true, updatedAt: new Date().toISOString(), data });
      }

      if (path === "/api/news") {
        const category = url.searchParams.get("category") || "general";
        const news = await getNews(env, category);
        return json({ ok: true, updatedAt: new Date().toISOString(), data: news });
      }

      if (path === "/api/jobs") {
        const jobs = await getJobsSignals(env);
        return json({ ok: true, updatedAt: new Date().toISOString(), data: jobs });
      }

      if (path === "/api/ai") {
        const ai = await getAISignals(env);
        return json({ ok: true, updatedAt: new Date().toISOString(), data: ai });
      }

      if (path === "/api/signals") {
        const signals = await getTopSignals(env);
        return json({ ok: true, updatedAt: new Date().toISOString(), data: signals });
      }

      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      return json({ ok: false, error: error?.message || "Unknown server error" }, 500);
    }
  }
};

async function getWatchlist(env) {
  const quotes = await Promise.all(WATCHLIST.map((symbol) => fetchQuote(env, symbol)));
  return quotes.filter(Boolean);
}

async function getMovers(env) {
  const quotes = await Promise.all(WATCHLIST.map((symbol) => fetchQuote(env, symbol)));
  return quotes
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 6);
}

async function getNews(env, category = "general") {
  const data = await fetchFinnhubNews(env, category);
  return data.slice(0, 12).map(normalizeNews);
}

async function getJobsSignals(env) {
  const data = await fetchFinnhubNews(env, "general");

  return data
    .map(normalizeNews)
    .map((item) => {
      const text = `${item.title} ${item.summary}`;
      return {
        ...item,
        score: keywordScore(text, JOB_KEYWORDS),
        type: "jobs"
      };
    })
    .filter((item) => item.score >= 10)
    .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp)
    .slice(0, 10);
}

async function getAISignals(env) {
  const data = await fetchFinnhubNews(env, "general");

  return data
    .map(normalizeNews)
    .map((item) => {
      const text = `${item.title} ${item.summary}`;
      return {
        ...item,
        score: aiScore(text),
        type: "ai"
      };
    })
    .filter((item) => item.score >= 12)
    .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp)
    .slice(0, 10);
}

async function getTopSignals(env) {
  const [movers, jobs, ai] = await Promise.all([
    getMovers(env),
    getJobsSignals(env),
    getAISignals(env)
  ]);

  const signals = [];

  for (const mover of movers.slice(0, 4)) {
    const moveAbs = Math.abs(Number(mover.percentChange || 0));
    const score = Math.min(99, Math.round(60 + moveAbs * 8));

    signals.push({
      type: "market",
      score,
      priority: 40 + moveAbs,
      title: `${mover.symbol} moved ${signed(mover.percentChange)}%`,
      summary: `Price ${mover.price} | Change ${signed(mover.change)} (${signed(mover.percentChange)}%)`,
      url: null,
      source: "Market quote",
      timestamp: Date.now()
    });
  }

  for (const item of jobs.slice(0, 4)) {
    signals.push({
      type: "jobs",
      score: Math.min(99, 58 + item.score),
      priority: 55 + item.score,
      title: item.title,
      summary: item.summary,
      url: item.url,
      source: item.source,
      timestamp: item.timestamp
    });
  }

  for (const item of ai.slice(0, 4)) {
    signals.push({
      type: "ai",
      score: Math.min(99, 56 + item.score),
      priority: 52 + item.score,
      title: item.title,
      summary: item.summary,
      url: item.url,
      source: item.source,
      timestamp: item.timestamp
    });
  }

  return signals
    .sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp)
    .slice(0, 12);
}

async function fetchQuote(env, symbol) {
  const actualSymbol = symbol === "BTCUSD" ? "BINANCE:BTCUSDT" : symbol;
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(actualSymbol)}&token=${env.FINNHUB_API_KEY}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Quote request failed for ${symbol}: ${response.status}`);
  }

  const data = await response.json();
  if (typeof data?.c !== "number") return null;

  return {
    symbol,
    price: round2(data.c),
    change: round2(data.d || 0),
    percentChange: round2(data.dp || 0),
    prevClose: round2(data.pc || 0)
  };
}

async function fetchFinnhubNews(env, category = "general") {
  const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${env.FINNHUB_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`News request failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function normalizeNews(item) {
  return {
    title: item?.headline || "Untitled",
    summary: item?.summary || "",
    source: item?.source || "Unknown source",
    url: item?.url || null,
    timestamp: typeof item?.datetime === "number" ? item.datetime * 1000 : Date.now()
  };
}

function keywordScore(text, keywords) {
  const haystack = String(text || "").toLowerCase();
  let score = 0;

  for (const word of keywords) {
    if (haystack.includes(word)) score += 10;
  }

  return score;
}

function aiScore(text) {
  const haystack = String(text || "").toLowerCase();
  let score = 0;

  for (const word of AI_KEYWORDS) {
    if (haystack.includes(word)) score += 8;
  }

  for (const word of AI_NEGATIVE_KEYWORDS) {
    if (haystack.includes(word)) score -= 10;
  }

  if (haystack.includes("nvidia")) score += 8;
  if (haystack.includes("amd")) score += 8;
  if (haystack.includes("openai")) score += 10;
  if (haystack.includes("gpu")) score += 6;
  if (haystack.includes("chip")) score += 6;
  if (haystack.includes("datacenter")) score += 5;
  if (haystack.includes("cloud")) score += 4;
  if (haystack.includes("model")) score += 4;

  return score;
}

function signed(value) {
  const n = Number(value || 0);
  return n > 0 ? `+${round2(n)}` : `${round2(n)}`;
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: CORS_HEADERS
  });
}