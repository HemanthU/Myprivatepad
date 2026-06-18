import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // The credentials provided by the user. 
    // In a production app with multiple users, this would come from process.env
    // or be configured by the user via a Settings page.
    const clientId = "1208f075a175f1b376110ff53ca4b933";
    const clientSecret = "bbff87a718ac2818652ca476057e4fc77dddf4b2c9f8fb2e6c0c0977febd1f41";

    const res = await fetch("https://api.jdoodle.com/v1/auth-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientId,
        clientSecret
      })
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to authenticate with JDoodle" }, { status: res.status });
    }

    const token = await res.text();
    return NextResponse.json({ token });
  } catch (error) {
    console.error("JDoodle Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
