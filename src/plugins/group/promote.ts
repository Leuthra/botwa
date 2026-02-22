import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "promote",
  alias: ["admin"],
  category: ["group"],
  desc: "Promote member(s) to admin",
  usage: "@mention",
  isGroup: true,
  isAdmin: true,
  isBotAdmin: true,
  async run({ m, sock }: CommandContext) {
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
