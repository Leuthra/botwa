import cmd, { type CommandContext } from "../../commands/map.js";
import { imageToWebp, videoToWebp, writeExif } from "../../lib/sticker.js";

cmd.add({
  name: "sticker",
  alias: ["s", "stiker"],
  category: ["tools"],
  desc: "Convert Image/Video/GIF to Sticker",
  usage: "<reply to media>",
  async run({ m, args, sock }: CommandContext) {
    let mediaBuffer: Buffer | null = null;
    let mimeType = "";

    if (
      m.quoted &&
      (m.quotedType === "imageMessage" || m.quotedType === "videoMessage")
    ) {
      mediaBuffer = (await m.quoted.download?.()) as Buffer;
      mimeType = m.quotedType;
    } else if (m.msgType === "imageMessage" || m.msgType === "videoMessage") {
      mediaBuffer = (await m.download?.()) as Buffer;
      mimeType = m.msgType;
    } else {
      return m.reply("❌ Usage: Send or reply to an image/video with .sticker");
    }

    if (!mediaBuffer) return m.reply("❌ Failed to download media.");

    const packAuthor =
      (process.env.STICKER_AUTHOR || "BotWA") +
      "\n" +
      (process.env.STICKER_PACKNAME || "Created with WhatsApp Bot");

    const customAuthor = args.join(" ").trim() || packAuthor;

    await m.reply("⏳ Formatting sticker...");

    try {
      let outputBuffer: Buffer;
      if (mimeType === "imageMessage") {
        outputBuffer = await imageToWebp(mediaBuffer);
      } else if (mimeType === "videoMessage") {
        outputBuffer = await videoToWebp(mediaBuffer);
      } else {
        throw new Error("Unsupported media type for sticker conversion.");
      }

      const finalBuffer = await writeExif(outputBuffer, {
        packname: "BotWA Premium",
        author: customAuthor,
        categories: ["🎉", "😎"],
      });

      await sock.sendMessage(
        m.chat,
        { sticker: finalBuffer || outputBuffer },
        { quoted: m as any },
      );
    } catch (e: any) {
      console.error("[STICKER-ERROR]", e);
      m.reply(`❌ Failed to convert media to sticker. \nReason: ${e.message}`);
    }
  },
});
