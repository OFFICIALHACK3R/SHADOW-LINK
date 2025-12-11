export interface UserIdentity {
  username: string;
  publicKey: string; // Exported JWK or raw string format
  privateKey: CryptoKey; // Kept in memory/storage
  publicKeyObj: CryptoKey;
  created: number;
}

export interface Contact {
  id: string; // The public key string acts as ID
  username: string;
  publicKeyObj: CryptoKey;
  addedAt: number;
  lastSeen?: number;
  isAI?: boolean;
}

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  data?: File | Blob; // Used for P2P transfer
  url?: string; // Used for display after reception
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string; // 'AI' for Gemini bot
  content: string; // Decrypted content
  attachment?: FileAttachment;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface EncryptedPayload {
  iv: string; // Base64
  data: string; // Base64
  senderPublicKey: string; // To derive shared secret
  timestamp: number;
  attachmentMetadata?: {
    name: string;
    size: number;
    type: string;
  };
}

export interface NetworkMessage {
  type: 'handshake' | 'message';
  payload: any;
}

export interface NetworkPacket {
  targetId: string; // Public Key of recipient
  senderId: string; // Public Key of sender
  senderUsername: string; // Alias of sender for auto-adding
  payload: EncryptedPayload;
  fileBlob?: File | Blob; // Transferred "out-of-band" for P2P simulation to support 5GB
  type: 'MSG';
}