import cmd, { type CommandContext } from "../../commands/map.js";
import { ShinigamiService } from "../../lib/shinigami.js";

const shinigami = new ShinigamiService();

cmd.add({
  name: "manga",
  alias: ["shinigami", "anime", "komik"],
  category: ["anime"],
  desc: "Search and Read Manga from Shinigami",
  usage: "<command> [query]",
  async run({ m, args, sock }: CommandContext) {
    const command = args[0] ? args[0].toLowerCase() : "";
    const query = args.slice(1).join(" ");

    if (!command) {
      return m.reply(
        `*Shinigami Manga Menu*\n\n` +
          `1. *.manga search <query>*\n` +
          `   Search for manga by title.\n` +
          `2. *.manga popular*\n` +
          `   Show popular manga.\n` +
          `3. *.manga latest*\n` +
          `   Show latest updates.\n` +
          `4. *.manga detail <id>*\n` +
          `   Get manga details.\n` +
          `5. *.manga chapter <id>*\n` +
          `   List chapters.\n`,
      );
    }

    try {
      if (command === "search") {
        if (!query) return m.reply("Please provide a query.");
        await m.reply("⏳ Searching manga...");
        const result = await shinigami.searchManga(query);
        if (result.mangas.length === 0) return m.reply("No manga found.");

        let text = `*Search Result: ${query}*\n\n`;
        result.mangas.forEach((manga: any, i: number) => {
          text +=
            `${i + 1}. *${manga.title}*\n` +
            `ID: \`${manga.url}\`\n` +
            `Genre: ${manga.genre}\n` +
            `Status: ${manga.status}\n` +
            `Release: ${manga.release}\n` +
            `Updated: ${new Date(manga.updated).toLocaleString()}\n` +
            `Rating: ${manga.rating} ⭐\n` +
            `URL: ${manga.mangaUrl}\n\n`;
        });
        await m.reply(text);
      } else if (command === "popular") {
        await m.reply("⏳ Fetching popular manga...");
        const result = await shinigami.getPopularManga();
        let text = `*Popular Manga*\n\n`;
        result.mangas.forEach((manga: any, i: number) => {
          text +=
            `${i + 1}. *${manga.title}*\n` +
            `ID: \`${manga.url}\`\n` +
            `Genre: ${manga.genre}\n` +
            `Status: ${manga.status}\n` +
            `Release: ${manga.release}\n` +
            `Rating: ${manga.rating} ⭐\n` +
            `URL: ${manga.mangaUrl}\n\n`;
        });
        await m.reply(text);
      } else if (command === "latest") {
        await m.reply("⏳ Fetching latest updates...");
        const result = await shinigami.getLatestUpdates();
        let text = `*Latest Updates*\n\n`;
        result.mangas.forEach((manga: any, i: number) => {
          text +=
            `${i + 1}. *${manga.title}*\n` +
            `ID: \`${manga.url}\`\n` +
            `Updated: ${new Date(manga.updated).toLocaleString()}\n` +
            `Release: ${manga.release}\n` +
            `Rating: ${manga.rating} ⭐\n` +
            `URL: ${manga.mangaUrl}\n\n`;
        });
        await m.reply(text);
      } else if (command === "detail") {
        if (!query) return m.reply("Please provide Manga ID.");
        await m.reply("⏳ Fetching details...");
        const detail = await shinigami.getMangaDetails(query);

        let text = `*${detail.title}*\n\n`;
        text += `Author: ${detail.author}\n`;
        text += `Status: ${detail.status}\n`;
        text += `Genre: ${detail.genre}\n\n`;
        text += `${detail.description}`;

        if (detail.thumbnail) {
          await sock.sendMessage(
            m.chat,
            { image: { url: detail.thumbnail }, caption: text },
            { quoted: m as any },
          );
        } else {
          await m.reply(text);
        }
      } else if (command === "chapter") {
        if (!query) return m.reply("Please provide Manga ID.");
        await m.reply("⏳ Fetching chapters...");
        const chapters = await shinigami.getChapterList(query);
        if (chapters.length === 0) return m.reply("No chapters found.");

        let text = `*Chapters for ID: ${query}*\n\n`;
        chapters.slice(0, 20).forEach((chap: any) => {
          text += `• ${chap.name}\nID: \`${chap.url}\`\n\n`;
        });
        if (chapters.length > 20)
          text += `\n...and ${chapters.length - 20} more.`;

        await m.reply(text);
      } else {
        return m.reply("Invalid manga command.");
      }
    } catch (e: any) {
      console.error(e);
      m.reply(`Error: ${e.message}`);
    }
  },
});
