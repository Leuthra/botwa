import cmd, { type CommandContext } from "../../commands/map.js";
import { tmpfiles } from "../../lib/uploader.js";

cmd.add({
  name: "tourl",
  alias: ["upload"],
  category: ["tools"],
  desc: "Upload media to get tmpfiles URL",
  usage: "<reply to media>",
  async run({ m, sock }: CommandContext) {
    let mediaBuffer: Buffer | null = null;

    if (m.quoted && m.quoted.isMedia) {
      mediaBuffer = (await m.quoted.download?.()) as Buffer;
    } else if (m.isMedia) {
      mediaBuffer = (await m.download?.()) as Buffer;
    } else {
      return m.reply(
        "❌ Usage: Send or reply to an image/video/file with .tourl",
      );
    }

    if (!mediaBuffer) return m.reply("❌ Failed to download media.");

    await m.reply("⏳ Uploading to tmpfiles.org...");

    try {
      const url = await tmpfiles(mediaBuffer);

      if (url) {
        await m.reply(`✅ *Upload Success*\n\n🔗 URL: ${url}`);
      } else {
        await m.reply("❌ Failed to upload media.");
      }
    } catch (e: any) {
      console.error("[TOURL]", e);
      m.reply(`❌ Error: ${e.message}`);
    }
  },
});
