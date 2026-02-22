import cmd from "./map.js";
import type { Command } from "./map.js";
import type { ProcMsg } from '../utils/msg.js';
import type { CommandContext } from "./map.js";

class CommandHandler {
  async handleCommand(
    processedMessage: ProcMsg,
    socket: any,
    store: any,
    customSend?: (jid: string, content: any, options?: any) => Promise<any>,
  ): Promise<void> {
    const ownerNum = (process.env.OWNER || "").split("@")[0];
    if (process.env.isSelf === 'true' && processedMessage.sender.split("@")[0] !== ownerNum) return;

    const messageText = processedMessage.body.trim() || "";
    const parseResult = this.parseCommand(messageText);
    const commandName = parseResult[0];
    const args = parseResult[1];
    const text = args.join(" ") || "";

    const effectiveSock = customSend
      ? { ...socket, sendMessage: customSend }
      : socket;

    const context: CommandContext = {
      m: processedMessage,
      sock: effectiveSock,
      store,
      text,
      args,
      command: commandName,
      isCmd: this.isCommand(messageText),
    };

    for (const command of cmd.values()) {
      if (command.middleware) {
        await Promise.resolve(command.middleware(context));
      }
    }

    if (!this.isCommand(messageText)) return;

    const foundCommand = cmd.find(commandName);
    if (!foundCommand) return;

    try {
      if (foundCommand.run) {
        if (!this.checkPermissions(foundCommand, processedMessage)) {
          processedMessage.reply("You do not have permission to use this command.");
          return;
        }
        await Promise.resolve(foundCommand.run(context));
      }
    } catch (error) {
      console.error(`Error executing command '${commandName}':`, error);
      processedMessage.reply(
        `❌ Error: ${(error as Error).message}`,
      );
    }
  }

  private isCommand(text: string): boolean {
    return /^(!|\/|\.)/.test(text);
  }

  private parseCommand(text: string): [string, string[]] {
    const args = text.slice(1).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase() || "";
    return [commandName, args];
  }

  private checkPermissions(command: Command, message: ProcMsg): boolean {
    const ownerNum = (process.env.OWNER || "").split("@")[0];
    if (command.isOwner && message.sender.split("@")[0] !== ownerNum) return false;
    if (command.isGroup && !message.isGroup) return false;
    if (command.isPrivate && message.isGroup) return false;
    if (command.isSelf && !message.fromMe) return false;
    return true;
  }
}

export default new CommandHandler();
