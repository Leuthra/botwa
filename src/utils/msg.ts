import {
  downloadContentFromMessage,
  getContentType,
  jidNormalizedUser,
  proto,
  extractMessageContent,
  isJidGroup,
} from "baileys";

const extractText = (message: proto.IMessage | undefined): string => {
  if (!message) return "";

  try {
    const content = extractMessageContent(message);
    if (!content) return "";

    if (content.conversation) return content.conversation;
    if (content.extendedTextMessage?.text)
      return content.extendedTextMessage.text;
    if (content.imageMessage?.caption) return content.imageMessage.caption;
    if (content.videoMessage?.caption) return content.videoMessage.caption;
    if (content.documentMessage?.caption)
      return content.documentMessage.caption;

    return "";
  } catch (error) {
    return "";
  }
};

export interface ProcMsg {
  key: proto.IMessageKey;
  id: string;
  chat: string;
  fromMe: boolean;
  isGroup: boolean;
  sender: string;
  senderName: string;
  participant: string | undefined;
  pushName: string;
  type: string;
  metadata: any;
  message: proto.IMessage;
  msgType: string;
  msgTimestamp: number | null | undefined;
  text: string;
  mentionedJids: string[];
  body: string;
  args?: string[];
  isMedia: boolean;
  isQuoted: boolean | undefined;
  quoted?: ProcMsg;
  quotedType?: string;
  quotedMessage?: ProcMsg;
  quotedText?: string;
  quotedSender?: string;
  mentioned: string[];
  device: "android" | "ios" | "web" | "desktop" | "unknown";
  isBot: boolean;
  reply: (text: string) => Promise<any>;
  download?: () => Promise<Buffer | null>;
}

const dlMedia = async (message: any): Promise<Buffer | null> => {
  try {
    const mimeMap: Record<string, string> = {
      imageMessage: "image",
      videoMessage: "video",
      stickerMessage: "sticker",
      documentMessage: "document",
      audioMessage: "audio",
    };
    const msgKeys = Object.keys(message || {});
    if (msgKeys.length === 0) {
      return null;
    }

    const type = msgKeys[0];
    if (!type) {
      return null;
    }

    const m = message[type];
    if (!m) {
      return null;
    }
    if (type === "conversation") {
      return Buffer.from(m);
    }

    const mediaType = mimeMap[type as keyof typeof mimeMap];
    if (!mediaType) {
      return null;
    }

    const stream = await downloadContentFromMessage(m, mediaType as any);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    return buffer;
  } catch (error) {
    console.error("Error downloading media:", error);
    return null;
  }
};

const getDeviceType = (
  id: string,
): "android" | "ios" | "web" | "desktop" | "unknown" => {
  if (!id) return "unknown";

  const idLength = id.length;
  const startsWith3EB0 = id.startsWith("3EB0");

  if (idLength >= 16 && startsWith3EB0) {
    return "ios";
  } else if (idLength >= 16 && !startsWith3EB0) {
    return "web";
  } else {
    return "android";
  }
};

