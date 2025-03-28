import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to add this to your .env.local file
});

export async function POST(request: Request) {
  try {
    const { systemInstruction, instructions, knowledgeSeed } =
      await request.json();

    console.log("Received request with:", {
      instructionsLength: instructions?.length,
      knowledgeSeedLength: knowledgeSeed?.length,
    });

    // Validate inputs
    if (!systemInstruction || !knowledgeSeed) {
      return NextResponse.json(
        { error: "Instructions and Knowledge Seed are required" },
        { status: 400 }
      );
    }

    // Call the OpenAI API with GPT-4o mini
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4o mini model
      messages: [
        {
          role: "system",
          content:
            systemInstruction ||
            "You are an AI assistant that generates YAML files based on instructions and knowledge seeds.",
        },
        {
          role: "user",
          content: `Instructions: ${instructions}\n\nKnowledge Seed:\n${knowledgeSeed}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log("API Response:", response); // Log the full response for debugging

    // Return the response
    return NextResponse.json({
      result: response.choices[0].message.content,
    });
  } catch (error: Error | unknown) {
    console.error("Error calling OpenAI API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process your request";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
