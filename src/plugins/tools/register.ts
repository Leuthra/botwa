import cmd, { type CommandContext } from "../../commands/map.js";
import { UsersDB } from "../../utils/db.js";

cmd.add({
  name: "register",
  alias: ["daftar", "reg"],
  category: ["tools"],
  desc: "Register to the bot's database to get a profile",
  usage: "<YourName>",
  example: "John",
  async run({ m, args }: CommandContext) {
    if (args.length === 0) {
      return m.reply(
        "❌ Please provide your name!\n\nExample: *.register John*",
      );
    }

    const name = args.join(" ").trim();
    if (name.length > 25) {
      return m.reply("❌ Name is too long, maximum 25 characters.");
    }

    const senderNum = m.sender.split("@")[0];
    let user = UsersDB.get(senderNum);

    if (user?.registered === 1) {
      return m.reply(
        "✅ You are already registered.\nType *.me* to check your profile.",
      );
    }

    if (!user) {
      user = {
        id: senderNum,
        registered: 1,
        name: name,
        limit_count: 25,
        is_premium: 0,
        premium_expired: 0,
      };
    } else {
      user.registered = 1;
      user.name = name;
      user.limit_count = 25;
    }

    UsersDB.upsert(user);
    m.reply(
      `🎉 *Registration Successful!*\n\n*Name:* ${name}\n*Number:* ${senderNum}\n*Daily Limit:* 25 (Resets every midnight)\n\nThank you for using this bot.\nType *.menu* to see all available features.`,
    );
  },
});
