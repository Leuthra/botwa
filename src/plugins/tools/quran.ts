import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "quran",
  alias: ["alquran", "surat", "surah", "ayat"],
  category: ["tools", "islamic"],
  desc: "Read the Quran (Surah & Ayah) with translation and audio",
  usage: "<surah_number> [ayah_number]",
  example: "1 2",
  useLimit: 1,
  mustRegister: true,
  async run({ m, args }: CommandContext) {
    if (args.length === 0) {
      return m.reply(
        "❌ Invalid format.\n\nExample Usage:\n*.quran 1* (Read Surah info)\n*.quran 1 2* (Read Ayah 2)\n*.quran 1 2 tafsir* (Read Tafsir of Ayah 2)",
      );
    }

    const surahNumber = parseInt(args[0]);
    let ayahNumber: number | null = null;
    let isTafsir = false;

    for (let i = 1; i < args.length; i++) {
      if (args[i].toLowerCase() === "tafsir") {
        isTafsir = true;
      } else if (!isNaN(parseInt(args[i]))) {
        ayahNumber = parseInt(args[i]);
      }
    }

    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      return m.reply("❌ Surah Number must be between 1 and 114.");
    }

    try {
      m.reply(`⏳ Fetching data for Surah ${surahNumber}...`);

      const res = await fetch(`https://equran.id/api/v2/surat/${surahNumber}`);
      const json = (await res.json()) as any;

      if (json.code !== 200 || !json.data) {
        return m.reply("❌ Failed to fetch Surah data from server.");
      }

      const surah = json.data;

      if (ayahNumber !== null) {
        if (
          isNaN(ayahNumber) ||
          ayahNumber < 1 ||
          ayahNumber > surah.jumlahAyat
        ) {
          return m.reply(
            `❌ Surah *${surah.namaLatin}* only has ${surah.jumlahAyat} ayahs.`,
          );
        }

        if (isTafsir) {
          const tafRes = await fetch(
            `https://equran.id/api/v2/tafsir/${surahNumber}`,
          );
          const tafJson = (await tafRes.json()) as any;

          if (tafJson.code !== 200 || !tafJson.data) {
            return m.reply("❌ Failed to get data Tafsir.");
          }

          const targetTafsir = tafJson.data.tafsir.find(
            (t: any) => t.ayat === ayahNumber,
          );

          let msg = `📚 *TAFSIR QS. ${surah.namaLatin} (${surah.nomor}:${ayahNumber})*\n\n`;
          msg += targetTafsir.teks.substring(0, 3000);
          if (targetTafsir.teks.length > 3000)
            msg += "...\n\n_(Tafsir is too long, truncated)_";

          return m.reply(msg);
        }

        const ayah = surah.ayat.find((a: any) => a.nomorAyat === ayahNumber);
        if (!ayah) return m.reply("❌ Ayah not found.");

        let msg = `📖 *QS. ${surah.namaLatin} (${surah.nomor}:${ayah.nomorAyat})*\n`;
        msg += `_${surah.arti}_ | _${surah.tempatTurun}_\n\n`;
        msg += `*${ayah.teksArab}*\n\n`;
        msg += `*Latin:* ${ayah.teksLatin}\n\n`;
        msg += `*Meaning:* "${ayah.teksIndonesia}"\n\n`;
        msg += `🎧 *Audio:* ${ayah.audio["05"]}`;

        return m.reply(msg);
      }
      let msg = `📖 *QURAN SURAH INFO*\n`;
      msg += `*Surah Name:* ${surah.namaLatin} (${surah.nama})\n`;
      msg += `*Meaning:* ${surah.arti}\n`;
      msg += `*Total Ayahs:* ${surah.jumlahAyat} ayahs\n`;
      msg += `*Revelation Place:* ${surah.tempatTurun}\n\n`;
      msg += `*Short Description:*\n${surah.deskripsi.replace(/<[^>]*>?/gm, "").substring(0, 500)}...\n\n`;
      msg += `🎧 *Full Audio:* ${surah.audioFull["05"]}\n\n`;
      msg += `_Type *.quran ${surahNumber} [ayah]* to read a specific ayah._\n`;
      msg += `_Type *.quran ${surahNumber} [ayah] tafsir* to read the ayah's tafsir._`;

      m.reply(msg);
    } catch (e: any) {
      console.error("[QURAN-ERROR]", e);
      m.reply("❌ Failed to get data Surat from server.");
    }
  },
});
