// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

serve(async (req: Request): Promise<Response> => {

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  // OPTIONS Request Handle
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {

    // Request Body Parse
    const body = await req.json().catch(() => ({}));

    const {
      subject = "সাধারণ জ্ঞান",
      question = "",
      correct = "",
      selected = "",
      isCorrect = false
    } = body as Record<string, unknown>;

    // Validation
    if (!question || !correct) {
      return new Response(JSON.stringify({
        error: "missing_question_or_correct"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // API Key Check
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({
        error: "missing_server_configuration"
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // AI Prompt
    const systemInstruction =
      "You are an expert educational tutor assistant for a quiz application. You explain quiz answers clearly in fluent Bengali.";

    const prompt = `
তুমি একজন অভিজ্ঞ শিক্ষক।

বিষয়:
${subject}

প্রশ্ন:
${question}

সঠিক উত্তর:
${correct}

শিক্ষার্থী যে উত্তর নির্বাচন করেছে:
${selected}

শিক্ষার্থীর উত্তর ${isCorrect ? 'সঠিক' : 'ভুল'}।

এখন নিচের নিয়ম অনুসরণ করে ব্যাখ্যা দাও:

১। কেন সঠিক উত্তর সঠিক তা ব্যাখ্যা করো।
২। ভুল উত্তর হলে কেন ভুল তা বলো।
৩। সহজ ভাষায় শেখাও।
৪। ৫ থেকে ৮ লাইনের মধ্যে রাখো।
৫। শুধুমাত্র বাংলা ব্যবহার করো।
৬। HTML এর <strong> এবং <br> ছাড়া অন্য কোনো tag ব্যবহার করবে না।
`;

    // Gemini Payload
    const requestPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction}\n\n${prompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500
      }
    };

    // Gemini API Call
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      }
    );

    const json = await resp.json().catch(() => ({}));

    // API Error
    if (!resp.ok) {

      console.log("Gemini API Error:", json);

      return new Response(JSON.stringify({
        text: "❌ AI explanation generate করতে সমস্যা হচ্ছে।"
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Safe Response Parse
    let text = "";

    try {

      text =
        json?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text || "")
          .join("") || "";

    } catch (e) {

      console.log("Parse Error:", e);

      text = "";
    }

    // Success Response
    if (text.trim() !== "") {

      return new Response(JSON.stringify({
        text: text.trim()
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Empty Response
    return new Response(JSON.stringify({
      text: "❌ AI explanation পাওয়া যায়নি।",
      debug: json
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {

    console.log("Server Error:", err);

    return new Response(JSON.stringify({
      error: "server_error",
      message: String(err)
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});