import cmd, { type CommandContext } from "../../commands/map.js";
import { jidNormalizedUser } from "baileys";

cmd.add({
  name: "promote",
  alias: ["admin"],
  category: ["group"],
  desc: "Promote member(s) to admin",
  usage: "@mention",
  isGroup: true,
  async run({ m, sock }: CommandContext) {
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

    let users = m.mentionedJids || [];
    if (m.quoted && m.quoted.sender) {
      users.push(m.quoted.sender);
    }
    users = [...new Set(users)];

    if (users.length === 0)
      return m.reply("❌ Mention or reply to a user to promote.");

    try {
      await sock.groupParticipantsUpdate(m.chat, users, "promote");
      m.reply("✅ Successfully promoted to Admin.");
    } catch (e) {
      console.error("[PROMOTE-ERROR]", e);
      m.reply("❌ Failed to promote member(s).");
    }
  },
});
