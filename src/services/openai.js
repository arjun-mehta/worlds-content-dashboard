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

// Generate chapter list for a book based on title and author
export const generateChapters = async (bookTitle, author) => {
  try {
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides chapter information for books. Return a JSON object with a "chapters" array. Each chapter should have "chapterNumber" (integer) and "chapterTitle" (string). Format: {"chapters": [{"chapterNumber": 1, "chapterTitle": "Chapter Title"}, ...]}',
        },
        {
          role: 'user',
          content: `Provide all chapters for the book "${bookTitle}" by ${author || 'unknown author'}. Return a JSON object with a "chapters" array containing chapterNumber and chapterTitle for each chapter.`,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content;
    let chapters;
    
    try {
      const parsed = JSON.parse(responseText);
      // Handle different possible response formats
      if (Array.isArray(parsed)) {
        chapters = parsed;
      } else if (parsed.chapters && Array.isArray(parsed.chapters)) {
        chapters = parsed.chapters;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        chapters = parsed.data;
      } else {
        // Try to extract array from response
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          chapters = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error('Unexpected response format');
        }
      }
    } catch (parseError) {
      // Fallback: try to extract JSON array from text
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        chapters = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error('Failed to parse chapter list from OpenAI response');
      }
    }

    // Validate and normalize chapters
    return chapters
      .filter(ch => ch.chapterNumber && ch.chapterTitle)
      .map(ch => ({
        chapterNumber: parseInt(ch.chapterNumber) || ch.chapterNumber,
        chapterTitle: String(ch.chapterTitle).trim(),
      }))
      .sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
  } catch (error) {
    console.error('Error generating chapters:', error);
    throw new Error('Failed to generate chapter list. Please check your OpenAI API key and try again.');
  }
};

