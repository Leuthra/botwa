import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "join",
  alias: ["gabung"],
  category: ["owner"],
  desc: "Make bot join a group via invite link",
  usage: "<chat.whatsapp.com/code>",
  isOwner: true,
  async run({ m, args, sock }: CommandContext) {
    const link = args.join(" ").trim();
    if (!link) return m.reply(`Usage: .join <chat.whatsapp.com/code>`);

    try {
      const match = link.match(/chat\.whatsapp\.com\/([0-9A-Za-z]+)/i);
      const code = match ? match[1] : link;

      if (!code || code.length < 5)
        return m.reply("❌ Invalid WhatsApp group link/code.");

      await m.reply("⏳ Trying to join group...");
      const response = await sock.groupAcceptInvite(code);

      if (response) {
        m.reply(`✅ Successfully joined the group! ID: ${response}`);
      } else {
        m.reply(
          "✅ The command was processed. (No explicit confirmation received, check groups).",
        );
      }
    } catch (e: any) {
      console.error("[JOIN-ERROR]", e);
      m.reply(
        `❌ Failed to join group. Make sure the link is not revoked and the Bot hasn't been blocked.\nReason: ${e.message}`,
      );
    }
  },
});
