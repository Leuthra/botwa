import makeWASocket, {
  proto,
  type AnyMessageContent,
  type SocketConfig,
  type WASocket,
  type MiscMessageGenerationOptions,
} from "baileys";

interface QueueItem {
  jid: string;
  content: AnyMessageContent;
  options?: MiscMessageGenerationOptions;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const messageQueue: QueueItem[] = [];
let isProcessingQueue = false;

const processQueue = async (sock: WASocket) => {
  if (isProcessingQueue || messageQueue.length === 0) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const item = messageQueue.shift();
    if (item) {
      try {
        const result = await sock.sendMessage(
          item.jid,
          item.content,
          item.options,
        );
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }

      if (messageQueue.length > 0) {
        const delay = Math.floor(Math.random() * 1000) + 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  isProcessingQueue = false;
};

export default async function createSocket(
  config: SocketConfig,
): Promise<WASocket> {
  const sock: WASocket = makeWASocket(config);

  const originalSendMessage = sock.sendMessage.bind(sock);

  sock.sendMessage = async (
    jid: string,
    content: AnyMessageContent,
    options?: MiscMessageGenerationOptions,
  ) => {
    return new Promise((resolve, reject) => {
      if (messageQueue.length > 500) {
        return reject(new Error("Message queue size limit exceeded (500)"));
      }
      messageQueue.push({ jid, content, options, resolve, reject });

      if (!(sock as any)._originalSendMessage) {
        (sock as any)._originalSendMessage = originalSendMessage;
      }
      if (!isProcessingQueue) {
        processQueueWithOriginal(sock, originalSendMessage);
      }
    });
  };

  return sock;
}

const processQueueWithOriginal = async (
  sock: WASocket,
  originalSendMessage: Function,
) => {
  if (isProcessingQueue || messageQueue.length === 0) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const item = messageQueue.shift();
    if (item) {
      try {
        const result = await originalSendMessage(
          item.jid,
          item.content,
          item.options,
        );
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }

      if (messageQueue.length > 0) {
        const delay = Math.floor(Math.random() * 1000) + 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  isProcessingQueue = false;
};
