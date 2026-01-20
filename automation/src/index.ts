import dotenv from 'dotenv';
import { Worker } from './workers/worker';

dotenv.config();

async function main() {
  const worker = new Worker();
  await worker.start();
}

main().catch(console.error);
