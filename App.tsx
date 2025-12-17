import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Lock, Send, LogOut, UserPlus, Bot, User, Terminal, Cpu, Globe, Wifi, Activity, ImageIcon, Paperclip, X, File as FileIcon, Download, Loader } from 'lucide-react';
import { UserIdentity, Contact, Message, EncryptedPayload, FileAttachment } from './types';
import * as CryptoService from './services/cryptoService';
import { NetworkService } from './services/networkService';
import { generateAIResponse } from './services/geminiService';
import { Button } from './components/Button';
import { Input } from './components/Input';
import JSZip from 'jszip'; // Imported via importmap in index.html

// --- Components defined internally ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-black/90">
      <div className="bg-terminal-black border border-terminal-green w-full max-w-lg shadow-[0_0_20px_rgba(0,255,65,0.1)] relative">
        {/* Modal Header */}
        <div className="bg-terminal-green text-black px-4 py-2 flex items-center justify-between font-bold uppercase tracking-wider text-sm">
          <span>// {title}</span>
          <button onClick={onClose} className="hover:bg-black hover:text-terminal-green px-2 text-lg leading-none">
            &times;
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: (identity: UserIdentity) => void }) => {
  const [username, setUsername] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [isBooting, setIsBooting] = useState(false);

  const handleRegister = async () => {
    if (!username.trim()) return;
    setIsBooting(true);
    
    const steps = [
      "Initializing crypto subsystem...",
      "Generating ECDH P-256 Keypair...",
      "Allocating memory buffers...",
      "Establishing secure handshake protocol...",
      `Identity created: [${username}]`
    ];

    for (const step of steps) {
      setLog(prev => [...prev, `> ${step}`]);
      await new Promise(r => setTimeout(r, 400));
    }
    
    try {
      const keyPair = await CryptoService.generateKeyPair();
      const pubKeyStr = await CryptoService.exportPublicKey(keyPair.publicKey);
      
      const identity: UserIdentity = {
        username: username,
        publicKey: pubKeyStr,
        privateKey: keyPair.privateKey,
        publicKeyObj: keyPair.publicKey,
        created: Date.now()
      };
      
      setLog(prev => [...prev, "> SYSTEM READY."]);
      await new Promise(r => setTimeout(r, 600));
      onComplete(identity);
    } catch (e) {
      console.error(e);
      setLog(prev => [...prev, "> ERROR: KEY GENERATION FAILED."]);
      setIsBooting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-terminal-black p-4 font-mono text-terminal-green">
      <div className="w-full max-w-2xl border border-terminal-green/30 p-1">
        <div className="bg-terminal-dim p-2 mb-8 border-b border-terminal-green/30 flex justify-between items-center text-xs text-gray-500 uppercase">
             <span>ShadowLink v2.0</span>
             <span>Secure Shell</span>
        </div>

        <div className="p-8 space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase glitch-text">
              Shadow<span className="text-white">Link</span>
            </h1>
            <p className="text-terminal-greenDim uppercase tracking-widest text-sm">
              <span className="animate-blink">_</span> Anonymous. Encrypted. Untraceable.
            </p>
          </div>

          {!isBooting ? (
            <div className="space-y-6 max-w-md">
               <Input 
                 label="ENTER ALIAS"
                 placeholder="CODENAME" 
                 value={username}
                 onChange={(e) => setUsername(e.target.value.toUpperCase())}
                 autoFocus
               />
               <Button 
                 className="w-full" 
                 onClick={handleRegister}
                 disabled={!username.trim()}
               >
                 INITIALIZE SYSTEM
               </Button>
            </div>
          ) : (
            <div className="h-48 bg-black border border-terminal-greenDim p-4 font-mono text-xs overflow-hidden flex flex-col justify-end">
              {log.map((l, i) => (
                <div key={i} className="text-terminal-green">{l}</div>
              ))}
              <div className="animate-blink text-terminal-green mt-1">_</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Helpers ---
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const processZipForAI = async (file: File): Promise<string> => {
  try {
    const zip = await JSZip.loadAsync(file);
    let summary = `[ARCHIVE ANALYSIS]: ${file.name}\n`;
    let content = "";
    
    // Limit to prevent context overflow (approx 50 files or 1MB text)
    let fileCount = 0;
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
       const entry = zipEntry as any;
       if (entry.dir) continue;
       
       summary += `- ${path}\n`;
       
       // Heuristic for code/text files
       if (path.match(/\.(txt|md|js|ts|py|html|css|json|xml|c|cpp|h|java|sh|yaml|yml)$/i)) {
          if (fileCount < 50) {
             const text = await entry.async("string");
             // Truncate large files
             const truncatedText = text.length > 20000 ? text.substring(0, 20000) + "\n...[TRUNCATED]" : text;
             content += `\n--- START FILE: ${path} ---\n${truncatedText}\n--- END FILE: ${path} ---\n`;
             fileCount++;
          }
       }
    }
    return summary + "\nCONTENT EXTRACTION:\n" + content;
  } catch (e) {
    return `Error extracting zip: ${e}`;
  }
};

// --- Main App ---

const AI_CONTACT_ID = 'shadow-bot-ai';

export default function App() {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [linkingCode, setLinkingCode] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  
  // File Handling State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI States
  const [showAddContact, setShowAddContact] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [addCodeInput, setAddCodeInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contactsRef = useRef(contacts);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  useEffect(() => {
    const aiContact: Contact = {
      id: AI_CONTACT_ID,
      username: 'ShadowBot_AI',
      publicKeyObj: {} as CryptoKey, 
      addedAt: Date.now(),
      isAI: true
    };
    setContacts(prev => {
      if (prev.find(c => c.id === AI_CONTACT_ID)) return prev;
      return [aiContact, ...prev];
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeContactId]);

  useEffect(() => {
    if (!identity) return;
    CryptoService.generateLinkingCode(identity.publicKey).then(code => {
      setLinkingCode(code);
      NetworkService.init(
        { code, publicKey: identity.publicKey, username: identity.username },
        async (senderId, senderUsername, payload, fileBlob) => {
          // --- AUTO LINKING LOGIC ---
          let sender = contactsRef.current.find(c => c.id === senderId);
          
          if (!sender) {
            try {
              const pubKeyObj = await CryptoService.importPublicKey(senderId);
              sender = {
                id: senderId,
                username: senderUsername || 'UNKNOWN_AGENT',
                publicKeyObj: pubKeyObj,
                addedAt: Date.now()
              };
              setContacts(prev => [...prev, sender!]);
              console.log(`[ShadowLink] Auto-linked new contact: ${senderUsername}`);
            } catch (e) {
               console.error("Failed to auto-add contact", e);
               return;
            }
          }

          try {
            const sharedKey = await CryptoService.deriveSharedKey(identity.privateKey, sender.publicKeyObj);
            const content = await CryptoService.decryptMessage(sharedKey, payload.iv, payload.data);
            
            // Reconstruct attachment from metadata + blob
            let attachment: FileAttachment | undefined;
            if (payload.attachmentMetadata && fileBlob) {
               attachment = {
                  name: payload.attachmentMetadata.name,
                  size: payload.attachmentMetadata.size,
                  type: payload.attachmentMetadata.type,
                  data: fileBlob,
                  url: URL.createObjectURL(fileBlob)
               };
            }

            const newMessage: Message = {
              id: Date.now().toString() + Math.random().toString(),
              senderId: sender.id,
              recipientId: identity.publicKey,
              content,
              attachment,
              timestamp: payload.timestamp,
              status: 'read'
            };
            setMessages(prev => [...prev, newMessage]);
          } catch (e) {
            console.error("Decryption failure", e);
          }
        }
      );
    });
    return () => NetworkService.cleanup();
  }, [identity]); 

  const sendMessageToId = async (contactId: string, content: string) => {
    if (!identity) return;
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    let attachmentPayload: FileAttachment | undefined;
    let fileForNetwork: File | Blob | undefined;

    if (selectedFile) {
       attachmentPayload = {
         name: selectedFile.name,
         size: selectedFile.size,
         type: selectedFile.type,
         data: selectedFile,
         url: URL.createObjectURL(selectedFile)
       };
       fileForNetwork = selectedFile;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: identity.publicKey,
      recipientId: contact.id,
      content: content,
      attachment: attachmentPayload,
      timestamp: Date.now(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, newMessage]);
    setSelectedFile(null); // Clear input

    if (contact.isAI) {
        setIsProcessingFile(true);
        setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' } : m));
        
        setTimeout(async () => {
            const history = messages
              .filter(m => (m.senderId === identity.publicKey && m.recipientId === AI_CONTACT_ID) || m.senderId === AI_CONTACT_ID)
              .map(m => ({
                role: m.senderId === identity.publicKey ? 'user' as const : 'model' as const,
                parts: [{ text: m.content }]
              }));
            
            let finalPrompt = content;
            const aiAttachments = [];

            // AI File Processing
            if (attachmentPayload) {
               const file = attachmentPayload.data as File;
               
               // 1. Image / Video Processing
               if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                  const base64 = await readFileAsBase64(file);
                  aiAttachments.push({ mimeType: file.type, data: base64 });
                  finalPrompt += `\n[Use the attached ${file.type} for analysis]`;
               } 
               // 2. ZIP / Archive Processing
               else if (file.name.endsWith('.zip') || file.type.includes('zip')) {
                  const extractedContent = await processZipForAI(file);
                  finalPrompt += `\n\n${extractedContent}`;
               }
               // 3. Text / Code Processing
               else if (file.size < 5000000) { // Limit raw text read to 5MB
                  const text = await file.text();
                  finalPrompt += `\n\n--- FILE ATTACHMENT: ${file.name} ---\n${text}\n`;
               } else {
                  finalPrompt += `\n[File ${file.name} is too large for text analysis, analyze based on filename only]`;
               }
            }
            
            setIsProcessingFile(false);
            const responseText = await generateAIResponse(finalPrompt, history, aiAttachments);
            const aiMessage: Message = {
              id: Date.now().toString(),
              senderId: AI_CONTACT_ID,
              recipientId: identity.publicKey,
              content: responseText,
              timestamp: Date.now(),
              status: 'read'
            };
            setMessages(prev => [...prev, aiMessage]);
        }, 500);
    } else {
      // P2P Sending (Simulation)
      try {
        const sharedKey = await CryptoService.deriveSharedKey(identity.privateKey, contact.publicKeyObj);
        const encrypted = await CryptoService.encryptMessage(sharedKey, content);
        
        const payload: EncryptedPayload = { 
          ...encrypted, 
          senderPublicKey: identity.publicKey, 
          timestamp: Date.now(),
          attachmentMetadata: attachmentPayload ? {
             name: attachmentPayload.name,
             size: attachmentPayload.size,
             type: attachmentPayload.type
          } : undefined
        };
        
        // Pass fileBlob separately via BroadcastChannel (mimics direct P2P stream)
        NetworkService.send(contact.id, payload, fileForNetwork);
        
        setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' } : m));
      } catch (e) {
        setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'failed' } : m));
      }
    }
  }

  const handleAddContact = () => {
    if (!addCodeInput.trim()) return;
    setIsResolving(true);
    setTimeout(() => {
      NetworkService.resolveCode(addCodeInput.toUpperCase(), async (code, pubKeyStr, username) => {
        setIsResolving(false);
        if (pubKeyStr === identity?.publicKey) {
          alert("ERROR: SELF_LINK_DETECTED");
          return;
        }
        try {
          const pubKeyObj = await CryptoService.importPublicKey(pubKeyStr);
          const newContact: Contact = {
            id: pubKeyStr,
            username,
            publicKeyObj: pubKeyObj,
            addedAt: Date.now()
          };
          
          if (!contacts.find(c => c.id === newContact.id)) {
              setContacts(prev => [...prev, newContact]);
              setTimeout(async () => {
                  if(!identity) return;
                  const sharedKey = await CryptoService.deriveSharedKey(identity.privateKey, newContact.publicKeyObj);
                  const handshakeMsg = `[SYSTEM_HANDSHAKE]: Secure Link Established by ${identity.username}.`;
                  const encrypted = await CryptoService.encryptMessage(sharedKey, handshakeMsg);
                  const payload: EncryptedPayload = { ...encrypted, senderPublicKey: identity.publicKey, timestamp: Date.now() };
                  NetworkService.send(newContact.id, payload);
                  
                  const msg: Message = {
                     id: Date.now().toString(),
                     senderId: identity.publicKey,
                     recipientId: newContact.id,
                     content: handshakeMsg,
                     timestamp: Date.now(),
                     status: 'sent'
                  };
                  setMessages(prev => [...prev, msg]);
              }, 500);
          }
          
          setShowAddContact(false);
          setAddCodeInput('');
          setActiveContactId(newContact.id);
        } catch (e) {
          alert("ERROR: INVALID_KEY_DATA");
        }
      });
      setTimeout(() => { if (isResolving) setIsResolving(false); }, 5000);
    }, 1000);
  };

  const sendMessage = async () => {
    if ((!messageInput.trim() && !selectedFile) || !activeContactId) return;
    const msg = messageInput;
    setMessageInput('');
    await sendMessageToId(activeContactId, msg);
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/({{MEDIA:(?:VIDEO|AUDIO|IMAGE):[^}]+}})/g);
    return parts.map((part, index) => {
        const videoMatch = part.match(/{{MEDIA:VIDEO:([^}]+)}}/);
        if (videoMatch) {
            return (
                <div key={index} className="my-2 border border-terminal-green bg-black p-1 shadow-[0_0_10px_rgba(0,255,65,0.2)] inline-block max-w-full">
                    <div className="text-[10px] text-terminal-greenDim uppercase mb-1 flex justify-between">
                        <span>[ VIDEO_PLAYBACK_MODULE ]</span>
                        <span className="animate-pulse">● LIVE</span>
                    </div>
                    <video 
                      src={videoMatch[1]} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full max-w-md grayscale hover:grayscale-0 transition-all cursor-pointer" 
                    />
                </div>
            );
        }
        const audioMatch = part.match(/{{MEDIA:AUDIO:([^}]+)}}/);
        if (audioMatch) {
             return (
                <div key={index} className="my-2 border border-terminal-green bg-black p-2 flex items-center gap-2 inline-block">
                    <div className="w-2 h-2 bg-terminal-green animate-pulse"></div>
                    <span className="text-xs text-terminal-green font-bold">PLAYING_AUDIO_STREAM...</span>
                    <audio src={audioMatch[1]} controls className="h-8 w-64" />
                </div>
             );
        }
        const imageMatch = part.match(/{{MEDIA:IMAGE:([^}]+)}}/);
        if (imageMatch) {
            return (
                <div key={index} className="my-2 border border-terminal-green/50 bg-black p-1 inline-block">
                   <div className="text-[10px] text-terminal-greenDim uppercase mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>[ VISUAL_DATA_RENDER ]</span>
                   </div>
                   <img 
                     src={imageMatch[1]} 
                     alt="Generated Content"
                     className="max-w-md w-full opacity-80 hover:opacity-100 transition-opacity border border-terminal-green/20"
                   />
                </div>
            );
        }
        
        return (
          <span key={index}>
            {part.split(/(https?:\/\/[^\s]+|blob:[^\s]+)/g).map((subPart, i) => {
               if (subPart.match(/^(https?:\/\/|blob:)/)) {
                 return (
                   <a 
                     key={i} 
                     href={subPart} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="text-terminal-green underline hover:text-white break-all bg-terminal-green/10 px-1 font-bold"
                   >
                     {subPart.startsWith('blob:') ? '[ ACCESS_DEPLOYED_NODE ]' : subPart}
                   </a>
                 );
               }
               return subPart;
            })}
          </span>
        );
    });
  };

  if (!identity) {
    return <Onboarding onComplete={setIdentity} />;
  }

  const activeContact = contacts.find(c => c.id === activeContactId);
  const currentMessages = messages.filter(m => 
    (m.senderId === identity.publicKey && m.recipientId === activeContactId) ||
    (m.senderId === activeContactId && m.recipientId === identity.publicKey)
  );

  return (
    <div className="flex h-screen bg-terminal-black text-terminal-green font-mono overflow-hidden selection:bg-terminal-green selection:text-black">
      {/* Sidebar */}
      <aside className="w-80 bg-terminal-dim border-r border-terminal-border flex flex-col hidden md:flex">
        {/* User Identity Header */}
        <div className="p-4 border-b border-terminal-border bg-black">
          <div 
            onClick={() => setShowProfile(true)}
            className="border border-terminal-greenDim p-3 hover:bg-terminal-greenDim/10 cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase text-terminal-greenDim font-bold">Identity</span>
              <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse shadow-[0_0_10px_#00ff41]"></div>
            </div>
            <h2 className="font-bold text-lg text-white group-hover:text-terminal-green transition-colors">{identity.username}</h2>
            <p className="text-[10px] text-gray-500 truncate mt-1">KEY: {identity.publicKey.substring(0, 16)}...</p>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-xs font-bold text-terminal-greenDim uppercase tracking-widest">[ TARGETS ]</h3>
             <button onClick={() => setShowAddContact(true)} className="text-terminal-green hover:text-white hover:bg-terminal-green/20 px-2 py-1 text-xs border border-transparent hover:border-terminal-green transition-all">
                + LINK
             </button>
          </div>

          <div className="space-y-1">
            {contacts.map(contact => (
              <div 
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={`p-3 border cursor-pointer transition-all font-mono text-sm flex items-center gap-3 ${
                  activeContactId === contact.id 
                    ? 'border-terminal-green bg-terminal-green/10 text-white shadow-[0_0_10px_rgba(0,255,65,0.1)]' 
                    : 'border-transparent text-gray-500 hover:border-terminal-greenDim hover:text-terminal-green'
                }`}
              >
                <span className="text-xs">{activeContactId === contact.id ? '>' : ' '}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                     <span className="font-bold tracking-wide">{contact.username}</span>
                     {contact.isAI && <Bot className="w-3 h-3" />}
                  </div>
                  <div className="text-[10px] opacity-60 uppercase">{contact.isAI ? 'Neural_Net' : 'Encrypted'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-2 border-t border-terminal-border bg-black text-[10px] text-gray-600 flex justify-between font-mono">
           <span>MEM: {Math.floor(Math.random() * 40 + 20)}MB</span>
           <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> SECURE</span>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-black relative">
        {activeContact ? (
          <>
            {/* Chat Header */}
            <header className="h-14 border-b border-terminal-green bg-black flex items-center justify-between px-6 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
               <div className="flex items-center gap-4">
                  <Activity className="w-4 h-4 text-terminal-green animate-pulse" />
                  <div className="flex flex-col">
                    <h3 className="font-bold text-terminal-green uppercase tracking-wider text-sm">
                      CONNECTION ESTABLISHED: {activeContact.username}
                    </h3>
                    <span className="text-[10px] text-terminal-greenDim">
                      PROTOCOL: {activeContact.isAI ? 'TLS_1.3' : 'DOUBLE_RATCHET_V2'}
                    </span>
                  </div>
               </div>
               <div className="text-xs text-terminal-alert font-bold animate-pulse">
                  {isProcessingFile ? '[ UPLOADING... ]' : '[ REC ]'}
               </div>
            </header>

            {/* Terminal Output / Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-sm bg-black/80">
              <div className="mb-6 text-xs text-gray-600 border-b border-gray-900 pb-2">
                 <span># BEGIN ENCRYPTED SESSION LOG</span><br/>
                 <span># TIMESTAMP: {new Date().toISOString()}</span><br/>
                 <span># TARGET: {activeContact.id.substring(0,32)}...</span>
              </div>

              {currentMessages.map((msg, i) => {
                const isMe = msg.senderId === identity.publicKey;
                const time = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div key={msg.id} className="hover:bg-terminal-green/5 p-1 -mx-2 px-2 transition-colors">
                    <div className="flex items-start">
                        <span className="text-gray-600 mr-2 whitespace-nowrap">[{time}]</span>
                        <div className="flex-1">
                            {isMe ? (
                            <span className="text-white font-bold mr-2">&lt;{identity.username}&gt;</span>
                            ) : (
                            <span className="text-terminal-green font-bold mr-2">&lt;{activeContact.username}&gt;</span>
                            )}
                            
                            {/* Attachment Display */}
                            {msg.attachment && (
                                <div className="inline-flex items-center gap-3 p-2 my-2 border border-terminal-greenDim/50 bg-terminal-green/5 max-w-sm rounded-none">
                                    <div className="w-10 h-10 bg-terminal-green/10 flex items-center justify-center border border-terminal-green/30">
                                        <FileIcon className="w-5 h-5 text-terminal-green" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white truncate text-xs">{msg.attachment.name}</div>
                                        <div className="text-[10px] text-terminal-greenDim">{formatBytes(msg.attachment.size)} • {msg.attachment.type || 'BINARY'}</div>
                                    </div>
                                    {msg.attachment.url && (
                                        <a href={msg.attachment.url} download={msg.attachment.name} className="p-2 hover:bg-terminal-green hover:text-black transition-colors border-l border-terminal-greenDim/30">
                                            <Download className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            )}

                            <div className={`whitespace-pre-wrap inline-block ${isMe ? 'text-gray-300' : 'text-terminal-greenDim'}`}>
                                {renderMessageContent(msg.content)}
                            </div>
                        </div>
                    </div>
                    {isMe && msg.status === 'sending' && <span className="text-gray-700 ml-12 text-xs italic">...transmitting</span>}
                    {isMe && msg.status === 'failed' && <span className="text-terminal-alert ml-12 text-xs font-bold">ERROR</span>}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Line */}
            <div className="p-4 bg-black border-t border-terminal-border">
              {selectedFile && (
                  <div className="mb-2 flex items-center gap-2 bg-terminal-dim p-2 border border-terminal-greenDim/30 max-w-fit">
                      <Paperclip className="w-3 h-3 text-terminal-green" />
                      <span className="text-xs text-white">{selectedFile.name}</span>
                      <span className="text-[10px] text-gray-500">({formatBytes(selectedFile.size)})</span>
                      <button onClick={() => setSelectedFile(null)} className="ml-2 hover:text-terminal-alert"><X className="w-3 h-3" /></button>
                  </div>
              )}
              <div className="flex gap-2 items-end relative">
                <span className="pb-3 text-terminal-green font-bold whitespace-nowrap hidden md:inline">
                  {identity.username}@shadow:~$
                </span>
                
                {/* File Input */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                        }
                    }}
                />
                <Button 
                    variant="ghost" 
                    className="!px-2" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach File (Max 5GB for P2P)"
                >
                    <Paperclip className="w-4 h-4" />
                </Button>

                <Input
                  className="!bg-black !border-transparent !px-0 !pl-0 focus:!ring-0 w-full"
                  placeholder={selectedFile ? "Add a message with your file..." : "Execute command or send message..."}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  autoFocus
                />
                <Button variant="ghost" onClick={sendMessage} disabled={!messageInput.trim() && !selectedFile}>
                   <span className="sr-only">SEND</span>
                   ENTER
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-terminal-greenDim font-mono">
             <div className="w-24 h-24 border border-terminal-greenDim flex items-center justify-center mb-6 relative">
               <div className="absolute inset-0 border border-terminal-green animate-ping opacity-20"></div>
               <Terminal className="w-10 h-10" />
             </div>
             <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-2">System Idle</h2>
             <p className="text-sm opacity-60">Awaiting target selection...</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal isOpen={showAddContact} onClose={() => setShowAddContact(false)} title="UPLINK_PROTOCOL">
         <div className="space-y-4">
           <p className="text-xs text-terminal-greenDim mb-4">
             > INITIATING HANDSHAKE.<br/>
             > ENTER TARGET DAILY KEY.
           </p>
           <Input 
             label="ACCESS CODE"
             placeholder="XXXXXX" 
             value={addCodeInput}
             onChange={e => setAddCodeInput(e.target.value.toUpperCase())}
             maxLength={6}
             className="text-center text-xl tracking-[0.5em]"
           />
           <Button className="w-full mt-4" onClick={handleAddContact} isLoading={isResolving}>
             ESTABLISH CONNECTION
           </Button>
         </div>
      </Modal>

      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="USER_CONFIGURATION">
        <div className="flex flex-col space-y-6">
           <div className="flex items-start gap-4 border-b border-terminal-border pb-6">
             <div className="w-16 h-16 border border-terminal-green flex items-center justify-center bg-terminal-green/10">
                <User className="w-8 h-8 text-terminal-green" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white uppercase">{identity.username}</h2>
               <p className="text-[10px] text-gray-500 font-mono mt-1 break-all">
                 PUB_KEY: {identity.publicKey}
               </p>
             </div>
           </div>

           <div className="border border-terminal-green p-4 relative bg-black">
             <div className="absolute -top-3 left-3 bg-black px-2 text-xs text-terminal-green font-bold">
               [ DAILY_LINK_CODE ]
             </div>
             <div className="text-4xl font-mono font-bold text-center text-white tracking-[0.2em] py-2 glitch-text">
               {linkingCode || "......"}
             </div>
             <div className="text-center text-[10px] text-terminal-alert mt-2">
               TTL: {24 - new Date().getHours()}H (AUTO_ROTATE)
             </div>
           </div>
           
           <Button variant="danger" className="w-full" onClick={() => window.location.reload()}>
              <LogOut className="w-4 h-4" /> TERMINATE_SESSION
           </Button>
        </div>
      </Modal>
    </div>
  );
}