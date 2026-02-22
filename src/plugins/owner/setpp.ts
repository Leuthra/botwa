import cmd, { type CommandContext } from "../../commands/map.js";
import { S_WHATSAPP_NET } from "baileys";
import sharp from "sharp";

cmd.add({
  name: "setpp",
  alias: ["setprofilepic"],
  category: ["owner"],
  desc: "Set the bot's profile picture",
  usage: "<reply to image>",
  isOwner: true,
  async run({ m, sock }: CommandContext) {
    let media: Buffer | null = null;

    if (m.quoted && m.quotedType === "imageMessage") {
      media = (await m.quoted.download?.()) as Buffer;
    } else if (m.msgType === "imageMessage") {
      media = (await m.download?.()) as Buffer;
    } else {
      return m.reply("❌ Please send or reply to an image.");
    }

    if (!media) return m.reply("❌ Failed to load image data.");

    await m.reply("⏳ Processing image and setting profile picture...");

    try {
      const image = sharp(media);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const size = Math.min(width, height);

      const croppedImage = image.extract({
        left: 0,
        top: 0,
        width: size,
        height: size,
      });
      const imgBuffer = await croppedImage
        .resize(720, 720)
        .toFormat("jpeg")
        .toBuffer();

      await sock.query({
        tag: "iq",
        attrs: {
          to: S_WHATSAPP_NET,
          type: "set",
          xmlns: "w:profile:picture",
        },
        content: [
          {
            tag: "picture",
            attrs: { type: "image" },
            content: imgBuffer,
          },
        ],
      });

      m.reply("✅ Profile picture updated successfully.");
    } catch (e: any) {
      console.error("[SETPP-ERROR]", e);
      m.reply(`❌ Failed to set profile picture: ${e.message}`);
    }
  },
});
