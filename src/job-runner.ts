import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import treeKill from "tree-kill";

export type Job = {
  id: string;
  chatId: number;
  prompt: string;
};

type JobRunnerEvents = {
  chunk: [payload: { job: Job; data: Buffer }];
  jobEnd: [payload: { job: Job; code: number | null; signal: NodeJS.Signals | null }];
  jobStart: [job: Job];
};

export class JobRunner extends EventEmitter<JobRunnerEvents> {
  private queue: Job[] = [];
  private child: ChildProcess | null = null;
  private runningJob: Job | null = null;

  constructor(
    private readonly workdir: string,
    private readonly cursorBin: string,
    private readonly argsBeforePrompt: string[],
  ) {
    super();
  }

  enqueue(job: Job): { position: number } {
    if (this.child) {
      this.queue.push(job);
      return { position: this.queue.length };
    }
    void this.run(job);
    return { position: 0 };
  }

  cancelCurrent(): boolean {
    if (!this.child?.pid) return false;
    treeKill(this.child.pid, "SIGTERM");
    return true;
  }

  getStatus(): { busy: boolean; queueLength: number; currentId: string | null } {
    return {
      busy: this.child !== null,
      queueLength: this.queue.length,
      currentId: this.runningJob?.id ?? null,
    };
  }

  private async run(job: Job): Promise<void> {
    this.runningJob = job;
    this.emit("jobStart", job);
    const args = [...this.argsBeforePrompt, job.prompt];
    const child = spawn(this.cursorBin, args, {
      cwd: this.workdir,
      env: process.env,
      shell: false,
    });
    this.child = child;
    child.stdout?.on("data", (d: Buffer) =>
      this.emit("chunk", { job, data: Buffer.isBuffer(d) ? d : Buffer.from(d) }),
    );
    child.stderr?.on("data", (d: Buffer) =>
      this.emit("chunk", { job, data: Buffer.isBuffer(d) ? d : Buffer.from(d) }),
    );
    await new Promise<void>((resolve) => {
      child.on("close", (code, signal) => {
        this.emit("jobEnd", { job, code, signal });
        this.child = null;
        this.runningJob = null;
        resolve();
      });
    });
    const next = this.queue.shift();
    if (next) void this.run(next);
  }
}
