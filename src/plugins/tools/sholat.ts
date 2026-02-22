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
  desc: "View daily Prayer and Imsak schedules",
  usage: "<city_name>",
  example: "jakarta",
  useLimit: 1,
  mustRegister: true,
  async run({ m, args }: CommandContext) {
    if (args.length === 0) {
      return m.reply(
        "❌ Please provide a city/regency name.\n\nExample: *.sholat bandung*\nor *.imsakiyah surabaya*",
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
        `❌ City/Regency "${query}" not found in Kemenag RI database.\n\nPlease ensure correct spelling without abbreviations (e.g., *jakarta selatan* instead of *jaksel*).`,
      );
    }

    const regionInfo = cityDb[foundCity];

    try {
      m.reply(`⏳ Fetching prayer schedules for *${regionInfo.kabkota}*...`);

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
        return m.reply("❌ Failed to get data Sholat from server eQuran.id.");
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

      let msg = `🕌 *PRAYER & IMSAK SCHEDULES*\n`;
      msg += `📍 *Region:* ${regionInfo.kabkota}, ${regionInfo.provinsi}\n`;
      msg += `📅 *Date:* ${targetJadwal.hari}, ${targetJadwal.tanggal_lengkap}\n\n`;

      msg += `🌙 *Imsak:*      ${targetJadwal.imsak}\n`;
      msg += `🌅 *Fajr:*       ${targetJadwal.subuh}\n`;
      msg += `🌞 *Sunrise:*    ${targetJadwal.terbit}\n`;
      msg += `🌤️ *Dhuha:*      ${targetJadwal.dhuha}\n`;
      msg += `☀️ *Dhuhr:*      ${targetJadwal.dzuhur}\n`;
      msg += `🌥️ *Asr:*        ${targetJadwal.ashar}\n`;
      msg += `🌇 *Maghrib:*    ${targetJadwal.maghrib}\n`;
      msg += `🌌 *Isha:*       ${targetJadwal.isya}\n\n`;

      msg += `_Source: Bimas Islam (Kemenag RI) via equran.id_`;

      m.reply(msg);
    } catch (e: any) {
      console.error("[SHOLAT-ERROR]", e);
      m.reply("❌ Failed to get data Sholat from server eQuran.id.");
    }
  },
});
