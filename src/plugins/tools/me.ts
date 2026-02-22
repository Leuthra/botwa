import cmd, { type CommandContext } from "../../commands/map.js";
import { UsersDB } from "../../utils/db.js";

cmd.add({
  name: "me",
  alias: ["profil", "limit", "premium"],
  category: ["tools"],
  desc: "Check your profile, remaining limits, and subscription status",
  async run({ m }: CommandContext) {
    const senderNum = m.sender.split("@")[0];
    const user = UsersDB.get(senderNum);

    if (!user || user.registered === 0) {
      return m.reply(
        "❌ You are not registered.\n\nType *.register <Name>* first.",
      );
    }

    let msg = `👤 *USER PROFILE*\n\n`;
    msg += `*🏷️ Name:* ${user.name}\n`;
    msg += `*📞 Number:* ${user.id}\n`;
    msg += `*🔋 Remaining Limit:* ${user.limit_count}\n`;
    msg += `*🎗️ Status:* ${user.is_premium === 1 ? "Premium 🌟" : "Regular"}\n`;

    if (user.is_premium === 1 && user.premium_expired > 0) {
      const date = new Date(user.premium_expired);
      msg += `*⌛ Expired:* ${date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}\n`;
    }

    m.reply(msg);
  },
});
