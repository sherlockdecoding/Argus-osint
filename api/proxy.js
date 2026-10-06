export default async function handler(req, res) {
  /*
   * ARGUS OSINT
   * Public API proxy
   */

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "method not allowed"
    });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: "missing url"
    });
  }

  /*
   * Only allow known public API hosts.
   */
  const allowedHosts = new Set([
    "en.pronouns.page",
    "api.chess.com",
    "lichess.org",
    "api.github.com",
    "en.gravatar.com",
    "keybase.io",
    "www.reddit.com",
    "pronouns.cc",
    "hacker-news.firebaseio.com",
    "dev.to",

    /* New sources */
    "public.api.bsky.app",
    "gitlab.com",
    "api.stackexchange.com",
    "huggingface.co",
    "registry.npmjs.org",
    "codeberg.org"
  ]);

  let target;

  try {
    target = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({
      error: "bad url"
    });
  }

  /*
   * Only HTTPS URLs are accepted.
   */
  if (target.protocol !== "https:") {
    return res.status(403).json({
      error: "https only"
    });
  }

  /*
   * Prevent the proxy from becoming an arbitrary
   * open proxy.
   */
  if (!allowedHosts.has(target.hostname)) {
    return res.status(403).json({
      error: "host not allowed"
    });
  }

  /*
   * Abort slow upstream requests.
   */
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {

    const response = await fetch(target.toString(), {
      method: "GET",

      headers: {
        "Accept": "application/json",
        "User-Agent": "ArgusOSINT/1.0 (+https://osint-argus.vercel.app/)"
      },

      signal: controller.signal
    });

    const text = await response.text();

    /*
     * Try to preserve JSON responses.
     */
    let body = text;

    try {
      const parsed = JSON.parse(text);
      body = JSON.stringify(parsed);
    } catch {
      /*
       * Some providers can return non-JSON responses
       * for blocked/error conditions. Return them as-is.
       */
    }

    res
      .status(response.status)
      .setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
      )
      .setHeader(
        "Cache-Control",
        "no-store"
      )
      .send(body);

  } catch (error) {

    if (error?.name === "AbortError") {
      return res.status(504).json({
        error: "upstream timeout"
      });
    }

    return res.status(502).json({
      error: "fetch failed"
    });

  } finally {
    clearTimeout(timeout);
  }
      }
