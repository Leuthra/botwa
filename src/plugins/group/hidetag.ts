import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "hidetag",
  alias: ["ht", "announce"],
  category: ["group"],
  desc: "Mention all members silently",
  usage: "<text>",
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

    const mentions = participants.map((p: any) => p.id);
    let text = args.join(" ").trim();
    if (m.quoted && m.quoted.text) {
      text = text ? `${text}\n\n${m.quoted.text}` : m.quoted.text;
    }

    if (!text && !m.isMedia)
      return m.reply("❌ Please provide some text to announce.");

    await sock.sendMessage(m.chat, { text, mentions });
  },
});
