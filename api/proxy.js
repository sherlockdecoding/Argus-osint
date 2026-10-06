export default async function handler(req, res) {

  /* ================= METHOD ================= */

  if (req.method && req.method !== 'GET') {
    return res
      .status(405)
      .json({
        error: 'method not allowed'
      });
  }

  /* ================= URL ================= */

  const { url } = req.query;

  if (!url) {
    return res
      .status(400)
      .json({
        error: 'missing url'
      });
  }

  /* ================= ALLOWED HOSTS ================= */

  const allowedHosts = [

    /* Existing sources */

    'en.pronouns.page',
    'api.chess.com',
    'lichess.org',
    'api.github.com',
    'en.gravatar.com',
    'keybase.io',
    'www.reddit.com',
    'pronouns.cc',
    'hacker-news.firebaseio.com',
    'dev.to',

    /* New sources */

    'public.api.bsky.app',
    'mastodon.social',
    'gitlab.com',
    'api.stackexchange.com',
    'huggingface.co',
    'registry.npmjs.org',
    'codeberg.org'

  ];

  /* ================= PARSE URL ================= */

  let target;

  try {

    target =
      new URL(
        decodeURIComponent(url)
      );

  } catch {

    return res
      .status(400)
      .json({
        error: 'bad url'
      });

  }

  /* ================= HOST SECURITY ================= */

  if (
    target.protocol !== 'https:' ||
    !allowedHosts.includes(target.hostname)
  ) {

    return res
      .status(403)
      .json({
        error: 'host not allowed'
      });

  }

  /* ================= REQUEST ================= */

  try {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        10000
      );

    const r =
      await fetch(
        target.toString(),
        {
          method:'GET',

          headers:{
            'Accept':
              'application/json',
            'User-Agent':
              'Mozilla/5.0 (ArgusOSINT proxy)'
          },

          signal:
            controller.signal
        }
      );

    clearTimeout(timeout);

    const text =
      await r.text();

    /* ================= RESPONSE ================= */

    res
      .status(r.status)
      .setHeader(
        'Content-Type',
        'application/json; charset=utf-8'
      )
      .setHeader(
        'Cache-Control',
        'public, max-age=30, s-maxage=60'
      )
      .send(text);

  } catch (error) {

    return res
      .status(502)
      .json({
        error:
          error &&
          error.name === 'AbortError'
            ?'upstream timeout'
            :'fetch failed'
      });

  }

        }
