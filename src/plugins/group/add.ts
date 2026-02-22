import cmd, { type CommandContext } from "../../commands/map.js";
import { jidNormalizedUser } from "baileys";

cmd.add({
  name: "add",
  alias: ["addmember"],
  category: ["group"],
  desc: "Add user(s) to the group",
  usage: "<phone_number>",
  isGroup: true,
  async run({ m, args, sock }: CommandContext) {
    const groupMetadata = await sock.groupMetadata(m.chat);
    const participants = groupMetadata.participants;

    const sender = participants.find(
      (p: any) => p.id === m.sender || p.lid === m.sender,
    );
    const isAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";
    const isOwner =
      (process.env.OWNER || "").split("@")[0] ===
      (sender?.id || m.sender).split("@")[0];
    if (!isAdmin && !isOwner) return m.reply("❌ You must be a Group Admin.");

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
    const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";
    if (!isBotAdmin) return m.reply("❌ I must be an Admin first.");

    let users: string[] = [];
    if (m.quoted && m.quoted.sender) {
      users.push(m.quoted.sender);
    } else if (args.length > 0) {
      users = args
        .join("")
        .split(",")
        .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
    }

    if (users.length === 0)
      return m.reply("❌ Provide a valid phone number. E.g. .add 628123456789");

    try {
      await sock.groupParticipantsUpdate(m.chat, users, "add");
      m.reply("✅ Passed the request. User(s) will be added shortly.");
    } catch (e) {
      console.error("[ADD-ERROR]", e);
      m.reply(
        "❌ Failed to add. Might be restricted by user's privacy settings.",
      );
    }
  },
});
