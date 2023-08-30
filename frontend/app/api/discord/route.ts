import apiURL from "@/app/apiURL";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const code = request.url.split("?code=")[1];
  if (code) {
    // Make a POST request to Discord to exchange the code for a token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${apiURL}/api/discord`,
        scope: "identify",
      } as Record<string, string>),
    });

    const tokenData = await tokenResponse.json();
    let response = NextResponse.redirect(
      new URL("/encounters", request.url.split("?")[0])
    );
    response.cookies.set("token", tokenData.access_token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return response;
  } else {
    return new Response("No code provided", { status: 400 });
  }
}
