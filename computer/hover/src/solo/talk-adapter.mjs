import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const runner = fileURLToPath(new URL('./talk-runner.py', import.meta.url));
export async function talkReply(input = {}) {
  const message = String(input.message ?? '');
  const name = String(input.name ?? '');
  if (!message.trim()) throw new TypeError('Talk message is required');
  if (message.length > 16000 || name.length > 200) throw new RangeError('Talk input is too long');
  const { stdout } = await execute(process.env.SYNTHIA_TALK_PYTHON || 'python3', [runner, JSON.stringify({ message, name })], { timeout: 15000, maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout);
}