const procMsg = async (
  originalMessage: proto.WebMessageInfo,
  socket: any,
  dStore: any,
): Promise<ProcMsg> => {
  const message = filterMsgs(originalMessage);
  const { key, message: rawMessage } = message || originalMessage;
  if (!rawMessage) {
    return {
      key: { id: "", remoteJid: "", fromMe: false } as proto.IMessageKey,
      id: "",
      chat: "",
      fromMe: false,
      isGroup: false,
      sender: "",
      senderName: "",
      participant: undefined,
      pushName: "",
      type: "",
      metadata: {},
      message: proto.Message.create({}),
      msgType: "",
      msgTimestamp: 0,
      text: "",
      body: "",
      mentionedJids: [],
      isMedia: false,
      isQuoted: false,
      mentioned: [],
      device: "unknown",
      isBot: false,
      reply: async (_text: string) => {
        return Promise.resolve(null);
      },
      download: async () => dlMedia(rawMessage),
    };
  }
  const id = key?.id || "";
  const chatJid = key?.remoteJid || "";
  const Me = key?.fromMe || false;
  const isGroup = isJidGroup(chatJid) || chatJid?.endsWith("@g.us");
  const timestamp = message.messageTimestamp;
  const rawPushName = (message as any).pushName;
  const pushName =
    (typeof rawPushName === "string" && rawPushName) || "Unknown";
  const metadata =
    isGroup && chatJid ? dStore.groupMetadata?.[chatJid] || {} : {};
  const senderJid =
    key?.participant || (isGroup ? chatJid : jidNormalizedUser(chatJid) || "");

  const sender =
    isGroup && metadata?.participants
      ? metadata.participants.find((p: any) => p.id === senderJid)?.id ||
        senderJid
      : senderJid;

  const type =
    getContentType(rawMessage!) ||
    (rawMessage && typeof rawMessage === "object"
      ? Object.keys(rawMessage!)[0] || ""
      : "");
  const msgType = type as string;

  const messageContent = (rawMessage as any)[msgType];
  const contextInfo =
    messageContent?.contextInfo || (rawMessage as any).contextInfo;
  const quotedRawMessage = contextInfo?.stanzaId;
  const isQuoted = !!quotedRawMessage;

  const body = messageContent
    ? messageContent.text ||
      messageContent.caption ||
      (typeof messageContent === "string" ? messageContent : "")
    : "";
  const isMedia =
    /imageMessage|videoMessage|stickerMessage|documentMessage|audioMessage/.test(
      msgType,
    );

  const currentMentions = (contextInfo?.mentionedJid || []) as string[];
  let quotedMentions: string[] = [];
  if (isQuoted && contextInfo?.quotedMessage) {
    const qMsgObj = contextInfo.quotedMessage;
    const qMsgType = Object.keys(qMsgObj || {})[0];
    if (qMsgType && (qMsgObj as any)[qMsgType]?.contextInfo?.mentionedJid) {
      quotedMentions = (qMsgObj as any)[qMsgType].contextInfo.mentionedJid;
    }
  }

  const uniqueMentions = new Set([...currentMentions, ...quotedMentions]);
  const allMentions: string[] = Array.from(uniqueMentions);

  let quoted: ProcMsg | undefined;
  let quotedType = "";
  let quotedText = "";
  let quotedSender = "";

  if (isQuoted) {
    const quotedMsgId = contextInfo?.stanzaId;
    let quotedContent: proto.WebMessageInfo | undefined = undefined;

    if (quotedMsgId) {
      quotedContent = (Object.entries(dStore.messages) as [string, any[]][])
        .map(([_, i]) => i.find((b: any) => b.key.id === quotedMsgId))
        .find(
          (item: any) =>
            item && typeof item === "object" && item.key?.id === quotedMsgId,
        ) as proto.WebMessageInfo | undefined;

      if (!quotedContent && contextInfo?.quotedMessage) {
        const userJid = socket?.user?.id?.split(":")[0] + "@s.whatsapp.net";
        quotedContent = {
          key: {
            id: quotedMsgId,
            remoteJid: chatJid,
            fromMe: contextInfo.participant === userJid,
            participant: contextInfo.participant,
          },
          message: contextInfo.quotedMessage,
          messageTimestamp: timestamp,
        } as any;
      }
    }
    if (quotedContent) {
      quoted = await procMsg(quotedContent, socket, dStore);
      quotedType = getContentType(quotedContent.message || undefined) || "";
      const quotedMessageForExtract: proto.IMessage | undefined =
        quotedContent.message === null ? undefined : quotedContent.message;
      quotedText = extractText(quotedMessageForExtract);
      quotedSender = contextInfo?.participant || "";
    } else {
      quoted = {
        key: { id: "", remoteJid: "", fromMe: false } as proto.IMessageKey,
        id: "",
        chat: "",
        fromMe: false,
        isGroup: false,
        sender: "",
        senderName: "",
        participant: undefined,
        pushName: "",
        type: "",
        metadata: {},
        message: proto.Message.create({}),
        msgType: "",
        msgTimestamp: 0,
        text: "",
        body: "",
        mentionedJids: [],
        isMedia: false,
        isQuoted: false,
        mentioned: [],
        device: "unknown",
        isBot: false,
        reply: async (_text: string) => {
          return Promise.resolve(null);
        },
        download: async () => dlMedia((quotedContent as any)?.message),
      };
    }
  }

  const device = id ? getDeviceType(id) : "unknown";
  const isFromMe = key?.fromMe || false;
  const isBot = isFromMe;

  const normalizedTimestamp = timestamp
    ? typeof timestamp === "number"
      ? timestamp
      : Number(timestamp)
    : 0;

  return {
    key: key!,
    id,
    chat: chatJid,
    fromMe: isFromMe,
    isGroup,
    sender,
    senderName: pushName,
    participant: key?.participant || undefined,
    pushName,
    type: msgType,
    metadata,
    message: rawMessage || proto.Message.create({}),
    msgType,
    msgTimestamp: normalizedTimestamp,
    text: body,
    body: body,
    mentionedJids: allMentions,
    isMedia,
    isQuoted: isQuoted || false,
    ...(isQuoted
      ? {
          quoted,
          quotedType,
          quotedMessage: quoted,
          quotedText,
          quotedSender,
        }
      : {}),
    mentioned: allMentions,
    device,
    isBot,
    reply: (text: string) => {
      const isQuoted = !!id;
      return socket.sendMessage(
        chatJid,
        { text },
        isQuoted ? { quoted: originalMessage } : {},
      );
    },
    download: async () => dlMedia(rawMessage),
  };
};

function filterMsgs(message: proto.WebMessageInfo): proto.WebMessageInfo {
  const filteredMessage = { ...message };
  if (
    filteredMessage?.message &&
    Object.keys(filteredMessage.message).length > 1
  ) {
    if (filteredMessage.message?.protocolMessage) {
      delete filteredMessage.message.protocolMessage;
    } else if (filteredMessage.message?.messageContextInfo) {
      delete filteredMessage.message.messageContextInfo;
    } else if (filteredMessage.message?.senderKeyDistributionMessage) {
      delete filteredMessage.message.senderKeyDistributionMessage;
    }
  }
  return filteredMessage as proto.WebMessageInfo;
}

export { procMsg, dlMedia };
