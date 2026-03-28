"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDraft = generateDraft;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'moonshotai/kimi-k2.5';
const SOUL_PATH = path_1.default.join(__dirname, 'SOUL.md');
async function generateDraft(input) {
    const soul = fs_1.default.readFileSync(SOUL_PATH, 'utf-8');
    const systemContent = `You are Nex, the NexusClaw community agent.
Your SOUL.md defines your identity, voice, and restrictions.
Read it carefully and follow it exactly.

SOUL.md:
${soul}

Generate a ${input.postType} post in ${input.language} based on the technical update provided.
Follow the post format exactly: Hook / Body / CTA / Tags.
Never promise prices, returns, or specific timelines without data.
Always be energetic but credible.
Output ONLY the post text, nothing else. No preamble, no explanation.`;
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
                { role: 'system', content: systemContent },
                { role: 'user', content: `Technical update: ${input.techUpdate}\n\nGenerate the community post now.` }
            ]
        })
    });
    const data = await response.json();
    const draft = data.choices[0].message.content.trim();
    return {
        draft,
        postType: input.postType,
        language: input.language,
        requiresApproval: true,
        generatedAt: new Date().toISOString(),
        reviewNote: 'First 30 days: all posts require Tiago approval before publishing'
    };
}
if (require.main === module) {
    const example = {
        techUpdate: "Fixed fee calculation bug, tests green, saves 12% gas",
        postType: 'update',
        language: 'en',
        urgency: 'routine'
    };
    generateDraft(example).then(output => {
        console.log(JSON.stringify(output, null, 2));
    }).catch(console.error);
}
