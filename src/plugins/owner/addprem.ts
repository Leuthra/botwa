import cmd, { type CommandContext } from "../../commands/map.js";
import { UsersDB } from "../../utils/db.js";

cmd.add({
  name: "addprem",
  alias: ["addpremium", "vip"],
  category: ["owner"],
  desc: "Add premium status to a user",
  usage: "<phone_number> <days>",
  example: "628xxx 30",
  isOwner: true,
  async run({ m, args }: CommandContext) {
    if (args.length < 2) {
      return m.reply(
        "❌ Invalid format.\n\nExample: *.addprem 628xxx 30* (VIP 30 Days)",
      );
    }

    const targetNum = args[0].replace(/[^0-9]/g, "");
    const days = parseInt(args[1]);

    if (isNaN(days) || days < 1) {
      return m.reply("❌ The number of days must be greater than 0.");
    }

    let user = UsersDB.get(targetNum);
    if (!user) {
      user = {
        id: targetNum,
        registered: 0,
        name: "",
        limit_count: 99999,
        is_premium: 1,
        premium_expired: 0,
      };
    }

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (user.is_premium === 1 && user.premium_expired > now) {
      user.premium_expired += days * ONE_DAY;
    } else {
      user.premium_expired = now + days * ONE_DAY;
    }

    user.is_premium = 1;
    user.limit_count = 99999;

    UsersDB.upsert(user);

    const date = new Date(user.premium_expired).toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    });
    m.reply(
      `✅ *Successfully Added Premium!*\n\n*Number:* ${targetNum}\n*Duration:* +${days} Days\n*Valid Until:* ${date}`,
    );
  },
});
