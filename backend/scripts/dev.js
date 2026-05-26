import { spawn } from "node:child_process";

const processes = [];

const startProcess = (label, args) => {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`);
    } else {
      console.log(`[${label}] exited with code ${code}`);
    }

    const failed = code !== 0 && code !== null;
    if (failed) {
      shutdown(code ?? 1);
    }
  });

  processes.push(child);
  return child;
};

let shuttingDown = false;

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(code);
};

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

startProcess("server", ["server.js"]);
startProcess("worker", ["workers/generation.worker.js"]);
