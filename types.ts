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

export interface Message {
  id: string;
  senderId: string;
  recipientId: string; // 'AI' for Gemini bot
  content: string; // Decrypted content
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface EncryptedPayload {
  iv: string; // Base64
  data: string; // Base64
  senderPublicKey: string; // To derive shared secret
  timestamp: number;
}

export interface NetworkMessage {
  type: 'handshake' | 'message';
  payload: any;
}