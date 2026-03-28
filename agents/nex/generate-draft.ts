const fs = require('fs');
const path = require('path');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'moonshotai/kimi-k2.5';
const SOUL_PATH = path.join(__dirname, 'SOUL.md');

interface DraftInput {
  techUpdate: string;
  postType: 'update' | 'vision' | 'engagement';
  language: 'en' | 'pt' | 'ko' | 'jp' | 'es';
}

interface DraftOutput {
  draft: string;
  postType: string;
  language: string;
  requiresApproval: boolean;
  generatedAt: string;
}

async function generateDraft(input: DraftInput): Promise<DraftOutput> {
  // Read SOUL.md
  const soul = fs.readFileSync(SOUL_PATH, 'utf-8');

  const systemPrompt = `You are Nex, the NexusClaw community agent.
Your SOUL.md defines your identity, voice, and restrictions.
Read it carefully and follow it exactly.

SOUL.md:
${soul}

Generate a ${input.postType} post in ${input.language} based on the technical update provided.
Follow the post format exactly: Hook / Body / CTA / Tags.
Never promise prices, returns, or specific timelines without data.
Always be energetic but credible.
Output ONLY the post text, nothing else. No preamble, no explanation.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexusclaw.vercel.app',
        'X-Title': 'NexusClaw Agent Nex'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Technical update: ${input.techUpdate}\n\nGenerate the community post now.` }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data: any = await response.json();
    const draft = data.choices[0].message.content.trim();

    return {
      draft,
      postType: input.postType,
      language: input.language,
      requiresApproval: true,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating draft:', error);
    // Fallback: return the raw tech update if API fails
    return {
      draft: `🦞⚡ Update:\n\n${input.techUpdate}\n\n#NexusClaw`,
      postType: input.postType,
      language: input.language,
      requiresApproval: true,
      generatedAt: new Date().toISOString()
    };
  }
}

// CLI test
if (require.main === module) {
  const testInput: DraftInput = {
    techUpdate: "Hanna just shipped mainnet contract with 50/30/20 fee split. All tests green!",
    postType: 'update',
    language: 'pt'
  };

  console.log('🦞⚡ Testing OpenRouter integration...');
  console.log('Input:', testInput.techUpdate);
  console.log('');

  generateDraft(testInput).then(output => {
    console.log('Generated draft:');
    console.log('================');
    console.log(output.draft);
    console.log('');
    console.log('Language:', output.language);
    console.log('Requires approval:', output.requiresApproval);
  }).catch(console.error);
}

module.exports = { generateDraft };
