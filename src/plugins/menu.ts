import cmd, { type CommandContext } from "../commands/map.js";

cmd.add({
  name: "menu",
  alias: ["help", "list"],
  category: ["info"],
  desc: "Show command list. Use .menu info [name] for details",
  usage: ".menu | .menu [category] | .menu info [name]",
  async run({ m, args }: CommandContext) {
    const commands = cmd.values();

    if (args[0]?.toLowerCase() === "info" && args[1]) {
      const target = args[1].toLowerCase().trim();
      const found = cmd.find(target);
      if (!found) return m.reply(`❌ Command *${target}* tidak ditemukan.`);

      const permissions: string[] = [];
      if (found.isOwner) permissions.push("👑 owner only");
      if (found.isGroup) permissions.push("👥 group only");
      if (found.isPrivate) permissions.push("💬 private only");
      if (found.isSelf) permissions.push("🤖 self only");

      let text = `*📌 ${found.name}*\n`;
      if (found.desc)     text += `\n📝 ${found.desc}`;
      if (found.alias?.length) text += `\n🏷️ *Alias:* ${found.alias.join(", ")}`;
      if (found.category?.length) text += `\n📁 *Kategori:* ${found.category.join(", ")}`;
      if (found.usage)    text += `\n📋 *Usage:* ${found.usage}`;
      if (found.example)  text += `\n💡 *Contoh:* ${found.example}`;
      if (permissions.length) text += `\n🔐 *Permission:* ${permissions.join(", ")}`;

      return m.reply(text);
    }

    const byCategory: Record<string, typeof commands> = {};
    for (const command of commands) {
      const cats = command.category?.length ? command.category : ["uncategorized"];
      for (const cat of cats) {
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat]!.push(command);
      }
    }

    if (args[0]) {
      const target = args[0].toLowerCase();
      const filtered = byCategory[target];
      if (!filtered?.length) return m.reply(`❌ Kategori *${target}* tidak ditemukan.`);

      let text = `*📁 ${target.toUpperCase()} — ${filtered.length} command*\n\n`;
      for (const c of filtered) {
        const perms = [
          c.isOwner && "👑",
          c.isGroup && "👥",
          c.isPrivate && "💬",
          c.isSelf && "🤖",
        ].filter(Boolean).join("");
        const aliases = c.alias?.length ? ` _(${c.alias.join(", ")})_` : "";
        text += `• *${c.name}*${aliases} ${perms}\n`;
      }
      text += `\n💡 Detail: _.menu info [nama]_`;
      return m.reply(text);
    }

    const categories = Object.keys(byCategory).sort();
    let text = `*🤖 BOTWA MENU*\n`;

    for (const cat of categories) {
      const list = byCategory[cat]!;
      text += `\n*📁 ${cat.toUpperCase()}*\n`;
      for (const c of list) {
        const perms = [
          c.isOwner && "👑",
          c.isGroup && "👥",
          c.isSelf && "🤖",
        ].filter(Boolean).join("");
        text += `  • *${c.name}* ${perms}\n`;
      }
    }

    text += `\n📊 *Total:* ${commands.length} command`;
    text += `\n💡 _.menu [kategori]_ • _.menu info [nama]_`;

    m.reply(text);
  },
});