// api/lookup.js

/*
 * Argus OSINT
 * Hybrid fallback API
 *
 * The frontend normally queries public APIs directly.
 * This endpoint is used when a browser request fails because
 * of CORS, browser restrictions, or another client-side issue.
 */

const ENDPOINTS = [

  {
    id: "pronouns_page",
    name: "Pronouns.page",
    category: "Identity",

    url: user =>
      `https://en.pronouns.page/api/public/v3/users/${encodeURIComponent(user)}`,

    parse: data => {

      if (!data || !data.profiles) return null;

      const en =
        data.profiles.en ||
        Object.values(data.profiles)[0];

      if (!en) return null;

      const names =
        (en.names || [])
          .map(n =>
            typeof n === "string"
              ? n
              : n?.value || n?.name
          )
          .filter(Boolean);

      const pronouns =
        (en.pronouns || [])
          .map(p =>
            typeof p === "string"
              ? p
              : p?.value || p?.pronoun
          )
          .filter(Boolean);

      const links =
        (en.links || [])
          .map(l =>
            typeof l === "string"
              ? l
              : l?.href || l?.link
          )
          .filter(Boolean);

      return {

        avatar: data.avatar || null,

        title:
          names[0] ||
          data.username,

        handle:
          `@${data.username}`,

        bio:
          en.bio || "",

        badges:
          pronouns,

        metrics: [
          {
            l: "Names",
            v: names.length
          },
          {
            l: "Pronouns",
            v: pronouns.length
          }
        ],

        links,

        profileUrl:
          `https://pronouns.page/@${data.username}`

      };

    }
  },


  {
    id: "chess_com",
    name: "Chess.com",
    category: "Gaming",

    url: user =>
      `https://api.chess.com/pub/player/${encodeURIComponent(user)}`,

    parse: async (profile, user) => {

      if (
        !profile ||
        !profile.username
      ) {
        return null;
      }

      const base =
        `https://api.chess.com/pub/player/${encodeURIComponent(user)}`;

      const results =
        await Promise.allSettled([

          fetchJSON(`${base}/stats`),

          fetchJSON(`${base}/clubs`)

        ]);

      const stats =
        results[0].status === "fulfilled"
          ? results[0].value.data
          : null;

      const clubsData =
        results[1].status === "fulfilled"
          ? results[1].value.data
          : null;

      const clubs =
        clubsData &&
        Array.isArray(clubsData.clubs)
          ? clubsData.clubs
          : [];

      return {

        avatar:
          profile.avatar || null,

        title:
          profile.name ||
          profile.username,

        handle:
          `@${profile.username}`,

        bio:
          `Joined ${
            profile.joined
              ? new Date(
                  profile.joined * 1000
                ).toLocaleDateString()
              : "—"
          } · last online ${
            profile.last_online
              ? new Date(
                  profile.last_online * 1000
                ).toLocaleDateString()
              : "—"
          }`,

        badges: [
          profile.title
            ? `Title: ${profile.title}`
            : null,

          profile.location

        ].filter(Boolean),

        metrics: [

          {
            l: "Blitz",
            v:
              stats?.chess_blitz?.last?.rating ??
              "—"
          },

          {
            l: "Rapid",
            v:
              stats?.chess_rapid?.last?.rating ??
              "—"
          },

          {
            l: "Bullet",
            v:
              stats?.chess_bullet?.last?.rating ??
              "—"
          },

          {
            l: "Followers",
            v:
              profile.followers ?? "—"
          }

        ],

        clubs:
          clubs.slice(0, 4).map(c => ({
            name: c.name,
            icon: c.icon,
            url: c.url
          })),

        links:
          profile.url
            ? [profile.url]
            : [],

        profileUrl:
          profile.url ||
          `https://www.chess.com/member/${profile.username}`

      };

    }
  },


  {
    id: "lichess",
    name: "Lichess",
    category: "Gaming",

    url: user =>
      `https://lichess.org/api/user/${encodeURIComponent(user)}`,

    parse: data => {

      if (
        !data ||
        data.error ||
        !data.id
      ) {
        return null;
      }

      const perf =
        data.perfs || {};

      return {

        avatar: null,

        title:
          data.username,

        handle:
          data.title
            ? `[${data.title}] @${data.id}`
            : `@${data.id}`,

        bio:
          data.bio || "",

        badges: [
          data.online
            ? "Online"
            : "Offline",

          data.patron
            ? "Patron"
            : null

        ].filter(Boolean),

        metrics: [

          {
            l: "Blitz",
            v:
              perf.blitz?.rating ??
              "—"
          },

          {
            l: "Rapid",
            v:
              perf.rapid?.rating ??
              "—"
          },

          {
            l: "Puzzles",
            v:
              perf.puzzle?.rating ??
              "—"
          },

          {
            l: "Games",
            v:
              data.count?.all ??
              0
          }

        ],

        links:
          data.url
            ? [data.url]
            : [],

        profileUrl:
          data.url ||
          `https://lichess.org/@/${data.username}`

      };

    }
  },


  {
    id: "github",
    name: "GitHub",
    category: "Developer",

    url: user =>
      `https://api.github.com/users/${encodeURIComponent(user)}`,

    parse: data => {

      if (
        !data ||
        data.message === "Not Found" ||
        !data.login
      ) {
        return null;
      }

      return {

        avatar:
          data.avatar_url,

        title:
          data.name ||
          data.login,

        handle:
          `@${data.login}`,

        bio:
          data.bio || "",

        badges: [
          data.company,
          data.location
        ].filter(Boolean),

        metrics: [

          {
            l: "Repos",
            v: data.public_repos
          },

          {
            l: "Followers",
            v: data.followers
          },

          {
            l: "Gists",
            v: data.public_gists
          }

        ],

        links:
          data.blog
            ? [
                data.blog.startsWith("http")
                  ? data.blog
                  : `https://${data.blog}`
              ]
            : [],

        profileUrl:
          data.html_url

      };

    }
  },


  {
    id: "gravatar",
    name: "Gravatar",
    category: "Identity",

    url: user =>
      `https://en.gravatar.com/${encodeURIComponent(user)}.json`,

    parse: data => {

      if (
        !data ||
        !data.entry ||
        !data.entry[0]
      ) {
        return null;
      }

      const e =
        data.entry[0];

      const urls =
        (e.urls || [])
          .map(u => u.value)
          .filter(Boolean);

      return {

        avatar:
          e.thumbnailUrl,

        title:
          e.displayName ||
          e.preferredUsername,

        handle:
          `@${e.preferredUsername}`,

        bio:
          e.aboutMe || "",

        badges: [
          e.currentLocation
        ].filter(Boolean),

        metrics: [

          {
            l: "Accounts",
            v:
              e.accounts?.length ??
              0
          },

          {
            l: "URLs",
            v:
              urls.length
          }

        ],

        links:
          urls,

        profileUrl:
          e.profileUrl ||
          `https://gravatar.com/${e.preferredUsername}`

      };

    }
  },


  {
    id: "keybase",
    name: "Keybase",
    category: "Security",

    url: user =>
      `https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(user)}`,

    parse: data => {

      if (
        !data ||
        !data.them ||
        !data.them[0]
      ) {
        return null;
      }

      const u =
        data.them[0];

      if (
        !u.id ||
        !u.basics ||
        !u.basics.username
      ) {
        return null;
      }

      const proofs =
        (
          u.proofs_summary
            ? u.proofs_summary.all || []
            : []
        )
        .map(
          p =>
            `${p.proof_type}: ${p.nametag}`
        );

      return {

        avatar:
          u.pictures?.primary?.url ||
          null,

        title:
          u.profile
            ? (
                u.profile.full_name ||
                u.basics.username
              )
            : u.basics.username,

        handle:
          `@${u.basics.username}`,

        bio:
          u.profile
            ? u.profile.bio || ""
            : "",

        badges:
          proofs.slice(0, 4),

        metrics: [

          {
            l: "Proofs",
            v: proofs.length
          },

          {
            l: "Devices",
            v:
              u.devices
                ? Object.keys(u.devices).length
                : 0
          }

        ],

        links: [],

        profileUrl:
          `https://keybase.io/${u.basics.username}`

      };

    }
  },


  {
    id: "reddit",
    name: "Reddit",
    category: "Social",

    url: user =>
      `https://www.reddit.com/user/${encodeURIComponent(user)}/about.json`,

    parse: data => {

      if (
        !data ||
        !data.data ||
        data.error === 404
      ) {
        return null;
      }

      const u =
        data.data;

      if (!u.name) return null;

      return {

        avatar:
          u.icon_img
            ? u.icon_img.split("?")[0]
            : null,

        title:
          u.subreddit
            ? (
                u.subreddit.title ||
                u.name
              )
            : u.name,

        handle:
          `u/${u.name}`,

        bio:
          u.subreddit
            ? (
                u.subreddit.public_description ||
                ""
              )
            : "",

        badges: [
          u.is_gold
            ? "Gold"
            : null,

          u.is_mod
            ? "Moderator"
            : null,

          u.has_verified_email
            ? "Verified email"
            : null

        ].filter(Boolean),

        metrics: [

          {
            l: "Post karma",
            v: u.link_karma
          },

          {
            l: "Comment karma",
            v: u.comment_karma
          },

          {
            l: "Since",
            v:
              u.created_utc
                ? new Date(
                    u.created_utc * 1000
                  ).getFullYear()
                : "—"
          }

        ],

        links: [],

        profileUrl:
          `https://reddit.com/user/${u.name}`

      };

    }
  },


  {
    id: "pronouns_cc",
    name: "Pronouns.cc",
    category: "Identity",

    url: user =>
      `https://pronouns.cc/api/v1/users/${encodeURIComponent(user)}`,

    parse: data => {

      if (
        !data ||
        (
          !data.username &&
          !data.members
        )
      ) {
        return null;
      }

      return {

        avatar:
          data.avatar_url,

        title:
          data.username ||
          "System",

        handle:
          data.id
            ? `ID ${data.id}`
            : "",

        bio:
          data.biography ||
          data.description ||
          "",

        badges:
          data.pronouns
            ? [data.pronouns]
            : [],

        metrics: [

          {
            l: "Members",
            v:
              data.members
                ? data.members.length
                : 0
          }

        ],

        links:
          Array.isArray(data.links)
            ? data.links
            : [],

        profileUrl:
          data.username
            ? `https://pronouns.cc/p/${data.username}`
            : null

      };

    }
  },


  {
    id: "hackernews",
    name: "Hacker News",
    category: "Community",

    url: user =>
      `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(user)}.json`,

    parse: data => {

      if (
        !data ||
        !data.id
      ) {
        return null;
      }

      return {

        avatar: null,

        title:
          data.id,

        handle:
          data.created
            ? `since ${new Date(
                data.created * 1000
              ).getFullYear()}`
            : "",

        bio:
          data.about || "",

        badges: [],

        metrics: [

          {
            l: "Karma",
            v: data.karma
          },

          {
            l: "Posts",
            v:
              data.submitted
                ? data.submitted.length
                : 0
          }

        ],

        links: [],

        profileUrl:
          `https://news.ycombinator.com/user?id=${data.id}`

      };

    }
  },


  {
    id: "dev_to",
    name: "Dev.to",
    category: "Developer",

    url: user =>
      `https://dev.to/api/users/by_username?url=${encodeURIComponent(user)}`,

    parse: data => {

      if (
        !data ||
        !data.username
      ) {
        return null;
      }

      return {

        avatar:
          data.profile_image,

        title:
          data.name ||
          data.username,

        handle:
          `@${data.username}`,

        bio:
          data.summary || "",

        badges: [
          data.location
        ].filter(Boolean),

        metrics: [

          {
            l: "Joined",
            v:
              data.joined_at
                ? data.joined_at.split(" ")[0]
                : "—"
          }

        ],

        links: [

          data.website_url,

          data.github_username
            ? `https://github.com/${data.github_username}`
            : null

        ].filter(Boolean),

        profileUrl:
          `https://dev.to/${data.username}`

      };

    }
  }

];


