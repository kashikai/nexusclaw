import { generateDraft } from './generate-draft';

async function test() {
  const result = await generateDraft({
    techUpdate: "Hanna shipped mainnet contract with 50/30/20 fee split. Tests green.",
    postType: 'update',
    language: 'en',
    urgency: 'milestone'
  });

  console.log('🦞⚡ NEX TEST OUTPUT');
  console.log('====================');
  console.log(result.draft);
  console.log('');
  console.log('Requires approval:', result.requiresApproval);
  console.log('Generated at:', result.generatedAt);
}

test().catch(console.error);
