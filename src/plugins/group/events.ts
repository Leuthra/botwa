import cmd, { type CommandContext } from "../../commands/map.js";
import { KVS } from "../../utils/db.js";

cmd.add({
  name: "groupevents",
  alias: ["ge", "welcome", "events", "setwelcome"],
  category: ["group"],
  desc: "Turn on/off group event notifications (Welcome, Leave, Promote, Demote)",
  usage: "[on|off]",
  isGroup: true,
  async run({ m, args, sock }: CommandContext) {
    if (!m.isGroup) {
      return m.reply("This command only works in groups.");
    }

    const groupMetadata = await sock.groupMetadata(m.chat);
    const participants = groupMetadata.participants;
    const sender = participants.find((p: any) => p.id === m.sender);
    const isAdmin = sender?.admin === "admin" || sender?.admin === "superadmin";
    const isOwner =
      (process.env.OWNER || "").split("@")[0] === m.sender.split("@")[0];

    if (!isAdmin && !isOwner) {
      return m.reply("❌ You must be a Group Admin to use this command.");
    }

    const action = (args[0] || "").toLowerCase();

    if (action === "on") {
      KVS.set(`groupevents_${m.chat}`, "true");
      return m.reply(
        "✅ Group event notifications (Welcome, Leave, Promote, Demote) have been *enabled*.",
      );
    }

    if (action === "off") {
      KVS.set(`groupevents_${m.chat}`, "false");
      return m.reply("🚫 Group event notifications have been *disabled*.");
    }

    const currentState = KVS.get(`groupevents_${m.chat}`);
    const status =
      currentState === "true" || currentState === true || currentState === "1"
        ? "🟢 ON"
        : "🔴 OFF";

    m.reply(
      `*Group Events Profile*\n\nStatus: ${status}\n\nTo change, use:\n*.groupevents on*\n*.groupevents off*`,
    );
  },
});
