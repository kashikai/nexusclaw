require("dotenv").config({ path: '../.env' });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO = process.env.TIAGO_TELEGRAM_ID;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

async function getGitActivity() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 1);
    const sinceStr = since.toISOString().split('T')[0];
    
    const log = execSync(
      `git -C ~/.openclaw/workspace/nexusclaw log --oneline --since="${sinceStr} 00:00" --until="now"`,
      { encoding: 'utf-8' }
    ).trim();
    
    return log || 'No commits in the last 24h';
  } catch(e) {
    return 'Could not fetch git log';
  }
}

async function getMoltbookActivity() {
  try {
    const r = await fetch('https://www.moltbook.com/api/v1/agents/me', {
      headers: { 'Authorization': 'Bearer ' + MOLTBOOK_KEY }
    });
    const agent = await r.json();
    return {
      karma: agent.karma || 0,
      posts: agent.post_count || 0,
      followers: agent.follower_count || 0
    };
  } catch(e) {
    return { karma: 0, posts: 0, followers: 0, error: e.message };
  }
}

async function getApprovedQueue() {
  try {
    const queuePath = path.join(__dirname, '../agents/nex/approved-queue.json');
    const queue = fs.existsSync(queuePath)
      ? JSON.parse(fs.readFileSync(queuePath, 'utf-8'))
      : [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPosts = queue.filter(p => new Date(p.approvedAt) >= today);
    return todayPosts.length;
  } catch(e) {
    return 0;
  }
}

async function sendReport() {
  const [gitLog, moltbook, nexPosts] = await Promise.all([
    getGitActivity(),
    getMoltbookActivity(),
    getApprovedQueue()
  ]);

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  
  const commits = gitLog === 'No commits in the last 24h' 
    ? '😴 No commits' 
    : gitLog.split('\n').map(l => `• ${l}`).join('\n');

  const report = `🦞⚡ *NEXUSCLAW DAILY REPORT*
📅 ${now} JST

*HANNA — Dev Activity (last 24h):*
${commits}

*NEX — Moltbook Status:*
• Posts today: ${nexPosts}
• Total posts: ${moltbook.posts}
• Karma: ${moltbook.karma}
• Followers: ${moltbook.followers}
• Profile: https://www.moltbook.com/u/nexclaw002

*CONTRACT — Base Mainnet:*
• Address: \`0xFC68E8...90E6\`
• Basescan: https://basescan.org/address/0xFC68E8aEe3A2e717DebBBBd9f6b2Db5Dd3Ed90E6

_Report gerado automaticamente às 9:00 JST_ 🦞`;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TIAGO,
      text: report,
      parse_mode: 'Markdown'
    })
  });

  const data = await res.json();
  if (data.ok) {
    console.log('✅ Daily report sent successfully');
  } else {
    console.error('❌ Failed to send report:', data);
  }
}

sendReport();
