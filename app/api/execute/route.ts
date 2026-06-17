import { NextResponse } from 'next/server';

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 93,
  python: 71,
  cpp: 54,
  c: 50,
  java: 62,
};

export async function POST(req: Request) {
  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language are required' }, { status: 400 });
    }

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'RAPIDAPI_KEY is not configured in environment variables. Please add it to your .env.local file. You can get one from rapidapi.com/judge0-official/api/judge0-ce/'
      }, { status: 500 });
    }

    const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Judge0 API Error:", response.status, errorText);
      return NextResponse.json({ error: 'Failed to execute code with Judge0 API' }, { status: response.status });
    }

    const result = await response.json();
    
    // Determine the output to show
    let output = result.stdout || '';
    if (result.stderr) {
      output += (output ? '\n' : '') + result.stderr;
    }
    if (result.compile_output) {
      output += (output ? '\n' : '') + result.compile_output;
    }
    
    if (!output && result.status?.description) {
      output = result.status.description;
    }

    return NextResponse.json({ output });

  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json({ error: 'Internal server error during execution' }, { status: 500 });
  }
}
