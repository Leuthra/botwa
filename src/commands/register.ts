import * as fs from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import cmd from "./map.js";
import chokidar from "chokidar";

class CmdRegis {
  public directory: string;

  constructor(dir: string) {
    this.directory = resolve(dir);
  }

  private async scann(
    dir: string = this.directory,
    result: string[] = [],
  ): Promise<string[]> {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dir, file.name);
      if (file.isDirectory()) {
        await this.scann(fullPath, result);
      } else if (
        file.isFile() &&
        (file.name.endsWith(".ts") || file.name.endsWith(".js"))
      ) {
        result.push(fullPath);
      }
    }
    return result;
  }

  public async load(): Promise<void> {
    if (!fs.existsSync(this.directory)) {
      console.log(`Command directory does not exist: ${this.directory}`);
      console.log(`Creating directory: ${this.directory}`);
      fs.mkdirSync(this.directory, { recursive: true });
    }

    cmd.reset();
    const files: string[] = await this.scann();

    for (let file of files) {
      try {
        if (!fs.existsSync(file)) {
          console.error(`Command file does not exist: ${file}`);
          continue;
        }

        const timestamp = Date.now();
        const fileUrl = pathToFileURL(file).href;
        await import(`${fileUrl}?t=${timestamp}`);
      } catch (e: unknown) {
        console.error(
          `Error loading command from ${file}:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
    console.log(`Successfully loaded ${cmd.size()} commands!`);
  }

  public async watch(): Promise<void> {
    if (!fs.existsSync(this.directory)) {
      console.log(`Command directory does not exist: ${this.directory}`);
      console.log(`Creating directory: ${this.directory}`);
      fs.mkdirSync(this.directory, { recursive: true });
    }

    console.log(`Watching command directory: ${this.directory}`);

    chokidar
      .watch(this.directory, { ignoreInitial: true })
      .on("add", async (path) => {
        console.log(
          `\x1b[33m[WATCH]\x1b[0m New command file detected: ${path}`,
        );
        await this.reloadCommands();
      })
      .on("change", async (path) => {
        console.log(`\x1b[33m[WATCH]\x1b[0m Command file changed: ${path}`);
        await this.reloadCommands();
      })
      .on("unlink", async (path) => {
        console.log(`\x1b[33m[WATCH]\x1b[0m Command file deleted: ${path}`);
        await this.reloadCommands();
      })
      .on("error", (error) => {
        console.error(
          `\x1b[31m[ERROR]\x1b[0m Error watching directory:`,
          error,
        );
      });
  }

  private reloadTimeout: NodeJS.Timeout | null = null;

  private reloadCommands(): void {
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
    }

    this.reloadTimeout = setTimeout(async () => {
      try {
        await this.load();
        console.log(`\x1b[32m[SUCCESS]\x1b[0m Commands reloaded successfully!`);
      } catch (error) {
        console.error(
          `\x1b[31m[ERROR]\x1b[0m Failed to reload commands:`,
          error,
        );
      }
    }, 1000);
  }
}

export default new CmdRegis("./src/plugins");
