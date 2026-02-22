import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "kick",
  alias: ["remove", "tendang"],
  category: ["group"],
  desc: "Kick member(s) from the group",
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
      return m.reply("❌ Mention or reply to a user to kick.");

    try {
      await sock.groupParticipantsUpdate(m.chat, users, "remove");
      m.reply("✅ Successfully kicked member(s).");
    } catch (e) {
      console.error("[KICK-ERROR]", e);
      m.reply("❌ Failed to kick member(s).");
    }
  },
});
