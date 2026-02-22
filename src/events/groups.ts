import type { WASocket, GroupParticipant } from "baileys";
import { jidNormalizedUser } from "baileys";
import NodeCache from "@cacheable/node-cache";
import type { LocalStore } from "../types.js";
import { KVS } from "../utils/db.js";

export async function onGroupsUpsert(
  newGroups: any[],
  LocalStore: LocalStore,
  groupCache: NodeCache<any>,
): Promise<void> {
  for (const groupMetadata of newGroups) {
    try {
      groupCache.set(groupMetadata.id, groupMetadata);
      LocalStore.groupMetadata[groupMetadata.id] = groupMetadata;
    } catch (error) {
      console.error(
        `[GROUPS.UPSERT] Error adding group ${groupMetadata.id}:`,
        error,
      );
    }
  }
}

export async function onGroupsUpdate(
  updates: any[],
  whatsapp: WASocket,
  LocalStore: LocalStore,
  groupCache: NodeCache<any>,
): Promise<void> {
  for (const update of updates) {
    const id = update.id;
    if (!id) continue;
    try {
      const metadata = await whatsapp.groupMetadata(id);
      groupCache.set(id, metadata);
      LocalStore.groupMetadata[id] = {
        ...(LocalStore.groupMetadata[id] || {}),
        ...metadata,
      };
    } catch (error) {
      console.error(`[GROUPS.UPDATE] Error updating group ${id}:`, error);
    }
  }
}

export async function onGroupParticipantsUpdate(
  event: {
    id: string;
    author: string;
    authorPn?: string;
    participants: GroupParticipant[];
    action: string;
  },
  whatsapp: WASocket,
  LocalStore: LocalStore,
  groupCache: NodeCache<any>,
): Promise<void> {
  const { id, participants, action } = event;
  if (!id) return;
  try {
    const metadata = await whatsapp.groupMetadata(id);
    groupCache.set(id, metadata);
    LocalStore.groupMetadata[id] = metadata;

    const group = LocalStore.groupMetadata[id];
    if (!group?.participants) return;

    const participantIds = participants.map((p) => jidNormalizedUser(p.id));

    const isEventsEnabled = (() => {
      const val = KVS.get(`groupevents_${id}`) || KVS.get(`welcome_${id}`);
      return val === "true" || val === true || val === "1";
    })();

    switch (action) {
      case "add":
        group.participants.push(
          ...participants.map((p) => ({
            id: jidNormalizedUser(p.id),
            admin: null,
          })),
        );

        if (isEventsEnabled) {
          try {
            const mentions = participantIds;
            let welcomeMessage = `Welcome to *${metadata.subject}*!\n\n`;
            welcomeMessage +=
              mentions.map((m) => `@${m.split("@")[0]}`).join(", ") + " 🎉";
            await whatsapp.sendMessage(id, { text: welcomeMessage, mentions });
          } catch (err) {
            console.error(
              `[GROUP-PARTICIPANTS.UPDATE] Error sending welcome message:`,
              err,
            );
          }
        }
        break;
      case "demote":
        for (const p of group.participants) {
          if (participantIds.includes(jidNormalizedUser(p.id))) p.admin = null;
        }

        if (isEventsEnabled) {
          try {
            const mentions = participantIds;
            const text =
              `⚠️ Demoted to regular member:\n` +
              mentions.map((m) => `@${m.split("@")[0]}`).join(", ") +
              ` has been _demoted_ from Admin.`;
            await whatsapp.sendMessage(id, { text, mentions });
          } catch (err) {}
        }
        break;
      case "promote":
        for (const p of group.participants) {
          if (participantIds.includes(jidNormalizedUser(p.id)))
            p.admin = "admin";
        }

        if (isEventsEnabled) {
          try {
            const mentions = participantIds;
            const text =
              `🎖️ Congratulations!\n` +
              mentions.map((m) => `@${m.split("@")[0]}`).join(", ") +
              ` has been promoted to Group Admin.`;
            await whatsapp.sendMessage(id, { text, mentions });
          } catch (err) {}
        }
        break;
      case "remove":
        group.participants = group.participants.filter(
          (p: { id: string }) =>
            !participantIds.includes(jidNormalizedUser(p.id)),
        );

        if (isEventsEnabled) {
          try {
            const mentions = participantIds;
            let leaveMessage =
              `Goodbye: ` +
              mentions.map((m) => `@${m.split("@")[0]}`).join(", ");
            await whatsapp.sendMessage(id, { text: leaveMessage, mentions });
          } catch (err) {}
        }
        break;
    }
  } catch (error) {
    console.error(
      `[GROUP-PARTICIPANTS.UPDATE] Error processing group ${id}:`,
      error,
    );
  }
}
