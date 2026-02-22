import cmd, { type CommandContext } from "../../commands/map.js";
import { snapsave } from "../../lib/snapsave.js";

cmd.add({
  name: "igdl",
  alias: ["instagram", "insta"],
  category: ["downloader"],
  desc: "Download Instagram Video/Reel",
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

    if (!url) return m.reply(`Usage: .igdl <url>`);

    await m.reply("⏳ Downloading Instagram media...");

    try {
      const res = await snapsave(url);

      if (
        res.ok &&
        res.data &&
        res.data.resolutions &&
        res.data.resolutions.length > 0
      ) {
        for (const media of res.data.resolutions) {
          await sock.sendMessage(
            m.chat,
            {
              video: { url: media.url },
              caption: `📸 *Instagram Downloader*`,
            },
            { quoted: m as any },
          );
        }
      } else {
        m.reply(
          "❌ Failed to extract via API. Make sure the Instagram post/reel is Public.",
        );
      }
    } catch (e: any) {
      console.error("[IG-DL]", e);
      m.reply(`❌ Error: ${e.message || "Something went wrong."}`);
    }
  },
});
