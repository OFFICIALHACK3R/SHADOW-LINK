// Utilities for array buffer conversion
export const ab2str = (buf: ArrayBuffer): string => {
  return String.fromCharCode.apply(null, new Uint8Array(buf) as any);
};

export const str2ab = (str: string): ArrayBuffer => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// Key Pair Generation (ECDH P-256)
export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
};

// Export public key to string (spki -> base64)
export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
};

// Import public key from string
export const importPublicKey = async (pem: string): Promise<CryptoKey> => {
  const buffer = base64ToArrayBuffer(pem);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
};

// Generate a linking code based on public key + date (Simulating rotation)
export const generateLinkingCode = async (publicKeyStr: string): Promise<string> => {
  const dateStr = new Date().toISOString().split('T')[0]; // Rotates daily
  const input = `${publicKeyStr}:${dateStr}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  // Take first 4 bytes, convert to hex, then integer, then mod 1000000 for a 6-digit code
  // Simulating a human-readable code
  const hex = hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
  const num = parseInt(hex, 16);
  // Base 36 for shorter alphanumeric code
  return num.toString(36).toUpperCase().substring(0, 6);
};

// Derive Shared Secret (ECDH)
export const deriveSharedKey = async (privateKey: CryptoKey, publicKey: CryptoKey) => {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
};

// Encrypt Message
export const encryptMessage = async (sharedKey: CryptoKey, text: string) => {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    encoded
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encrypted),
  };
};

// Decrypt Message
export const decryptMessage = async (sharedKey: CryptoKey, ivB64: string, dataB64: string) => {
  const iv = base64ToArrayBuffer(ivB64);
  const data = base64ToArrayBuffer(dataB64);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      sharedKey,
      data
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    throw new Error("Failed to decrypt message");
  }
};