import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a KCL (Klartext CAD Language) code generator. Convert natural language descriptions into KCL code.

KCL Syntax:
- Box: let name = box(size: [width, height, depth], center: [x, y, z])

Rules:
1. Output ONLY valid KCL code, no explanations
2. Use descriptive variable names
3. Position objects logically (no overlapping unless intended)
4. Use reasonable default sizes (1-10 units typical)

Examples:
User: "a table"
Output:
let tabletop = box(size: [4, 0.2, 2], center: [0, 1, 0])
let leg1 = box(size: [0.2, 1, 0.2], center: [-1.8, 0.4, -0.8])
let leg2 = box(size: [0.2, 1, 0.2], center: [1.8, 0.4, -0.8])
let leg3 = box(size: [0.2, 1, 0.2], center: [-1.8, 0.4, 0.8])
let leg4 = box(size: [0.2, 1, 0.2], center: [1.8, 0.4, 0.8])

User: "a simple chair"
Output:
let seat = box(size: [1.5, 0.2, 1.5], center: [0, 1, 0])
let back = box(size: [1.5, 1.5, 0.2], center: [0, 1.85, -0.65])
let leg1 = box(size: [0.15, 1, 0.15], center: [-0.6, 0.4, -0.6])
let leg2 = box(size: [0.15, 1, 0.15], center: [0.6, 0.4, -0.6])
let leg3 = box(size: [0.15, 1, 0.15], center: [-0.6, 0.4, 0.6])
let leg4 = box(size: [0.15, 1, 0.15], center: [0.6, 0.4, 0.6])`;

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Try Anthropic first, then OpenAI
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let kclCode: string;

    if (anthropicKey) {
      kclCode = await generateWithAnthropic(prompt, anthropicKey);
    } else if (openaiKey) {
      kclCode = await generateWithOpenAI(prompt, openaiKey);
    } else {
      return NextResponse.json(
        { error: 'No API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY' },
        { status: 500 }
      );
    }

    return NextResponse.json({ kclCode });
  } catch (error) {
    console.error('Generate KCL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateWithAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
