import type { ProcMsg } from "../utils/msg.js";

export interface CommandContext {
  m: ProcMsg;
  sock: any;
  store: any;
  text: string;
  args: string[];
  command: string;
  isCmd: boolean;
}

export interface Command {
  name: string;
  category?: string[];
  alias?: string[];
  isOwner?: boolean;
  isGroup?: boolean;
  isPrivate?: boolean;
  isSelf?: boolean;
  isAdmin?: boolean;
  isBotAdmin?: boolean;
  isPremium?: boolean;
  mustRegister?: boolean;
  useLimit?: boolean | number;
  desc?: string;
  usage?: string;
  example?: string;
  run?: (ctx: CommandContext) => Promise<void> | void;
  middleware?: (ctx: CommandContext) => Promise<void> | void;
}

class CmdMap {
  private map = new Map<string, Command>();
  private list: Command[] = [];

  public values(): Command[] {
    return this.list;
  }

  public find(name: string): Command | undefined {
    return this.map.get(name.toLowerCase().trim());
  }

  public add(content: Partial<Command>): void {
    const cmd = content as Command;
    this.list.push(cmd);
    if (cmd.name) {
      this.map.set(cmd.name.toLowerCase().trim(), cmd);
    }
    if (cmd.alias) {
      for (const alias of cmd.alias) {
        this.map.set(alias.toLowerCase().trim(), cmd);
      }
    }
  }

  public reset(): void {
    this.map.clear();
    this.list = [];
  }

  public size(): number {
    return this.list.length;
  }
}

export default new CmdMap();
