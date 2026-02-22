import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "add",
  alias: ["addmember"],
  category: ["group"],
  desc: "Add user(s) to the group",
  usage: "<phone_number>",
  isGroup: true,
  isAdmin: true,
  isBotAdmin: true,
  async run({ m, args, sock }: CommandContext) {
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
