import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "doa",
  alias: ["doaharian", "dzikir"],
  category: ["tools", "islamic"],
  desc: "Search for daily prayers or dhikr",
  usage: "[keyword]",
  example: "tidur",
  async run({ m, args }: CommandContext) {
    try {
      m.reply("⏳ Fetching prayer data...");
      const res = await fetch("https://equran.id/api/doa");
      const json = (await res.json()) as any;
      const doaList = json.data as any[];

      if (!doaList || doaList.length === 0) {
        return m.reply("❌ Failed to fetch prayer data.");
      }

      if (args.length === 0) {
        const randomDoa = doaList[Math.floor(Math.random() * doaList.length)];
        let msg = `🤲 *${randomDoa.nama}*\n\n`;
        msg += `${randomDoa.ar}\n\n`;
        msg += `*Latin:* ${randomDoa.tr}\n\n`;
        msg += `*Meaning:* "${randomDoa.idn}"\n`;
        if (randomDoa.tentang)
          msg += `\n_Context/History:_\n${randomDoa.tentang}`;
        return m.reply(msg);
      }

      const query = args.join(" ").toLowerCase().trim();
      const results = doaList.filter(
        (d) =>
          (d.nama && d.nama.toLowerCase().includes(query)) ||
          (d.tag && d.tag.includes(query)) ||
          (d.id && String(d.id) === query),
      );

      if (results.length === 0) {
        return m.reply(`❌ Failed to find prayers with keyword "${query}".`);
      }

      if (results.length > 5) {
        m.reply(
          `✅ Found ${results.length} prayers with keyword "${query}".\nShowing the first 5...`,
        );
      }

      const maxShow = Math.min(results.length, 5);
      let combinedMsg = "";

      for (let i = 0; i < maxShow; i++) {
        const d = results[i];
        combinedMsg += `🤲 *${d.id}. ${d.nama}*\n\n`;
        combinedMsg += `${d.ar}\n\n`;
        combinedMsg += `*Latin:* ${d.tr}\n\n`;
        combinedMsg += `*Meaning:* "${d.idn}"\n`;
        combinedMsg += `\n─────────────────────\n\n`;
      }

      m.reply(combinedMsg.trimEnd());
    } catch (e: any) {
      console.error("[DOA-ERROR]", e);
      m.reply("❌ Failed to fetch prayer data from server.");
    }
  },
});
