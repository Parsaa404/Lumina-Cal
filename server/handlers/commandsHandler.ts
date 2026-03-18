import { Context } from 'grammy';

const COMMANDS = [
  { cmd: '/start',      desc: 'Sign up, setup profile + personalized AI plan' },
  { cmd: '/water',      desc: 'Log water intake via quick-add buttons (e.g. /water 500)' },
  { cmd: '/weight',     desc: 'Weekly weigh-in + adaptive advice + ETA to goal' },
  { cmd: '/target',     desc: 'Set a target weight goal (e.g. /target 70)' },
  { cmd: '/trend',      desc: 'ASCII weight trend chart + ETA prediction' },
  { cmd: '/activity',   desc: 'Smart exercise logging (Walking, Gym, Swimming, etc.)' },
  { cmd: '/scan',       desc: 'Barcode scanner — take a photo to log food' },
  { cmd: '/fast',       desc: 'Intermittent fasting tracker (/fast start | /fast stop)' },
  { cmd: '/progress',   desc: 'Body photo gallery (send photo with caption "progress")' },
  { cmd: '/coach',      desc: 'AI coach analysis of your past 7 days' },
  { cmd: '/repeat',     desc: 'One-tap re-log for any of your last 6 meals' },
  { cmd: '/predict',    desc: 'AI prediction of your total calories for today' },
  { cmd: '/report',     desc: 'Detailed 30-day monthly nutrition report' },
  { cmd: '/badges',     desc: 'View all earned achievement badges' },
  { cmd: '/history',    desc: 'Diet analytics: top foods, meal timing, fasting windows' },
  { cmd: '/weekly',     desc: 'Weekly progress report with ASCII charts' },
  { cmd: '/streak',     desc: 'Current logging streak + earned stretch badges' },
  { cmd: '/plan',       desc: 'AI 7-day personalized meal planner' },
  { cmd: '/groceries',  desc: 'Smart shopping list based on recent meals' },
  { cmd: '/quickadd',   desc: 'One-tap log from your 6 most frequent foods' },
  { cmd: '/recipe',     desc: 'Calculate macros for custom recipe (e.g. /recipe chicken rice)' },
  { cmd: '/export',     desc: 'Download full meal history as a CSV file' },
  { cmd: '/ask',        desc: 'Consult the AI nutritionist (e.g. /ask is keto healthy?)' },
  { cmd: '/commands',   desc: 'List all available bot commands with descriptions' },
];

export async function handleCommands(ctx: Context) {
  let msg = `📋 *All Lumina\\-Cal Commands*\n\n`;

  for (const { cmd, desc } of COMMANDS) {
    // Escape special chars for MarkdownV2
    const escapedCmd  = cmd.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    const escapedDesc = desc.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    msg += `${escapedCmd}\n_${escapedDesc}_\n\n`;
  }

  await ctx.reply(msg, { parse_mode: 'MarkdownV2' });
}
