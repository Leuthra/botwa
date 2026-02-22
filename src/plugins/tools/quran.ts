import cmd, { type CommandContext } from "../../commands/map.js";

cmd.add({
  name: "quran",
  alias: ["alquran", "surat", "surah", "ayat"],
  category: ["tools", "islamic"],
  desc: "Membaca Al-Qur'an (Surat & Ayat) beserta terjemahan dan audionya",
  usage: "<nomor_surat> [nomor_ayat]",
  example: "1 2",
  async run({ m, args }: CommandContext) {
    if (args.length === 0) {
      return m.reply(
        "❌ Format salah.\n\nContoh penggunaan:\n*.quran 1* (Membaca info Surat)\n*.quran 1 2* (Membaca Ayat ke-2)\n*.quran 1 2 tafsir* (Membaca Tafsir Ayat ke-2)",
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
      return m.reply("❌ Nomor Surat must be number 1 until 114.");
    }

    try {
      m.reply(`⏳ Get data Surat ke-${surahNumber}...`);

      const res = await fetch(`https://equran.id/api/v2/surat/${surahNumber}`);
      const json = (await res.json()) as any;

      if (json.code !== 200 || !json.data) {
        return m.reply("❌ Failed to get data Surat from server.");
      }

      const surah = json.data;

      if (ayahNumber !== null) {
        if (
          isNaN(ayahNumber) ||
          ayahNumber < 1 ||
          ayahNumber > surah.jumlahAyat
        ) {
          return m.reply(
            `❌ Surat *${surah.namaLatin}* hanya memiliki ${surah.jumlahAyat} ayat.`,
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
            msg += "...\n\n_(Tafsir terlalu panjang, dipotong)_";

          return m.reply(msg);
        }

        const ayah = surah.ayat.find((a: any) => a.nomorAyat === ayahNumber);
        if (!ayah) return m.reply("❌ Ayat not found.");

        let msg = `📖 *QS. ${surah.namaLatin} (${surah.nomor}:${ayah.nomorAyat})*\n`;
        msg += `_${surah.arti}_ | _${surah.tempatTurun}_\n\n`;
        msg += `*${ayah.teksArab}*\n\n`;
        msg += `*Latin:* ${ayah.teksLatin}\n\n`;
        msg += `*Artinya:* "${ayah.teksIndonesia}"\n\n`;
        msg += `🎧 *Audio:* ${ayah.audio["05"]}`;

        return m.reply(msg);
      }
      let msg = `📖 *INFO SURAT AL-QUR'AN*\n`;
      msg += `*Nama Surat:* ${surah.namaLatin} (${surah.nama})\n`;
      msg += `*Artinya:* ${surah.arti}\n`;
      msg += `*Jumlah Ayat:* ${surah.jumlahAyat} ayat\n`;
      msg += `*Tempat Turun:* ${surah.tempatTurun}\n\n`;
      msg += `*Deskripsi Singkat:*\n${surah.deskripsi.replace(/<[^>]*>?/gm, "").substring(0, 500)}...\n\n`;
      msg += `🎧 *Audio Full:* ${surah.audioFull["05"]}\n\n`;
      msg += `_Ketik *.quran ${surahNumber} [ayat]* untuk membaca spesifik ayat._\n`;
      msg += `_Ketik *.quran ${surahNumber} [ayat] tafsir* untuk membaca tafsir ayat._`;

      m.reply(msg);
    } catch (e: any) {
      console.error("[QURAN-ERROR]", e);
      m.reply("❌ Failed to get data Surat from server.");
    }
  },
});
