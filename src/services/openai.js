// OpenAI service for script generation

import OpenAI from 'openai';

// Lazy initialization of OpenAI client
// Only creates the client when actually needed
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // Only for frontend-only MVP
  });
};

export const generateScript = async (systemPrompt, chapterTitle, chapterNumber, bookName) => {
  try {
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Latest and best OpenAI model
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Generate a script for Chapter ${chapterNumber}: "${chapterTitle}" for the book "${bookName}". The script should be engaging, concise, and suitable for a short-form video format.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating script:', error);
    
    if (error.message.includes('API key')) {
      throw error; // Re-throw the API key error as-is
    }
    
    throw new Error('Failed to generate script. Please check your OpenAI API key and try again.');
  }
};

