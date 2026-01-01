export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/login") {
      const clientId = env.CLIENT_ID;
      const redirectUri = encodeURIComponent(env.REDIRECT_URI);
      const state = crypto.randomUUID();

      const authUrl =
        `https://apis.roblox.com/oauth/v1/authorize` +
        `?client_id=${clientId}` +
        `&response_type=code` +
        `&scope=openid%20profile` +
        `&redirect_uri=${redirectUri}` +
        `&state=${state}`;

      return Response.redirect(authUrl, 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) return new Response("Missing code/state", { status: 400 });

      try {
        const tokenRes = await fetch("https://apis.roblox.com/oauth/v1/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            code,
            redirect_uri: env.REDIRECT_URI
          })
        });

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        const userRes = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userData = await userRes.json();

        const robloxId = userData.sub;
        const username = userData.preferred_username;

        await env.ROBLOX_LINKS.put(`user:${robloxId}`, JSON.stringify({ username }));

        return new Response(`Successfully linked Roblox account: ${username}`, { status: 200 });

      } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
