import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Send execution request to Wandbox API
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: body.compiler,
        code: body.code,
        stdin: body.stdin || ""
      })
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to communicate with execution engine.' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Execution error:', error);
    return NextResponse.json({ error: 'Internal server error during execution', details: error.message }, { status: 500 });
  }
}
