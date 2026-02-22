import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "githubdl",
  alias: ["gitclone", "gitdl", "github"],
  category: ["downloader"],
  desc: "Download source code repository from GitHub (.zip)",
  usage: "<url>",
  async run({ m, args, sock }: CommandContext) {
    try {
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

      if (!url) return m.reply(`Usage: .github <url>`);
      if (!url.startsWith("https://github.com/"))
        return m.reply("❌ Invalid GitHub URL.");
      if (url.endsWith(".git")) url = url.slice(0, -4);

      const branchMatch = url.match(
        /github\.com\/([^/]+\/[^/]+)(?:\/tree\/([^/]+))?/,
      );
      const repo = branchMatch?.[1];
      const branch = branchMatch?.[2] || "master";

      if (!repo) return m.reply("❌ Failed to extract repository name.");

      const cleanUrl = `https://github.com/${repo}`;
      const zipUrl = `${cleanUrl}/archive/refs/heads/${branch}.zip`;

      await sock.sendMessage(
        m.chat,
        {
          document: { url: zipUrl },
          fileName: `${repo.split("/").pop()}-${branch}.zip`,
          mimetype: "application/zip",
          caption: `📦 *GitHub Repository*\n\nRepo: ${repo}\nBranch: ${branch}`,
        },
        { quoted: m as any },
      );
    } catch (e: any) {
      console.error("[GITHUB-DL]", e);
      m.reply(`❌ Error: ${e.message}`);
    }
  },
});
