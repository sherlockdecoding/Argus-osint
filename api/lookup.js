// api/lookup.js

const ENDPOINTS = [

  /* =====================================================
     PRONOUNS.PAGE
     Current v3 API:
     /profile/get/{username}
  ===================================================== */

  {
    id: "pronouns_page",
    name: "Pronouns.page",
    category: "Identity",

    urls: user => [
      `https://en.pronouns.page/api/public/v3/profile/get/${encodeURIComponent(user)}`
    ],

    parse: data => {

      if(
        !data ||
        data.error === true ||
        !data.username
      ){
        return null;
      }

      const profiles =
        Array.isArray(data.profiles)
          ? data.profiles
          : [];

      /*
        Prefer English profile, then the first accessible
        profile returned by the API.
      */
      const profile =
        profiles.find(
          p => p && p.locale === "en"
        ) ||
        profiles.find(
          p => p && p.access !== false
        ) ||
        profiles[0] ||
        null;

      if(!profile){
        return null;
      }

      const names =
        Array.isArray(profile.names)
          ? profile.names
              .map(name => {

                if(typeof name === "string"){
                  return name;
                }

                return name &&
                  (
                    name.value ||
                    name.name
                  );

              })
              .filter(Boolean)
          : [];

      const pronouns =
        Array.isArray(profile.pronouns)
          ? profile.pronouns
              .map(pronoun => {

                if(typeof pronoun === "string"){
                  return pronoun;
                }

                if(
                  pronoun &&
                  typeof pronoun.value === "string"
                ){

                  /*
                    v3 may return:
                    https://en.pronouns.page/he&they

                    Convert that into something readable.
                  */
                  const value =
                    pronoun.value;

                  const match =
                    value.match(
                      /\/([^/]+)$/
                    );

                  if(match){
                    return match[1]
                      .replace(/&/g, " / ");
                  }

                  return value;
                }

                return null;

              })
              .filter(Boolean)
          : [];

      const links =
        Array.isArray(profile.links)
          ? profile.links
              .filter(Boolean)
          : [];

      const flags =
        Array.isArray(profile.flags)
          ? profile.flags
              .filter(Boolean)
          : [];

      const badges = [
        ...pronouns,
        ...flags.slice(0,4)
      ].filter(Boolean);

      const metrics = [

        {
          l: "Names",
          v: names.length
        },

        {
          l: "Pronouns",
          v: pronouns.length
        },

        {
          l: "Links",
          v: links.length
        }

      ];

      if(
        profile.age !== null &&
        profile.age !== undefined
      ){
        metrics.push({
          l: "Age",
          v: profile.age
        });
      }

      return {

        avatar:
          data.avatar || null,

        title:
          names[0] ||
          data.username,

        handle:
          `@${data.username}`,

        bio:
          profile.description ||
          "",

        badges,

        metrics,

        links,

        profileUrl:
          `https://en.pronouns.page/@${data.username}`

      };

    }
  },


  /* =====================================================
     CHESS.COM
  ===================================================== */

  {
    id: "chess_com",
    name: "Chess.com",
    category: "Gaming",

    urls: user => [
      `https://api.chess.com/pub/player/${encodeURIComponent(user)}`
    ],

    parse: async (profile, user) => {

      if(
        !profile ||
        !profile.username
      ){
        return null;
      }

      const base =
        `https://api.chess.com/pub/player/${encodeURIComponent(user)}`;

      const results =
        await Promise.allSettled([

          fetchJSON(
            `${base}/stats`
          ),

          fetchJSON(
            `${base}/clubs`
          )

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
              stats &&
              stats.chess_blitz &&
              stats.chess_blitz.last
                ? stats.chess_blitz.last.rating
                : "—"
          },

          {
            l: "Rapid",
            v:
              stats &&
              stats.chess_rapid &&
              stats.chess_rapid.last
                ? stats.chess_rapid.last.rating
                : "—"
          },

          {
            l: "Bullet",
            v:
              stats &&
              stats.chess_bullet &&
              stats.chess_bullet.last
                ? stats.chess_bullet.last.rating
                : "—"
          },

          {
            l: "Followers",
            v:
              profile.followers ?? "—"
          }

        ],

        clubs:
          clubs
            .slice(0,4)
            .map(c => ({
              name:c.name,
              icon:c.icon,
              url:c.url
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


  /* =====================================================
     LICHESS
  ===================================================== */

  {
    id: "lichess",
    name: "Lichess",
    category: "Gaming",

    urls: user => [
      `https://lichess.org/api/user/${encodeURIComponent(user)}`
    ],

    parse: data => {

      if(
        !data ||
        data.error ||
        !data.id
      ){
        return null;
      }

      const perf =
        data.perfs || {};

      return {

        avatar:null,

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
            l:"Blitz",
            v:
              perf.blitz
                ? perf.blitz.rating
                : "—"
          },

          {
            l:"Rapid",
            v:
              perf.rapid
                ? perf.rapid.rating
                : "—"
          },

          {
            l:"Puzzles",
            v:
              perf.puzzle
                ? perf.puzzle.rating
                : "—"
          },

          {
            l:"Games",
            v:
              data.count
                ? data.count.all
                : 0
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


  /* =====================================================
     GITHUB
  ===================================================== */

  {
    id: "github",
    name: "GitHub",
    category: "Developer",

    urls: user => [
      `https://api.github.com/users/${encodeURIComponent(user)}`
    ],

    parse: data => {

      if(
        !data ||
        data.message === "Not Found" ||
        !data.login
      ){
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
            l:"Repos",
            v:data.public_repos
          },

          {
            l:"Followers",
            v:data.followers
          },

          {
            l:"Gists",
            v:data.public_gists
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


  /* =====================================================
     GRAVATAR
  ===================================================== */

  {
    id: "gravatar",
    name: "Gravatar",
    category: "Identity",

    urls: user => [
      `https://en.gravatar.com/${encodeURIComponent(user)}.json`
    ],

    parse: data => {

      if(
        !data ||
        !Array.isArray(data.entry) ||
        !data.entry[0]
      ){
        return null;
      }

      const e =
        data.entry[0];

      const urls =
        Array.isArray(e.urls)
          ? e.urls
              .map(u => u && u.value)
              .filter(Boolean)
          : [];

      return {

        avatar:
          e.thumbnailUrl || null,

        title:
          e.displayName ||
          e.preferredUsername ||
          "",

        handle:
          e.preferredUsername
            ? `@${e.preferredUsername}`
            : "",

        bio:
          e.aboutMe || "",

        badges: [
          e.currentLocation
        ].filter(Boolean),

        metrics: [

          {
            l:"Accounts",
            v:
              Array.isArray(e.accounts)
                ? e.accounts.length
                : 0
          },

          {
            l:"URLs",
            v:urls.length
          }

        ],

        links:
          urls,

        profileUrl:
          e.profileUrl ||
          (
            e.preferredUsername
              ? `https://gravatar.com/${e.preferredUsername}`
              : null
          )

      };

    }
  },


  /* =====================================================
     KEYBASE
  ===================================================== */

  {
    id: "keybase",
    name: "Keybase",
    category: "Security",

    urls: user => [
      `https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(user)}`
    ],

    parse: data => {

      if(
        !data ||
        !Array.isArray(data.them) ||
        !data.them[0]
      ){
        return null;
      }

      const u =
        data.them[0];

      if(!u.id){
        return null;
      }

      const basics =
        u.basics || {};

      const profile =
        u.profile || {};

      const proofs =
        u.proofs_summary &&
        Array.isArray(
          u.proofs_summary.all
        )
          ? u.proofs_summary.all
              .map(
                p =>
                  p &&
                  p.proof_type &&
                  p.nametag
                    ? `${p.proof_type}: ${p.nametag}`
                    : null
              )
              .filter(Boolean)
          : [];

      return {

        avatar:
          u.pictures &&
          u.pictures.primary
            ? u.pictures.primary.url
            : null,

        title:
          profile.full_name ||
          basics.username ||
          "",

        handle:
          basics.username
            ? `@${basics.username}`
            : "",

        bio:
          profile.bio || "",

        badges:
          proofs.slice(0,4),

        metrics: [

          {
            l:"Proofs",
            v:proofs.length
          },

          {
            l:"Devices",
            v:
              u.devices
                ? Object.keys(u.devices).length
                : 0
          }

        ],

        links:[],

        profileUrl:
          basics.username
            ? `https://keybase.io/${basics.username}`
            : null

      };

    }
  },


  /* =====================================================
     REDDIT
     
     Reddit frequently returns 403 to cloud/serverless
     IPs. We try multiple public endpoints.
  ===================================================== */

  {
    id: "reddit",
    name: "Reddit",
    category: "Social",

    urls: user => [

      `https://www.reddit.com/user/${encodeURIComponent(user)}/about.json?raw_json=1`,

      `https://old.reddit.com/user/${encodeURIComponent(user)}/about.json?raw_json=1`,

      `https://www.reddit.com/u/${encodeURIComponent(user)}/about.json?raw_json=1`

    ],

    parse: data => {

      if(
        !data ||
        !data.data ||
        !data.data.name
      ){
        return null;
      }

      const u =
        data.data;

      const subreddit =
        u.subreddit || {};

      return {

        avatar:
          u.icon_img
            ? u.icon_img.split("?")[0]
            : null,

        title:
          subreddit.title ||
          u.name,

        handle:
          `u/${u.name}`,

        bio:
          subreddit.public_description ||
          "",

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
            l:"Post karma",
            v:u.link_karma ?? "—"
          },

          {
            l:"Comment karma",
            v:u.comment_karma ?? "—"
          },

          {
            l:"Since",
            v:
              u.created_utc
                ? new Date(
                    u.created_utc * 1000
                  ).getFullYear()
                : "—"
          }

        ],

        links:[],

        profileUrl:
          `https://www.reddit.com/user/${u.name}`

      };

    }
  },


  /* =====================================================
     PRONOUNS.CC
  ===================================================== */

  {
    id: "pronouns_cc",
    name: "Pronouns.cc",
    category: "Identity",

    urls: user => [
      `https://pronouns.cc/api/v1/users/${encodeURIComponent(user)}`
    ],

    parse: data => {

      if(
        !data ||
        (
          !data.username &&
          !data.members
        )
      ){
        return null;
      }

      return {

        avatar:
          data.avatar_url || null,

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
            l:"Members",
            v:
              Array.isArray(data.members)
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


  /* =====================================================
     HACKER NEWS
  ===================================================== */

  {
    id: "hackernews",
    name: "Hacker News",
    category: "Community",

    urls: user => [
      `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(user)}.json`
    ],

    parse: data => {

      if(
        !data ||
        !data.id
      ){
        return null;
      }

      return {

        avatar:null,

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

        badges:[],

        metrics: [

          {
            l:"Karma",
            v:data.karma ?? "—"
          },

          {
            l:"Posts",
            v:
              Array.isArray(data.submitted)
                ? data.submitted.length
                : 0
          }

        ],

        links:[],

        profileUrl:
          `https://news.ycombinator.com/user?id=${encodeURIComponent(data.id)}`

      };

    }
  },


  /* =====================================================
     DEV.TO
  ===================================================== */

  {
    id: "dev_to",
    name: "Dev.to",
    category: "Developer",

    urls: user => [
      `https://dev.to/api/users/by_username?url=${encodeURIComponent(user)}`
    ],

    parse: data => {

      if(
        !data ||
        !data.username
      ){
        return null;
      }

      return {

        avatar:
          data.profile_image || null,

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
            l:"Joined",
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


/* =========================================================
   FETCH JSON
========================================================= */

async function fetchJSON(url, options = {}){

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      options.timeout || 10000
    );

  try{

    const headers = {

      "Accept":
        "application/json, text/plain, */*",

      "User-Agent":
        "Argus-OSINT/1.0 (+public-profile-lookup)"

    };

    if(options.headers){
      Object.assign(
        headers,
        options.headers
      );
    }

    const response =
      await fetch(
        url,
        {
          method:"GET",
          headers,
          signal:controller.signal,
          redirect:"follow"
        }
      );

    let data = null;

    try{

      data =
        await response.json();

    }catch{

      data = null;

    }

    return {

      status:
        response.status,

      data,

      error:
        null

    };

  }catch(error){

    return {

      status:
        "blocked",

      data:
        null,

      error:
        error &&
        error.name === "AbortError"
          ? "Request timed out"
          : (
              error &&
              error.message
                ? error.message
                : "Request failed"
            )

    };

  }finally{

    clearTimeout(timeout);

  }

}


/* =========================================================
   FETCH WITH FALLBACK URLS
========================================================= */

async function fetchEndpoint(endpoint, username){

  const urls =
    endpoint.urls(username);

  let lastResponse = null;

  for(const url of urls){

    const response =
      await fetchJSON(
        url,
        endpoint.id === "reddit"
          ? {
              timeout:8000,

              headers:{
                "Accept":
                  "application/json",

                "User-Agent":
                  "ArgusOSINT/1.0"
              }
            }
          : {
              timeout:10000
            }
      );

    lastResponse = response;

    /*
      Stop immediately on successful response.
    */
    if(
      response.status >= 200 &&
      response.status < 300
    ){
      return response;
    }

    /*
      404/410 means the profile itself is not there.
      No point trying fallback URLs.
    */
    if(
      response.status === 404 ||
      response.status === 410
    ){
      return response;
    }

    /*
      For Reddit, try the next public endpoint after 403.
      For other services, retry only through their supplied
      URL list.
    */
  }

  return lastResponse || {
    status:"blocked",
    data:null,
    error:"No response"
  };

}


/* =========================================================
   VERCEL SERVERLESS FUNCTION
========================================================= */

export default async function handler(req, res){

  /* -----------------------------
     CORS
  ----------------------------- */

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
    "Content-Type, Accept"
  );

  res.setHeader(
    "Cache-Control",
    "no-store, max-age=0"
  );


  /* -----------------------------
     OPTIONS
  ----------------------------- */

  if(req.method === "OPTIONS"){

    return res
      .status(204)
      .end();

  }


  /* -----------------------------
     GET ONLY
  ----------------------------- */

  if(req.method !== "GET"){

    return res
      .status(405)
      .json({
        error:"Method not allowed"
      });

  }


  /* -----------------------------
     USERNAME
  ----------------------------- */

  let username =
    String(
      req.query.username || ""
    ).trim();

  /*
    Accept @username from the UI,
    but remove it before querying APIs.
  */
  username =
    username.replace(/^@+/, "");


  if(!username){

    return res
      .status(400)
      .json({
        error:"Missing username"
      });

  }


  if(username.length > 100){

    return res
      .status(400)
      .json({
        error:"Username is too long"
      });

  }


  /* -----------------------------
     BASIC VALIDATION
  ----------------------------- */

  if(
    /[\r\n]/.test(username)
  ){

    return res
      .status(400)
      .json({
        error:"Invalid username"
      });

  }


  /* -----------------------------
     RUN ALL SOURCES
  ----------------------------- */

  const results =
    await Promise.allSettled(

      ENDPOINTS.map(
        async endpoint => {

          const response =
            await fetchEndpoint(
              endpoint,
              username
            );

          let parsed = null;

          /*
            Only attempt parsing when an HTTP
            success response was received.
          */
          if(
            typeof response.status === "number" &&
            response.status >= 200 &&
            response.status < 300 &&
            response.data
          ){

            try{

              parsed =
                await endpoint.parse(
                  response.data,
                  username
                );

            }catch(error){

              parsed = null;

            }

          }


          /* -------------------------
             FOUND
          ------------------------- */

          if(parsed){

            return {

              id:
                endpoint.id,

              name:
                endpoint.name,

              category:
                endpoint.category,

              status:
                "found",

              raw:
                response.data,

              parsed,

              httpStatus:
                response.status

            };

          }


          /* -------------------------
             NOT FOUND
          ------------------------- */

          if(
            response.status === 404 ||
            response.status === 410
          ){

            return {

              id:
                endpoint.id,

              name:
                endpoint.name,

              category:
                endpoint.category,

              status:
                "not_found",

              raw:
                response.data,

              parsed:
                null,

              httpStatus:
                response.status

            };

          }


          /* -------------------------
             BLOCKED / ERROR
          ------------------------- */

          return {

            id:
              endpoint.id,

            name:
              endpoint.name,

            category:
              endpoint.category,

            status:
              "error",

            raw:
              response.data,

            parsed:
              null,

            httpStatus:
              response.status,

            error:
              response.error || null

          };

        }
      )

    );


  /* -----------------------------
     NORMALIZE PROMISE RESULTS
  ----------------------------- */

  const output =
    results.map(
      (result, index) => {

        if(
          result.status === "fulfilled"
        ){

          return result.value;

        }

        const endpoint =
          ENDPOINTS[index];

        return {

          id:
            endpoint
              ? endpoint.id
              : "unknown",

          name:
            endpoint
              ? endpoint.name
              : "Unknown",

          category:
            endpoint
              ? endpoint.category
              : "Unknown",

          status:
            "error",

          raw:
            null,

          parsed:
            null,

          httpStatus:
            null,

          error:
            result.reason &&
            result.reason.message
              ? result.reason.message
              : "Unknown error"

        };

      }
    );


  /* -----------------------------
     COUNTS
  ----------------------------- */

  const found =
    output.filter(
      item =>
        item.status === "found"
    ).length;

  const notFound =
    output.filter(
      item =>
        item.status === "not_found"
    ).length;

  const errors =
    output.filter(
      item =>
        item.status === "error"
    ).length;


  /* -----------------------------
     RESPONSE
  ----------------------------- */

  return res
    .status(200)
    .json({

      username,

      checked:
        output.length,

      found,

      notFound,

      errors,

      results:
        output

    });

    }
