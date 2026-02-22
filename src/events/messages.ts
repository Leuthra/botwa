import type { WASocket, AnyMessageContent } from "baileys";
import type { LocalStore } from "../types.js";
import { procMsg } from "../utils/msg.js";
import { prMsg } from "../utils/fmt.js";
import handler from "../commands/handler.js";
import NodeCache from "@cacheable/node-cache";
import { ContactsDB } from "../utils/db.js";

const MAX_MESSAGES_PER_JID = 50;

let groupFetchRetryAt: number | null = null;
const GROUP_FETCH_RETRY_DELAY_MS = 30_000;

export async function onMessagesUpsert(
  upsert: any,
  whatsapp: WASocket,
  LocalStore: LocalStore,
  groupCache: NodeCache<any>,
): Promise<void> {
  if (
    LocalStore.groupMetadata &&
    Object.keys(LocalStore.groupMetadata).length < 1
  ) {
    const now = Date.now();
    if (groupFetchRetryAt === null || now >= groupFetchRetryAt) {
      try {
        LocalStore.groupMetadata = await whatsapp.groupFetchAllParticipating();
        groupFetchRetryAt = null;
      } catch (err: any) {
        const retryIn = GROUP_FETCH_RETRY_DELAY_MS;
        groupFetchRetryAt = now + retryIn;
        console.warn(
          `[GROUP FETCH] rate-limited, retry in ${retryIn / 1000}s:`,
          err?.message ?? err,
        );
      }
    }
  }

  if (!!upsert.requestId) {
    console.log(
      "placeholder message received for request of id=" + upsert.requestId,
      upsert,
    );
  }

  for (const msg of upsert.messages) {
    const jid = msg.key.participant ?? msg.key.remoteJid;
    if (jid) {
      if (!LocalStore.messages[jid]) LocalStore.messages[jid] = [];
      LocalStore.messages[jid].push(msg);

      if (LocalStore.messages[jid].length > MAX_MESSAGES_PER_JID) {
        LocalStore.messages[jid] =
          LocalStore.messages[jid].slice(-MAX_MESSAGES_PER_JID);
      }
    }

    if (upsert.type !== "notify") continue;

    const processedMessage = await procMsg(msg as any, whatsapp, LocalStore);
    if (!processedMessage) continue;

    if (
      msg.key.remoteJid &&
      msg.key.id &&
      msg.key.remoteJid !== "status@broadcast" &&
      !msg.key.fromMe
    ) {
      whatsapp.readMessages(
        [
          {
            remoteJid: msg.key.remoteJid,
            id: msg.key.id,
            participant: msg.key.participant,
          },
        ].filter(Boolean) as any,
      );
    }

    if (processedMessage.isGroup) {
      const store = processedMessage?.metadata;
      if (store) {
        const metadata = await whatsapp.groupMetadata(processedMessage.chat);
        if (typeof store.ephemeralDuration === "undefined")
          store.ephemeralDuration = 0;
        if (
          store.ephemeralDuration &&
          store.ephemeralDuration !== metadata?.ephemeralDuration
        ) {
          console.log(
            `ephemeralDuration for ${processedMessage.chat} has changed!\nupdate groupMetadata...`,
          );
          if (processedMessage) processedMessage.metadata = metadata;
          groupCache.set(processedMessage.chat, metadata);
        }
      }
    }

    const senderLid = msg.key.participant || msg.key.remoteJid;
    if (
      senderLid &&
      processedMessage.pushName &&
      processedMessage.pushName !== "Unknown"
    ) {
      ContactsDB.upsert({
        id: senderLid,
        lid: senderLid.includes("@lid") ? senderLid : undefined,
        phoneNumber: senderLid.includes("@s.whatsapp.net")
          ? senderLid
          : undefined,
        name: processedMessage.pushName,
        notify: processedMessage.pushName,
      });
    }

    const ephemeralExpiration = processedMessage.isGroup
      ? (processedMessage.metadata &&
          processedMessage.metadata.ephemeralDuration) ||
        null
      : (processedMessage.message as { [key: string]: any })[
          processedMessage.type
        ]?.contextInfo?.expiration || null;
    const sendMessageWithEphemeral = async (
      jid: string,
      content: AnyMessageContent,
      options: any = {},
    ) => {
      return whatsapp.sendMessage(jid, content, {
        ...options,
        ephemeralExpiration,
      });
    };

    if (handler.isCommand(processedMessage.body) && processedMessage.chat) {
      await whatsapp.sendPresenceUpdate("composing", processedMessage.chat);
    }

    await handler.handleCommand(
      processedMessage,
      whatsapp,
      LocalStore,
      sendMessageWithEphemeral,
    );
    prMsg(processedMessage);
  }
}
