import cmd, { type CommandContext } from "../../commands/map.js";
import sharp from "sharp";

cmd.add({
  name: "toimg",
  alias: ["toimage", "gambar"],
  category: ["tools"],
  desc: "Convert a WebP sticker back to an image.",
  usage: "<reply to sticker>",
  async run({ m, sock }: CommandContext) {
    let mediaBuffer: Buffer | null = null;

    if (m.quoted && m.quotedType === "stickerMessage") {
      const msg = await m.quoted.download?.();
      mediaBuffer = msg as Buffer;
    } else if (m.msgType === "stickerMessage") {
      const msg = await m.download?.();
      mediaBuffer = msg as Buffer;
    } else {
      return m.reply("❌ Usage: Reply to a sticker with .toimg");
    }

    if (!mediaBuffer) return m.reply("❌ Failed to download sticker buffer.");

    await m.reply("⏳ Converting...");
    try {
      const jpegBuffer = await sharp(mediaBuffer).jpeg().toBuffer();

      await sock.sendMessage(
        m.chat,
        {
          image: jpegBuffer,
          caption: "🖼️ Converted Sticker to Image",
        },
        { quoted: m as any },
      );
    } catch (e: any) {
      console.error("[TOIMG-ERROR]", e);
      m.reply(`❌ Failed to convert: ${e.message}`);
    }
  },
});
