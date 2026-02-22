import cmd, { type CommandContext } from "../../commands/map.js";
import { snapsave } from "../../lib/snapsave.js";

cmd.add({
  name: "tiktokdl",
  alias: ["ttdl", "tiktok", "tt"],
  category: ["downloader"],
  desc: "Download video from TikTok (No Watermark)",
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

    if (!url) return m.reply(`Usage: .tiktok <url>`);

    await m.reply("⏳ Downloading TikTok video...");
    try {
      const res = await snapsave(url);

      if (
        res.ok &&
        res.data &&
        res.data.resolutions &&
        res.data.resolutions.length > 0
      ) {
        const videoData =
          res.data.resolutions.find(
            (v: any) =>
              v.resolution === "HD" || v.resolution === "No Watermark",
          ) || res.data.resolutions[0];

        await sock.sendMessage(
          m.chat,
          {
            video: { url: videoData.url },
            caption: `🎵 *${res.data.title || "TikTok Video"}*${res.data.description ? `\n\n${res.data.description}` : ""}`,
          },
          { quoted: m as any },
        );
      } else {
        m.reply(
          "❌ Failed to download TikTok video. Ensure the link is valid and public.",
        );
      }
    } catch (e: any) {
      console.error("[TIKTOK-DL]", e);
      m.reply(`❌ Error: ${e.message}`);
    }
  },
});
