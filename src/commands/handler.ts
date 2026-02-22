import cmd from "./map.js";
import type { Command } from "./map.js";
import type { ProcMsg } from "../utils/msg.js";
import type { CommandContext } from "./map.js";
import { UsersDB } from "../utils/db.js";

class CommandHandler {
  private rateLimit = new Map<string, number>();
  private RATE_LIMIT_MS = 3000;

  async handleCommand(
    processedMessage: ProcMsg,
    socket: any,
    store: any,
    customSend?: (jid: string, content: any, options?: any) => Promise<any>,
  ): Promise<void> {
    const ownerNum = (process.env.OWNER || "").split("@")[0];

    let realSender = processedMessage.sender;
    if (processedMessage.isGroup && processedMessage.metadata?.participants) {
      const match = processedMessage.metadata.participants.find(
        (p: any) => p.id === realSender || p.lid === realSender,
      );
      if (match && match.id) realSender = match.id;
    }
    const realSenderNum = realSender.split("@")[0] || "";

    const isSelfMode =
      String(process.env.isSelf).toLowerCase() === "true" ||
      String(process.env.IS_SELF).toLowerCase() === "true";

    if (isSelfMode && realSenderNum !== ownerNum) return;

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

    if (realSenderNum !== ownerNum) {
      const lastCall = this.rateLimit.get(realSenderNum) || 0;
      const now = Date.now();
      if (now - lastCall < this.RATE_LIMIT_MS) {
        processedMessage.reply(
          `⏳ Don't spam! Please wait ${Math.ceil((this.RATE_LIMIT_MS - (now - lastCall)) / 1000)} more second(s).`,
        );
        return;
      }
      this.rateLimit.set(realSenderNum, now);
    }

    try {
      if (foundCommand.run) {
        const hasPerms = await this.checkPermissions(
          foundCommand,
          processedMessage,
          effectiveSock,
          realSenderNum,
        );
        if (!hasPerms) return;

        const isOwner = realSenderNum === ownerNum;

        let user = UsersDB.get(realSenderNum);
        if (!user) {
          user = {
            id: realSenderNum,
            registered: 0,
            name: "",
            limit_count: 25,
            is_premium: 0,
            premium_expired: 0,
          };
          UsersDB.upsert(user);
        }

        if (
          user.is_premium === 1 &&
          user.premium_expired !== 0 &&
          Date.now() > user.premium_expired
        ) {
          user.is_premium = 0;
          user.limit_count = 25;
          user.premium_expired = 0;
          UsersDB.upsert(user);
          effectiveSock.sendMessage(processedMessage.chat, {
            text: "⚠️ Your Premium subscription has expired. You are now a Regular User.",
          });
        }

        if (foundCommand.mustRegister && user.registered === 0) {
          processedMessage.reply(
            `❌ You are not registered in the bot's database.\n\nType *.register <YourName>* to register and get daily limits.`,
          );
          return;
        }

        if (foundCommand.isPremium && user.is_premium === 0) {
          processedMessage.reply(
            `🌟 This feature is exclusive to Premium Users!\n\nContact the owner to extend your subscription.`,
          );
          return;
        }

        let limitDeducted = 0;
        if (foundCommand.useLimit && user.is_premium === 0 && !isOwner) {
          const limitRequired =
            typeof foundCommand.useLimit === "number"
              ? foundCommand.useLimit
              : 1;
          if (user.limit_count < limitRequired) {
            processedMessage.reply(
              `⚠️ Your limit has run out.\n_*(Remaining: ${user.limit_count}, Required: ${limitRequired})*_\n\nLimits will automatically reset at 00:00 WIB. Upgrade to VIP/Premium for unlimited usage!`,
            );
            return;
          }
          limitDeducted = limitRequired;
        }

        await Promise.resolve(foundCommand.run(context));

        if (limitDeducted > 0) {
          user.limit_count -= limitDeducted;
          UsersDB.updateLimit(user.id, user.limit_count);
        }
      }
    } catch (error) {
      console.error(`Error executing command '${commandName}':`, error);
      processedMessage.reply(`❌ Error: ${(error as Error).message}`);
    }
  }

  public isCommand(text: string): boolean {
    return /^(!|\/|\.)/.test(text);
  }

  private parseCommand(text: string): [string, string[]] {
    const args = text.slice(1).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase() || "";
    return [commandName, args];
  }

  private async checkPermissions(
    command: Command,
    message: ProcMsg,
    sock: any,
    realSenderNum: string,
  ): Promise<boolean> {
    const ownerNum = (process.env.OWNER || "").split("@")[0];
    const isOwner = realSenderNum === ownerNum;

    if (command.isOwner && !isOwner) {
      message.reply("❌ You do not have permission to use this command.");
      return false;
    }
    if (command.isGroup && !message.isGroup) {
      message.reply("❌ This command can only be used in groups.");
      return false;
    }
    if (command.isPrivate && message.isGroup) {
      message.reply("❌ This command can only be used in private chats.");
      return false;
    }
    if (command.isSelf && !message.fromMe) return false;

    if (message.isGroup && (command.isAdmin || command.isBotAdmin)) {
      try {
        const groupMetadata = await sock.groupMetadata(message.chat);
        const participants = groupMetadata.participants;

        if (command.isAdmin && !isOwner) {
          const sender = participants.find(
            (p: any) => p.id === message.sender || p.lid === message.sender,
          );
          const isAdmin =
            sender?.admin === "admin" || sender?.admin === "superadmin";
          if (!isAdmin) {
            message.reply("❌ You must be a Group Admin.");
            return false;
          }
        }

        if (command.isBotAdmin) {
          const { jidNormalizedUser } = await import("baileys");
          const botJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : "";
          const botNum = botJid.split("@")[0];
          const bot = participants.find(
            (p: any) =>
              p.id === botJid ||
              (p.phoneNumber &&
                (p.phoneNumber === botJid ||
                  p.phoneNumber.startsWith(botNum + "@"))) ||
              p.id.startsWith(botNum + "@") ||
              p.id.startsWith(botNum + ":"),
          );
          const isBotAdmin =
            bot?.admin === "admin" || bot?.admin === "superadmin";
          if (!isBotAdmin) {
            message.reply("❌ I must be an Admin first.");
            return false;
          }
        }
      } catch (err) {
        console.error("Error fetching group metadata for permissions:", err);
        message.reply("❌ Failed to verify group permissions.");
        return false;
      }
    }

    return true;
  }
}

export default new CommandHandler();
