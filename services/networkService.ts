import { EncryptedPayload, NetworkPacket } from '../types';

// Simulate a network relay
const channel = new BroadcastChannel('shadowlink_secure_network');
const directoryChannel = new BroadcastChannel('shadowlink_directory');

interface DirectoryPacket {
  type: 'REGISTER' | 'QUERY' | 'RESPONSE';
  code?: string;
  publicKey?: string;
  username?: string;
  requesterId?: string;
}

// In-memory directory simulation (This would be the server DB)
// Since we can't share memory easily between tabs without a server or LocalStorage hacks,
// we will use the Directory Channel to "ask" who owns a code.
// When a user registers (comes online), they listen for queries about their code.

type MessageCallback = (senderId: string, senderUsername: string, payload: EncryptedPayload, file?: File | Blob) => void;
type DirectoryCallback = (code: string, publicKey: string, username: string) => void;

let onMessageReceived: MessageCallback | null = null;
let onDirectoryResponse: DirectoryCallback | null = null;
let myIdentity: { code: string; publicKey: string; username: string } | null = null;

// Listen for incoming messages
channel.onmessage = (event) => {
  const data = event.data as NetworkPacket;
  if (data.type === 'MSG' && data.targetId === myIdentity?.publicKey) {
    if (onMessageReceived) {
      onMessageReceived(data.senderId, data.senderUsername, data.payload, data.fileBlob);
    }
  }
};

// Directory Protocol
directoryChannel.onmessage = (event) => {
  const data = event.data as DirectoryPacket;

  // If someone is asking for a code, and it's mine, I respond.
  if (data.type === 'QUERY' && data.code === myIdentity?.code) {
    directoryChannel.postMessage({
      type: 'RESPONSE',
      code: myIdentity.code,
      publicKey: myIdentity.publicKey,
      username: myIdentity.username,
      requesterId: data.requesterId
    });
  }

  // If I asked for a code, and I get a response for me
  if (data.type === 'RESPONSE' && data.requesterId === myIdentity?.publicKey) {
    if (onDirectoryResponse && data.code && data.publicKey && data.username) {
      onDirectoryResponse(data.code, data.publicKey, data.username);
    }
  }
};

export const NetworkService = {
  init: (identity: { code: string; publicKey: string; username: string }, onMsg: MessageCallback) => {
    myIdentity = identity;
    onMessageReceived = onMsg;
    // Announce presence (optional in this passive model)
  },

  send: (targetPublicKey: string, payload: EncryptedPayload, file?: File | Blob) => {
    const packet: NetworkPacket = {
      targetId: targetPublicKey,
      senderId: myIdentity?.publicKey || '',
      senderUsername: myIdentity?.username || 'Unknown',
      payload,
      fileBlob: file, // Passed as Transferable/Clone via BroadcastChannel
      type: 'MSG'
    };
    channel.postMessage(packet);
    // Loopback for local simulation if we were sending to self (rare)
  },

  resolveCode: (code: string, callback: DirectoryCallback) => {
    onDirectoryResponse = callback;
    directoryChannel.postMessage({
      type: 'QUERY',
      code,
      requesterId: myIdentity?.publicKey
    });
  },

  cleanup: () => {
    // channel.close(); // Keep open for SPA lifecycle
  }
};