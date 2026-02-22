import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "ssweb",
  alias: ["screenshot", "ss"],
  category: ["tools"],
  desc: "Take a screenshot of a website",
  usage: "[layout] <url>\nExample: .ssweb pc https://google.com",
  async run({ m, args, sock }: CommandContext) {
    const text = args.join(" ").trim();
    if (!text) return m.reply(`Usage: .ssweb [hp|pc|web|tablet] <url>`);

    const match =
      /^(hp|pc|web|tablet)\s+(https?:\/\/\S+)|^(https?:\/\/\S+)/i.exec(text);

    let layout = "pc";
    let url: string | null = null;

    if (match) {
      if (match[3]) {
        url = match[3];
      } else {
        layout = match[1].toLowerCase();
        url = match[2];
      }
    } else {
      url = text;
      if (!url.startsWith("http")) url = "https://" + url;
    }

    let width, crop;
    switch (layout) {
      case "web":
        width = 1900;
        crop = 1000;
        break;
      case "hp":
        width = 720;
        crop = 1280;
        break;
      case "tablet":
        width = 800;
        crop = 1280;
        break;
      case "pc":
      default:
        width = 1366;
        crop = 768;
        break;
    }

    await m.reply(`⏳ Taking screenshot of ${url}...`);
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`;

    try {
      const apicall = await fetch(apiUrl);
      const apiRes: any = await apicall.json();

      if (
        !apiRes.data ||
        !apiRes.data.screenshot ||
        !apiRes.data.screenshot.url
      ) {
        return m.reply(
          "❌ Failed to take screenshot. Service might be busy or URL is invalid.",
        );
      }

      const response = await fetch(apiRes.data.screenshot.url);
      const buffer = await response.arrayBuffer();
      const data = Buffer.from(buffer);

      await sock.sendMessage(
        m.chat,
        {
          image: data,
          caption: `📸 *Screenshot:* ${url}`,
        },
        { quoted: m as any },
      );
    } catch (e) {
      console.error("[SSWEB-ERROR]", e);
      m.reply(
        "❌ Failed to take screenshot. Service might be busy or URL is invalid.",
      );
    }
  },
});
