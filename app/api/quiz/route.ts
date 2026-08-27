import { NextResponse } from "next/server";

type ModelInfo = { name: string; supportedGenerationMethods?: string[] };

const DEFAULT_MODEL = "gemini-2.0-flash-exp"; // Always available as fallback

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function getCandidates(key: string): Promise<string[]> {
  try {
    const r = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`,
      {},
      8000
    );
    if (!r.ok) return [];
    const d = await r.json();
    const list: ModelInfo[] = d.models || [];
    const usable = list.filter(
      (m) =>
        (m.supportedGenerationMethods || []).includes("generateContent") &&
        /gemini/.test(m.name) &&
        !/embedding|tts|image|a2i|deep-research|robotics/i.test(m.name)
    );
    const clean = (m: ModelInfo) => m.name.replace("models/", "");
    const ordered = [
      ...usable.filter((m) => /flash/.test(m.name) && !/preview/.test(m.name)),
      ...usable.filter((m) => /flash/.test(m.name) && /preview/.test(m.name)),
      ...usable.filter((m) => /pro/.test(m.name)),
    ].map(clean);
    return [...new Set(ordered)].slice(0, 4);
  } catch {
    return [];
  }
}

function friendlyError(raw: string): string {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("quota") || msg.includes("rate") || msg.includes("429")) {
    return "AI is busy (quota limit). Try again in ~1 minute.";
  }
  if (msg.includes("api key") || msg.includes("invalid") || msg.includes("401") || msg.includes("403")) {
    return "AI key error. Please contact support.";
  }
  if (msg.includes("safety") || msg.includes("blocked")) {
    return "Topic blocked by safety filter. Try another topic.";
  }
  if (msg.includes("timeout") || msg.includes("aborted")) {
    return "AI took too long. Try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Check your connection.";
  }
  return "AI is temporarily unavailable. Try again in a few seconds.";
}

export async function POST(req: Request) {
  try {
    const { topic, count = 5 } = await req.json();
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }
    if (!topic) {
      return NextResponse.json({ error: "Enter a topic first." }, { status: 400 });
    }

    const numQuestions = Math.min(10, Math.max(1, Number(count) || 5));

    const prompt = `You are a teacher. Create ${numQuestions} multiple-choice questions about "${topic}".
    Reply ONLY with a valid JSON array (no markdown):
    [{"q":"question text","options":["A","B","C","D"],"answer":0,"explain":"one line why correct"}]
    "answer" is the index (0-3) of the correct option.`;

    // Get candidates, but ALWAYS have at least the default model
    let candidates = await getCandidates(key);
    if (candidates.length === 0) {
      candidates = [DEFAULT_MODEL];
    } else if (!candidates.includes(DEFAULT_MODEL)) {
      candidates = [DEFAULT_MODEL, ...candidates];
    }

    let data: any = null;
    let lastError = "";
    for (const model of candidates) {
      try {
        const r = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
          },
          25000
        );
        data = await r.json();
        if (data.candidates && data.candidates.length > 0) break;
        lastError = data?.error?.message || `model ${model} failed`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "network error";
      }
    }

    if (!data?.candidates?.length) {
      return NextResponse.json(
        { error: friendlyError(lastError) },
        { status: 500 }
      );
    }

    let text = data.candidates[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) text = match[0];

    try {
      const questions = JSON.parse(text);
      return NextResponse.json({ questions });
    } catch {
      return NextResponse.json({ error: "Could not parse quiz. Try again." }, { status: 500 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json(
      { error: friendlyError(msg) },
      { status: 500 }
    );
  }
}