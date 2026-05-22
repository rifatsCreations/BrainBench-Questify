// @ts-nocheck
// Supabase Edge Function - Secure Gemini Explain Proxy
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      subject = "সাধারণ জ্ঞান",
      question = "",
      correct = "",
      selected = "",
      isCorrect = false,
      fallback = ""
    } = body as Record<string, unknown>;

    if (!question || !correct) {
      return new Response(JSON.stringify({ error: "missing_question_or_correct" }), { status: 400, headers: corsHeaders });
    }

    const systemInstruction = "You are an expert educational tutor assistant for a quiz application. Answer each request in fluent Bengali as a helpful tutor. Explain the logic or rules accurately based on the question context and keep it short.";
    const prompt = `You are an expert tutor for an educational learning app.\nSubject: ${subject}\nQuestion: ${question}\nCorrect Answer: ${correct}\nUser Selected Answer: ${selected} (${isCorrect ? 'Correct' : 'Incorrect'})\n\nStrict Instructions:\n- Write the final explanation entirely in fluent Bengali.\n- Keep the response brief, friendly, and educational.\n- Use HTML formatting only with <br> and <strong> tags.\n- Do not use markdown backticks, code blocks, or markdown syntax.`;

    const requestPayload = {
      contents: [{
        parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
      }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'missing_server_configuration' }), { status: 500, headers: corsHeaders });
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      }
    );

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return new Response(JSON.stringify({
        error: 'gemini_api_error',
        geminiStatus: resp.status,
        geminiStatusText: resp.statusText,
        debug: json
      }), { status: 200, headers: corsHeaders }); // 502 এর বদলে ২০০ পাস করছি যাতে ফ্রন্টএন্ড স্মুথলি ফলব্যাক দেখায়
    }

    let text = null;
    if (json?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = json.candidates[0].content.parts[0].text;
    }

    if (typeof text === 'string' && text.trim() !== '') {
      return new Response(JSON.stringify({ text: text.trim() }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ text: fallback || " ব্যাখ্যা পাওয়া যায়নি।", debug: json }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'server_error', message: String(err) }), { status: 500, headers: corsHeaders });
  }
});