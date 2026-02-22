import cmd, { type CommandContext } from "../../commands/map.js";
import { snapsave } from "../../lib/snapsave.js";

cmd.add({
  name: "fbdl",
  alias: ["facebook", "fb"],
  category: ["downloader"],
  desc: "Download Facebook Video/Reel",
  usage: "<url>",
  async run({ m, args, sock }: CommandContext) {
    let url: string | null = null;
    if (m.quoted && m.quoted.text) {
      url =
        m.quoted.text.match(
          /(https?):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|]/gi,
        )?.[0] || null;
    } else if (args.length > 0) {
      url =
        args
          .join(" ")
          .match(
            /(https?):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|]/gi,
          )?.[0] || null;
    }

    if (!url) return m.reply(`Usage: .fbdl <url>`);

    await m.reply("⏳ Downloading Facebook video...");

    try {
      const res = await snapsave(url);

      if (
        res.ok &&
        res.data &&
        res.data.resolutions &&
        res.data.resolutions.length > 0
      ) {
        const videoData =
          res.data.resolutions.find((v: any) => v.resolution === "HD") ||
          res.data.resolutions[0];

        await sock.sendMessage(
          m.chat,
          {
            video: { url: videoData.url },
            caption: `🌐 *Facebook Video* (${videoData.resolution || "SD"})`,
          },
          { quoted: m as any },
        );
      } else {
        m.reply(
          "❌ Failed to extract. Ensure the Facebook post is Public or Valid.",
        );
      }
    } catch (e: any) {
      console.error("[FB-DL]", e);
      m.reply(`❌ Error: ${e.message}`);
    }
  },
});
