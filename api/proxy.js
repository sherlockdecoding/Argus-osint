export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'missing url' });

  const allowedHosts = [
    'en.pronouns.page', 'api.chess.com', 'lichess.org', 'api.github.com',
    'en.gravatar.com', 'keybase.io', 'www.reddit.com', 'pronouns.cc',
    'hacker-news.firebaseio.com', 'dev.to'
  ];

  let target;
  try { target = new URL(decodeURIComponent(url)); }
  catch { return res.status(400).json({ error: 'bad url' }); }

  if (!allowedHosts.includes(target.hostname)) {
    return res.status(403).json({ error: 'host not allowed' });
  }

  try {
    const r = await fetch(target.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (ArgusOSINT proxy)'
      }
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch {
    res.status(502).json({ error: 'fetch failed' });
  }
}
