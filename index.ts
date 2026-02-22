import dotenv from "dotenv";
dotenv.config();

import { Boom } from "@hapi/boom";
import NodeCache from "@cacheable/node-cache";
import * as readline from "readline";
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage,
  makeCacheableSignalKeyStore,
  proto,
  Browsers,
  useMultiFileAuthState,
} from "baileys";

import type { SocketConfig, WASocket } from "baileys";
import makeWASocket from "./src/utils/socket.js";
import * as P from "pino";
import CmdRegis from "./src/commands/register.js";
import type { LocalStore } from "./src/types.js";
import { ContactsDB, UsersDB } from "./src/utils/db.js";
import { backupDatabase, cleanTmpFolder } from "./src/utils/backup.js";
import cron from "node-cron";

cron.schedule(
  "0 0 * * *",
  () => {
    console.log("[CRON] Resetting daily limits for non-premium users to 25...");
    try {
      UsersDB.resetDailyLimits(25);
    } catch (e) {
      console.error("[CRON ERROR]", e);
    }
  },
  {
    timezone: "Asia/Jakarta",
  },
);

backupDatabase();
cleanTmpFolder();
setInterval(
  () => {
    backupDatabase();
    cleanTmpFolder();
  },
  24 * 60 * 60 * 1000,
);

import { onMessagesUpsert } from "./src/events/messages.js";
import {
  onGroupsUpsert,
  onGroupsUpdate,
  onGroupParticipantsUpdate,
} from "./src/events/groups.js";

try {
  await CmdRegis.load();
  await CmdRegis.watch();
} catch (error) {
  console.error("Error loading or watching commands:", error);
}

import handler from "./src/commands/handler.js";

const LocalStore: LocalStore = {
  messages: {},
  groupMetadata: {},
};

const logger = P.pino({ level: "silent" });

const msgRetryCounterCache = new NodeCache() as any;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("close", () => {
  console.log("Readline interface closed");
});

const question = (text: string) =>
  new Promise<string>((resolve, reject) => {
    try {
      rl.question(text, resolve);
    } catch (error) {
      console.error("Error with readline question:", error);
      reject(error);
    }
  });

let isStarting = false;
let reconnectAttempts = 0;
let shutdownRegistered = false;

export let globalSocket: WASocket | null = null;
let isReportingError = false;

const sendErrorReport = async (error: Error | any, type: string) => {
  if (isReportingError || !globalSocket) return;
  isReportingError = true;
  try {
    const ownerNum = process.env.OWNER?.split("@")[0];
    if (ownerNum) {
      const jid = `${ownerNum}@s.whatsapp.net`;
      const stack = error?.stack || error?.message || String(error);
      const msg = `🚨 *GLOBAL ERROR BOTWA* 🚨\n\n*Type:* ${type}\n*Time:* ${new Date().toLocaleString()}\n\n*Stack Trace:*\n\`\`\`\n${stack.substring(0, 1500)}\n\`\`\``;
      await globalSocket.sendMessage(jid, { text: msg });
    }
  } catch (err) {
    console.error("[WA] Failed to send error report:", err);
  } finally {
    isReportingError = false;
  }
};

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception encountered:", error);
  sendErrorReport(error, "Uncaught Exception");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection encountered:", reason);
  sendErrorReport(reason, "Unhandled Rejection");
});

