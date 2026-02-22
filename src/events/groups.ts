import type { WASocket, GroupParticipant } from "baileys";
import { jidNormalizedUser } from "baileys";
import NodeCache from "@cacheable/node-cache";
import type { LocalStore } from "../types.js";

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
      console.error(`[GROUPS.UPSERT] Error adding group ${groupMetadata.id}:`, error);
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
  event: { id: string; author: string; authorPn?: string; participants: GroupParticipant[]; action: string },
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

    switch (action) {
      case "add":
        group.participants.push(
          ...participants.map((p) => ({ id: jidNormalizedUser(p.id), admin: null })),
        );
        break;
      case "demote":
        for (const p of group.participants) {
          if (participantIds.includes(jidNormalizedUser(p.id))) p.admin = null;
        }
        break;
      case "promote":
        for (const p of group.participants) {
          if (participantIds.includes(jidNormalizedUser(p.id))) p.admin = "admin";
        }
        break;
      case "remove":
        group.participants = group.participants.filter(
          (p: { id: string }) => !participantIds.includes(jidNormalizedUser(p.id)),
        );
        break;
    }
  } catch (error) {
    console.error(`[GROUP-PARTICIPANTS.UPDATE] Error processing group ${id}:`, error);
  }
}
