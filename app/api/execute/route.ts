import { NextResponse } from 'next/server';

const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  python: 'python3',
  cpp: 'cpp',
  c: 'c',
  java: 'java',
};

export async function POST(req: Request) {
  try {
    let { code, language, input } = await req.json();

    if (language === 'java') {
      // Paiza executes 'java Main'. If the user names their class something else (like 'Dijkstra'), 
      // it will compile but fail to run with ClassNotFoundException: Main.
      // We automatically rename their public class to 'Main' to fix this.
      code = code.replace(/public\s+class\s+[a-zA-Z0-9_]+/g, "public class Main");
    }

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language are required' }, { status: 400 });
    }

    const paizaLang = LANGUAGE_MAP[language];
    if (!paizaLang) {
      return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
    }

    // 1. Create a runner session on Paiza (Completely free, no API key needed)
    const createRes = await fetch('https://api.paiza.io/runners/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language: paizaLang,
        input: input || "",
        api_key: 'guest'
      })
    });

    if (!createRes.ok) {
      return NextResponse.json({ error: 'Failed to initialize compilation engine.' }, { status: createRes.status });
    }

    const { id } = await createRes.json();
    if (!id) {
      return NextResponse.json({ error: 'Execution engine failed to provide a session ID.' }, { status: 500 });
    }

    // 2. Poll for the execution details until completed
    let attempts = 0;
    while (attempts < 15) {
      // Wait 1 second between polls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const detailsRes = await fetch(`https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`);
      if (!detailsRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch execution status.' }, { status: detailsRes.status });
      }

      const details = await detailsRes.json();
      
      if (details.status === 'completed') {
        // Build the output
        let output = '';
        if (details.build_stderr) output += details.build_stderr + '\n';
        if (details.build_stdout) output += details.build_stdout + '\n';
        if (details.stderr) output += details.stderr + '\n';
        if (details.stdout) output += details.stdout;
        
        if (!output && details.build_exit_code !== '0') {
          output = `Build Failed with exit code ${details.build_exit_code}`;
        }
        
        return NextResponse.json({ output: output.trim() || 'Program finished with no output.' });
      }

      attempts++;
    }

    return NextResponse.json({ error: 'Execution timed out.' }, { status: 504 });

  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json({ error: 'Internal server error during execution' }, { status: 500 });
  }
}
