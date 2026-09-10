// Minimal in-process recurring job runner. BullMQ/Redis replaces this in
// staging/production (QUEUE_DRIVER=bullmq); job handlers are reused.
export type JobHandler = () => Promise<void> | void;

interface RegisteredJob {
  name: string;
  intervalMs: number;
  handler: JobHandler;
  timer?: NodeJS.Timeout;
  running?: boolean;
}

class InlineQueue {
  private jobs = new Map<string, RegisteredJob>();

  register(name: string, intervalMs: number, handler: JobHandler, runImmediately = false) {
    if (this.jobs.has(name)) return;
    const job: RegisteredJob = { name, intervalMs, handler };
    job.timer = setInterval(() => void this.run(job), intervalMs);
    // Don't keep the process alive purely for the queue.
    job.timer.unref?.();
    this.jobs.set(name, job);
    if (runImmediately) void this.run(job);
  }

  private async run(job: RegisteredJob) {
    if (job.running) return;
    job.running = true;
    try {
      await job.handler();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ level: 'error', msg: 'job failed', job: job.name, error: String(e) }));
    } finally {
      job.running = false;
    }
  }

  async runOnce(name: string) {
    const job = this.jobs.get(name);
    if (job) await this.run(job);
  }

  async close() {
    for (const job of this.jobs.values()) if (job.timer) clearInterval(job.timer);
    this.jobs.clear();
  }
}

export const inlineQueue = new InlineQueue();
