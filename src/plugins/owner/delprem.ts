import cmd, { type CommandContext } from "../../commands/map.js";
import { UsersDB } from "../../utils/db.js";

cmd.add({
  name: "delprem",
  alias: ["unvip", "delpremium"],
  category: ["owner"],
  desc: "Revoke a user's premium status",
  usage: "<phone_number>",
  example: "628xxx",
  isOwner: true,
  async run({ m, args }: CommandContext) {
    if (args.length === 0) {
      return m.reply("❌ Invalid format.\n\nExample: *.delprem 628xxx*");
    }

    const targetNum = args[0].replace(/[^0-9]/g, "");

    const user = UsersDB.get(targetNum);
    if (!user) {
      return m.reply("❌ User number not found in the database.");
    }

    user.is_premium = 0;
    user.premium_expired = 0;
    user.limit_count = 25;

    UsersDB.upsert(user);
    m.reply(
      `✅ *Premium Status Revoked!*\n\nUser ${targetNum} has been downgraded to a regular user (Free).`,
    );
  },
});