// ---------------------------------------------------------
// Fetch JSON with timeout
// ---------------------------------------------------------

async function fetchJSON(url) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      7000
    );

  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            "Accept": "application/json",
            "User-Agent":
              "Mozilla/5.0 (compatible; ArgusOSINT/1.0)"
          },

          signal: controller.signal
        }
      );

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      status: response.status,
      data
    };

  } catch (error) {

    return {
      status: "blocked",
      data: null,
      error:
        error?.name === "AbortError"
          ? "Request timed out"
          : (
              error?.message ||
              "Request failed"
            )
    };

  } finally {

    clearTimeout(timeout);

  }

}


// ---------------------------------------------------------
// Find endpoint
// ---------------------------------------------------------

function getEndpoint(sourceId) {

  if (!sourceId) return null;

  return ENDPOINTS.find(
    endpoint =>
      endpoint.id === sourceId
  ) || null;

}


// ---------------------------------------------------------
// Handler
// ---------------------------------------------------------

export default async function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );


  if(req.method === "OPTIONS"){

    return res.status(204).end();

  }


  if(req.method !== "GET"){

    return res.status(405).json({
      error:"Method not allowed"
    });

  }


  const username =
    String(
      req.query?.username || ""
    ).trim();


  if(!username){

    return res.status(400).json({
      error:"Missing username"
    });

  }


  if(username.length > 100){

    return res.status(400).json({
      error:"Username is too long"
    });

  }


  /*
   * If ?source=github is supplied,
   * query only that source.
   *
   * This is what the hybrid frontend uses
   * when its browser request fails.
   */

  const sourceId =
    String(
      req.query?.source || ""
    ).trim();


  let endpointsToQuery;


  if(sourceId){

    const endpoint=
      getEndpoint(sourceId);

    if(!endpoint){

      return res.status(400).json({
        error:"Unknown source",
        source:sourceId
      });

    }

    endpointsToQuery=[endpoint];

  }else{

    /*
     * Direct requests to /api/lookup without
     * a source still work as a complete fallback.
     */

    endpointsToQuery=ENDPOINTS;

  }


  const settled =
    await Promise.allSettled(

      endpointsToQuery.map(
        async endpoint => {

          const response =
            await fetchJSON(
              endpoint.url(username)
            );


          let parsed=null;


          if(
            response.status === 200 &&
            response.data
          ){

            try{

              parsed =
                await endpoint.parse(
                  response.data,
                  username
                );

            }catch{

              parsed=null;

            }

          }


          if(parsed){

            return {

              id:endpoint.id,

              name:endpoint.name,

              category:endpoint.category,

              status:"found",

              raw:response.data,

              parsed

            };

          }


          if(
            response.status === 404 ||
            response.status === 410
          ){

            return {

              id:endpoint.id,

              name:endpoint.name,

              category:endpoint.category,

              status:"not_found",

              raw:response.data,

              parsed:null,

              httpStatus:
                response.status

            };

          }


          return {

            id:endpoint.id,

            name:endpoint.name,

            category:endpoint.category,

            status:"error",

            raw:response.data,

            parsed:null,

            httpStatus:
              response.status,

            error:
              response.error ||
              null

          };

        }
      )

    );


  const output =
    settled.map(
      (result,index) => {

        if(
          result.status === "fulfilled"
        ){

          return result.value;

        }


        const endpoint=
          endpointsToQuery[index];


        return {

          id:endpoint?.id || "unknown",

          name:endpoint?.name || "Unknown",

          category:
            endpoint?.category ||
            "Unknown",

          status:"error",

          raw:null,

          parsed:null,

          httpStatus:null,

          error:
            result.reason?.message ||
            "Request failed"

        };

      }
    );


  return res.status(200).json({

    username,

    checked:output.length,

    found:
      output.filter(
        x => x.status === "found"
      ).length,

    notFound:
      output.filter(
        x => x.status === "not_found"
      ).length,

    errors:
      output.filter(
        x => x.status === "error"
      ).length,

    results:output

  });

        }
