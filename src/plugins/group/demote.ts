import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "demote",
  alias: ["member", "turun"],
  category: ["group"],
  desc: "Demote admin(s) to regular member(s)",
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
      return m.reply("❌ Mention or reply to an admin to demote.");

    try {
      await sock.groupParticipantsUpdate(m.chat, users, "demote");
      m.reply("✅ Successfully demoted to regular member.");
    } catch (e) {
      console.error("[DEMOTE-ERROR]", e);
      m.reply("❌ Failed to demote member(s).");
    }
  },
});
