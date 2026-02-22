import cmd, { type CommandContext } from "../../commands/map.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cityDb: Record<string, { provinsi: string; kabkota: string }> = {};
try {
  const dbPath = path.join(__dirname, "cities.json");
  cityDb = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
} catch (e) {
  console.error("Gagal memuat cities.json", e);
}

cmd.add({
  name: "sholat",
  alias: ["shalat", "jadwalsholat", "imsakiyah", "imsak"],
  category: ["tools", "islamic"],
  desc: "Melihat Jadwal Sholat dan Imsakiyah harian",
  usage: "<nama_kota>",
  example: "jakarta",
  async run({ m, args }: CommandContext) {
    if (args.length === 0) {
      return m.reply(
        "❌ Masukkan nama kota/kabupaten.\n\nContoh: *.sholat bandung*\natau *.imsakiyah surabaya*",
      );
    }

    const query = args.join(" ").toLowerCase().trim();

    let foundCity: string | undefined;

    if (cityDb[query]) {
      foundCity = query;
    } else {
      foundCity = Object.keys(cityDb).find((k) => k.includes(query));
    }

    if (!foundCity) {
      return m.reply(
        `❌ Kota/Kabupaten "${query}" tidak ditemukan di database Kemenag RI.\n\nPastikan penulisan sudah benar tanpa singkatan (contoh: *jakarta selatan* bukan *jaksel*).`,
      );
    }

    const regionInfo = cityDb[foundCity];

    try {
      m.reply(
        `⏳ Mengambil jadwal ibadah untuk wilayah *${regionInfo.kabkota}*...`,
      );

      const res = await fetch("https://equran.id/api/v2/shalat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provinsi: regionInfo.provinsi,
          kabkota: regionInfo.kabkota,
        }),
      });

      const json = (await res.json()) as any;

      if (json.code !== 200 || !json.data || !json.data.jadwal) {
        return m.reply(
          "❌ Failed to get data Sholat from server eQuran.id.",
        );
      }

      const todayDate = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Jakarta",
          day: "numeric",
        }).format(new Date()),
      );

      const targetJadwal =
        json.data.jadwal.find((j: any) => j.tanggal === todayDate) ||
        json.data.jadwal[0];

      let msg = `🕌 *JADWAL SHOLAT & IMSAKIYAH*\n`;
      msg += `📍 *Wilayah:* ${regionInfo.kabkota}, ${regionInfo.provinsi}\n`;
      msg += `📅 *Tanggal:* ${targetJadwal.hari}, ${targetJadwal.tanggal_lengkap}\n\n`;

      msg += `🌙 *Imsak:*      ${targetJadwal.imsak}\n`;
      msg += `🌅 *Subuh:*    ${targetJadwal.subuh}\n`;
      msg += `🌞 *Terbit:*      ${targetJadwal.terbit}\n`;
      msg += `🌤️ *Dhuha:*    ${targetJadwal.dhuha}\n`;
      msg += `☀️ *Dzuhur:*   ${targetJadwal.dzuhur}\n`;
      msg += `🌥️ *Ashar:*      ${targetJadwal.ashar}\n`;
      msg += `🌇 *Maghrib:* ${targetJadwal.maghrib}\n`;
      msg += `🌌 *Isya:*         ${targetJadwal.isya}\n\n`;

      msg += `_Sumber: Bimas Islam (Kemenag RI) via equran.id_`;

      m.reply(msg);
    } catch (e: any) {
      console.error("[SHOLAT-ERROR]", e);
      m.reply("❌ Failed to get data Sholat from server eQuran.id.");
    }
  },
});