const startWhatsApp = async () => {
  if (isStarting) {
    console.log("[WA] Already starting, skip duplicate call.");
    return;
  }
  isStarting = true;

  try {
    async function getMessage(key: {
      remoteJid?: string | null;
      id?: string | null;
    }): Promise<proto.IMessage | undefined> {
      if (!key.remoteJid || !key.id) return undefined;
      const stored = LocalStore.messages[key.remoteJid];
      if (stored) {
        const found = stored.find((m: any) => m.key?.id === key.id);
        if (found?.message) return found.message;
      }
      return undefined;
    }

    const { state, saveCreds } =
      await useMultiFileAuthState("baileys_auth_info");
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

    const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

    const config: Partial<SocketConfig> = {
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
      getMessage,
      cachedGroupMetadata: async (jid) =>
        Promise.resolve(groupCache.get(jid) as any),
    };

    const whatsapp = await makeWASocket(config as SocketConfig);
    globalSocket = whatsapp;

    if (!whatsapp.authState.creds.registered) {
      try {
        const phoneNumber = await question("Please enter your phone number:\n");
        const code = await whatsapp.requestPairingCode(phoneNumber);
        console.log(`Pairing code: ${code}`);
      } catch (error) {
        console.error("Error getting phone number:", (error as Error).message);
        console.log("Continuing without phone number registration...");
      }
    }

    whatsapp.ev.process(async (events) => {
      if (events["connection.update"]) {
        const { connection, lastDisconnect } = events["connection.update"];
        if (connection === "close") {
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;
          if (shouldReconnect) {
            const factor = Math.min(reconnectAttempts, 8);
            const timeout = Math.min(2000 * Math.pow(2, factor), 300000);
            reconnectAttempts++;

            console.log(
              `Connection closed. Reconnecting in ${timeout / 1000}s... (Attempt: ${reconnectAttempts})`,
            );
            isStarting = false;
            setTimeout(() => startWhatsApp(), timeout);
          } else {
            console.log("Connection closed. You are logged out.");
          }
        }
        if (connection === "open") {
          console.log("Success Connect to WhatsApp");
          isStarting = false;
          reconnectAttempts = 0;
        }
      }

      if (!shutdownRegistered) {
        shutdownRegistered = true;
        const shutdown = () => {
          console.log("\n[WA] Shutting down gracefully...");
          whatsapp.end(undefined);
          process.exit(0);
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
      }

      if (events["creds.update"]) {
        await saveCreds();
      }
      if (events["labels.association"]) {
        console.log(events["labels.association"]);
      }
      if (events["labels.edit"]) {
        console.log(events["labels.edit"]);
      }

      if (events["messaging-history.set"]) {
        const { chats, contacts, messages, isLatest, progress, syncType } =
          events["messaging-history.set"];
        if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
          console.log("received on-demand history sync, messages=", messages);
        }
        console.log(
          `recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`,
        );
      }

      if (events["messages.upsert"]) {
        await onMessagesUpsert(
          events["messages.upsert"],
          whatsapp,
          LocalStore,
          groupCache,
        );
      }

      if (events["messages.update"]) {
        for (const { update } of events["messages.update"]) {
          if (update.pollUpdates) {
            const pollCreation: proto.IMessage = {};
            if (pollCreation) {
              console.log(
                "got poll update, aggregation: ",
                getAggregateVotesInPollMessage({
                  message: pollCreation,
                  pollUpdates: update.pollUpdates,
                }),
              );
            }
          }
        }
      }

      if (events["contacts.upsert"]) {
        for (const contact of events["contacts.upsert"]) {
          ContactsDB.upsert({ ...contact, isContact: true });
        }
      }

      if (events["contacts.update"]) {
        for (const contact of events["contacts.update"]) {
          if (typeof contact.imgUrl !== "undefined") {
            const newUrl =
              contact.imgUrl === null
                ? null
                : await whatsapp!
                    .profilePictureUrl(contact.id!)
                    .catch(() => null);
            console.log(
              `contact ${contact.id} has a new profile pic: ${newUrl}`,
            );
          }
          ContactsDB.upsert(contact);
        }
      }

      if (events["lid-mapping.update"]) {
        const { lid, pn } = events["lid-mapping.update"];
        console.log(`[LID] mapping updated: ${lid} ↔ ${pn}`);
        ContactsDB.upsert({ id: lid, lid, phoneNumber: pn });
        ContactsDB.upsert({ id: pn, lid, phoneNumber: pn });
      }

      if (events["groups.upsert"]) {
        await onGroupsUpsert(events["groups.upsert"], LocalStore, groupCache);
      }
      if (events["groups.update"]) {
        await onGroupsUpdate(
          events["groups.update"],
          whatsapp,
          LocalStore,
          groupCache,
        );
      }
      if (events["group-participants.update"]) {
        await onGroupParticipantsUpdate(
          events["group-participants.update"],
          whatsapp,
          LocalStore,
          groupCache,
        );
      }

      if (events["chats.delete"]) {
        console.log("chats deleted ", events["chats.delete"]);
      }
    });

    return whatsapp;
  } catch (err) {
    isStarting = false;
    throw err;
  }
};

startWhatsApp();