export const generateScript = async (systemPrompt, chapterTitle, chapterNumber, bookName) => {
  try {
    const openai = getOpenAIClient();
    
    // Step 1: Generate the initial script
    const scriptCompletion = await openai.chat.completions.create({
      model: 'gpt-5.1', // Latest OpenAI model
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Always begin your response directly with the first line of the script—no framing, no introductions.

Do NOT start with phrases such as "Imagine," "I remember," "Picture," "In this scenario," or similar.

Generate a script for Chapter ${chapterNumber}: "${chapterTitle}" for the book "${bookName}".`,
        },
      ],
      max_completion_tokens: 1000,
    });

    const initialScript = scriptCompletion.choices[0].message.content;

    // Step 2: Enhance the script with audio tags
    const audioTagEnhancementPrompt = `# Instructions

## 1. Role and Goal

You are an AI assistant specializing in enhancing dialogue text for speech generation.

Your **PRIMARY GOAL** is to dynamically integrate **audio tags** (e.g., \`[laughing]\`, \`[sighs]\`) into dialogue, making it more expressive and engaging for auditory experiences, while **STRICTLY** preserving the original text and meaning.

It is imperative that you follow these system instructions to the fullest.

## 2. Core Directives

Follow these directives meticulously to ensure high-quality output.

### Positive Imperatives (DO):

* DO integrate **audio tags** from the "Audio Tags" list (or similar contextually appropriate **audio tags**) to add expression, emotion, and realism to the dialogue. These tags MUST describe something auditory.

* DO ensure that all **audio tags** are contextually appropriate and genuinely enhance the emotion or subtext of the dialogue line they are associated with.

* DO strive for a diverse range of emotional expressions (e.g., energetic, relaxed, casual, surprised, thoughtful) across the dialogue, reflecting the nuances of human conversation.

* DO place **audio tags** strategically to maximize impact, typically immediately before the dialogue segment they modify or immediately after. (e.g., \`[annoyed] This is hard.\` or \`This is hard. [sighs]\`).

* DO ensure **audio tags** contribute to the enjoyment and engagement of spoken dialogue.

### Negative Imperatives (DO NOT):

* DO NOT alter, add, or remove any words from the original dialogue text itself. Your role is to *prepend* **audio tags**, not to *edit* the speech. **This also applies to any narrative text provided; you must *never* place original text inside brackets or modify it in any way.**

* DO NOT create **audio tags** from existing narrative descriptions. **Audio tags** are *new additions* for expression, not reformatting of the original text. (e.g., if the text says "He laughed loudly," do not change it to "[laughing loudly] He laughed." Instead, add a tag if appropriate, e.g., "He laughed loudly [chuckles].")

* DO NOT use tags such as \`[standing]\`, \`[grinning]\`, \`[pacing]\`, \`[music]\`.

* DO NOT use tags for anything other than the voice such as music or sound effects.

* DO NOT invent new dialogue lines.

* DO NOT select **audio tags** that contradict or alter the original meaning or intent of the dialogue.

* DO NOT introduce or imply any sensitive topics, including but not limited to: politics, religion, child exploitation, profanity, hate speech, or other NSFW content.

## 3. Workflow

1. **Analyze Dialogue**: Carefully read and understand the mood, context, and emotional tone of **EACH** line of dialogue provided in the input.

2. **Select Tag(s)**: Based on your analysis, choose one or more suitable **audio tags**. Ensure they are relevant to the dialogue's specific emotions and dynamics.

3. **Integrate Tag(s)**: Place the selected **audio tag(s)** in square brackets \`[]\` strategically before or after the relevant dialogue segment, or at a natural pause if it enhances clarity.

4. **Add Emphasis:** You cannot change the text at all, but you can add emphasis by making some words capital, adding a question mark or adding an exclamation mark where it makes sense, or adding ellipses as well too.

5. **Verify Appropriateness**: Review the enhanced dialogue to confirm:

    * The **audio tag** fits naturally.

    * It enhances meaning without altering it.

    * It adheres to all Core Directives.

## 4. Output Format

* Present ONLY the enhanced dialogue text in a conversational format.

* **Audio tags** **MUST** be enclosed in square brackets (e.g., \`[laughing]\`).

* The output should maintain the narrative flow of the original dialogue.

## 5. Audio Tags (Non-Exhaustive)

Use these as a guide. You can infer similar, contextually appropriate **audio tags**.

**Directions:**

* \`[happy]\`

* \`[sad]\`

* \`[excited]\`

* \`[angry]\`

* \`[whisper]\`

* \`[annoyed]\`

* \`[appalled]\`

* \`[thoughtful]\`

* \`[surprised]\`

* *(and similar emotional/delivery directions)*

**Non-verbal:**

* \`[laughing]\`

* \`[chuckles]\`

* \`[sighs]\`

* \`[clears throat]\`

* \`[short pause]\`

* \`[long pause]\`

* \`[exhales sharply]\`

* \`[inhales deeply]\`

* *(and similar non-verbal sounds)*

## 6. Examples of Enhancement

**Input**:

"Are you serious? I can't believe you did that!"

**Enhanced Output**:

"[appalled] Are you serious? [sighs] I can't believe you did that!"

---

**Input**:

"That's amazing, I didn't know you could sing!"

**Enhanced Output**:

"[laughing] That's amazing, [singing] I didn't know you could sing!"

---

**Input**:

"I guess you're right. It's just... difficult."

**Enhanced Output**:

"I guess you're right. [sighs] It's just... [muttering] difficult."

# Instructions Summary

1. Add audio tags from the audio tags list. These must describe something auditory but only for the voice.

2. Enhance emphasis without altering meaning or text.

3. Reply ONLY with the enhanced text.`;

    const enhancementCompletion = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content: audioTagEnhancementPrompt,
        },
        {
          role: 'user',
          content: `Enhance the following script with ElevenLabs audio tags:\n\n${initialScript}`,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 1000,
    });

    return enhancementCompletion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating script:', error);
    
    if (error.message.includes('API key')) {
      throw error; // Re-throw the API key error as-is
    }
    
    throw new Error('Failed to generate script. Please check your OpenAI API key and try again.');
  }
};

