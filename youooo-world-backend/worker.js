export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (url.pathname === "/api/health") {
        return json({ ok: true, product: "Youooo World API", version: "8.3" });
      }

      if (url.pathname === "/api/quote") {
        const symbol = url.searchParams.get("symbol");
        if (!symbol) return json({ error: "Missing symbol" }, 400);

        const quote = await fetchTwelveDataQuote(symbol, env.TWELVE_DATA_API_KEY);
        return json({ data: quote });
      }

      if (url.pathname === "/api/chart") {
        const symbol = url.searchParams.get("symbol");
        const interval = url.searchParams.get("interval") || "1day";
        if (!symbol) return json({ error: "Missing symbol" }, 400);

        const chart = await fetchTwelveDataChart(symbol, interval, env.TWELVE_DATA_API_KEY);
        return json(chart);
      }

      if (url.pathname === "/api/market-snapshot") {
        const symbols = (url.searchParams.get("symbols") || "NVDA,AAPL,TSLA,SPY,BTC/USD")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const data = await Promise.all(
          symbols.map(async (symbol) => {
            try {
              return await fetchTwelveDataQuote(symbol, env.TWELVE_DATA_API_KEY);
            } catch {
              return {
                symbol,
                price: null,
                close: null,
                change: null,
                percent_change: null,
                volume: null,
                high: null,
                low: null,
                open: null,
                previous_close: null,
              };
            }
          })
        );

        return json({ data });
      }

      if (url.pathname === "/api/jobs") {
        const query = url.searchParams.get("query") || "ai";
        const limit = Math.min(Number(url.searchParams.get("limit") || 6), 10);
        const jobs = await fetchRemotiveJobs(query, limit);
        return json({ jobs });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json(
        {
          error: "Server error",
          message: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  },
};

async function fetchTwelveDataQuote(symbol, apiKey) {
  const endpoint = new URL("https://api.twelvedata.com/quote");
  endpoint.searchParams.set("symbol", symbol);
  endpoint.searchParams.set("apikey", apiKey);

  const response = await fetch(endpoint.toString());
  const data = await response.json();

  if (!response.ok || data.status === "error") {
    throw new Error(data.message || `Quote fetch failed for ${symbol}`);
  }

  return data;
}

async function fetchTwelveDataChart(symbol, interval, apiKey) {
  const outputsizeMap = {
    "1day": "40",
    "1week": "60",
    "1month": "90",
    "3month": "120",
  };

  const endpoint = new URL("https://api.twelvedata.com/time_series");
  endpoint.searchParams.set("symbol", symbol);
  endpoint.searchParams.set("interval", interval);
  endpoint.searchParams.set("outputsize", outputsizeMap[interval] || "60");
  endpoint.searchParams.set("apikey", apiKey);

  const response = await fetch(endpoint.toString());
  const data = await response.json();

  if (!response.ok || data.status === "error") {
    throw new Error(data.message || `Chart fetch failed for ${symbol}`);
  }

  return {
    meta: data.meta || {},
    values: Array.isArray(data.values) ? data.values : [],
  };
}

async function fetchRemotiveJobs(query, limit) {
  const endpoint = new URL("https://remotive.com/api/remote-jobs");
  endpoint.searchParams.set("search", query);

  const response = await fetch(endpoint.toString(), {
    headers: {
      "User-Agent": "Youooo-World/8.3",
    },
  });

  if (!response.ok) {
    return getFallbackJobs(query, limit);
  }

  const data = await response.json();
  const jobs = Array.isArray(data.jobs) ? data.jobs.slice(0, limit) : [];

  if (!jobs.length) {
    return getFallbackJobs(query, limit);
  }

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company_name: job.company_name,
    candidate_required_location: job.candidate_required_location,
    url: job.url,
  }));
}

function getFallbackJobs(query, limit) {
  const catalog = [
    {
      id: "1",
      title: "Remote AI Engineer",
      company_name: "Curated Feed",
      candidate_required_location: "Global Remote",
      url: "https://remotive.com/remote-jobs/software-dev",
    },
    {
      id: "2",
      title: "Cloud Engineer",
      company_name: "Curated Feed",
      candidate_required_location: "Remote",
      url: "https://remotive.com/remote-jobs/devops",
    },
    {
      id: "3",
      title: "Validation Engineer",
      company_name: "Curated Feed",
      candidate_required_location: "Hybrid / Remote",
      url: "https://remotive.com/remote-jobs/software-dev",
    },
    {
      id: "4",
      title: "Embedded Systems Engineer",
      company_name: "Curated Feed",
      candidate_required_location: "Remote",
      url: "https://remotive.com/remote-jobs/software-dev",
    },
    {
      id: "5",
      title: "Data Engineer",
      company_name: "Curated Feed",
      candidate_required_location: "Global Remote",
      url: "https://remotive.com/remote-jobs/data",
    },
    {
      id: "6",
      title: "Machine Learning Engineer",
      company_name: "Curated Feed",
      candidate_required_location: "Remote",
      url: "https://remotive.com/remote-jobs/software-dev",
    },
  ];

  const filtered = catalog.filter((job) =>
    `${job.title} ${job.company_name}`.toLowerCase().includes(query.toLowerCase())
  );

  return (filtered.length ? filtered : catalog).slice(0, limit);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}