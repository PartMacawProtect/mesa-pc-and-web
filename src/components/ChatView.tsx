import React, { useState, useRef, useEffect } from "react";
import { Language, Message, Contact } from "../types";
import { translations } from "../locales";
import { generateKeyPair, encryptMessage, decryptMessage } from "../utils/crypto";
import { getApiUrl } from "../utils/api";
import { 
  MessageSquare, 
  Users, 
  Settings as SettingsIcon, 
  Info, 
  Plus, 
  LogOut, 
  Send, 
  Smile, 
  Search, 
  X,
  Check,
  MoreVertical,
  Pin,
  Trash2,
  Edit3,
  Lock,
  ArrowLeft,
  Monitor,
  Download
} from "lucide-react";

const playNotificationChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = "sine";
    // Soft, peaceful dual tone
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (err) {
    console.warn("Failed to play notification chime via Web Audio API:", err);
  }
};

const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI;

interface ToggleProps {
  active: boolean;
  onChange: (val: boolean) => void;
}

const Toggle = ({ active, onChange }: ToggleProps) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        active ? "bg-[#15196c]" : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};

const renderAvatar = (name: string, avatarUrl?: string, sizeClass: string = "w-12 h-12 text-sm") => {
  const isCustomAvatar = avatarUrl && avatarUrl.startsWith("data:");
  if (isCustomAvatar) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border border-[#E2E8F0] dark:border-slate-800`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Generate initials
  const trimmed = (name || "?").trim();
  const parts = trimmed.split(/\s+/);
  let initials = "";
  if (parts.length > 0) {
    if (parts.length === 1) {
      initials = parts[0].substring(0, Math.min(2, parts[0].length));
    } else {
      initials = (parts[0][0] || "") + (parts[1] && parts[1][0] ? parts[1][0] : "");
    }
  }
  initials = initials.toUpperCase();

  return (
    <div className={`${sizeClass} rounded-full bg-indigo-50 dark:bg-slate-800 text-[#15196c] dark:text-slate-350 flex items-center justify-center font-bold tracking-tight select-none shrink-0 uppercase border border-slate-300 dark:border-slate-700`}>
      {initials || "?"}
    </div>
  );
};

const formatTimeByLang = (dateStrOrDate: string | Date, lang: Language): string => {
  if (typeof dateStrOrDate === "string") {
    const match = dateStrOrDate.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = match[3];
      
      if (lang === "RU") {
        if (ampm) {
          if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
          if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
        }
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      } else {
        if (!ampm) {
          const suffix = hours >= 12 ? " PM" : " AM";
          const displayHours = hours % 12 === 0 ? 12 : hours % 12;
          return `${displayHours}:${minutes}${suffix}`;
        }
        return `${hours}:${minutes} ${ampm.toUpperCase()}`;
      }
    }
    return dateStrOrDate;
  }
  
  const hours = dateStrOrDate.getHours();
  const minutes = String(dateStrOrDate.getMinutes()).padStart(2, '0');
  if (lang === "RU") {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  } else {
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }
};

const COMMON_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "👅", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️",
  "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓",
  "🤗", "🤔", "🫣", "🤭", "🤫", "🤥", "😶", "😶‍🌫️", "😐", "😑", "😬", "🫨", "🫠", "🫥", "✍️", "🖐️", "✋", "🖖", "👋", "🤙",
  "💪", "🙏", "🤝", "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "🤟", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
  "🔥", "✨", "🌟", "⭐", "💫", "💥", "💨", "💦", "💧", "⚡", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "❄️",
  "🌸", "🌹", "🌺", "🌻", "🌼", "🌷", "🌱", "🌿", "🍀", "🍁", "🍂", "🍃", "🍄", "🐚", "🪨", "🌾", "☕", "🍎", "🍕", "🎉"
];

interface ChatViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  userEmail: string;
  userName: string;
  onLogout: () => void;
  setUserName: (name: string) => void;
}

export default function ChatView({ 
  language, 
  onLanguageChange, 
  userEmail, 
  userName, 
  onLogout,
  setUserName 
}: ChatViewProps) {
  const t = translations[language];

  // Tab State: "chats" | "contacts" | "settings"
  const [currentTab, setCurrentTab] = useState<"chats" | "contacts" | "settings">("chats");

  // Local settings options states
  const [hideBadges, setHideBadges] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(userName || "Алекс");

  // New settings states based on mockup
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem("mesa_settings_notifications");
    return saved !== null ? saved === "true" : true;
  });
  const [privacyEnabled, setPrivacyEnabled] = useState(() => {
    const saved = localStorage.getItem("mesa_settings_privacy");
    return saved !== null ? saved === "true" : true;
  });
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const isFirstSyncRef = useRef(true);
  const messagesMapRef = useRef<Record<string, Message[]>>({});
  const [statusMessage, setStatusMessage] = useState(
    language === "EN" ? "Focused" : "В фокусе"
  );

  // Real User Bio state
  const [userBio, setUserBio] = useState(() => 
    localStorage.getItem(`mesa_user_bio_${userEmail.toLowerCase().trim()}`) || 
    (language === "EN" ? "In search of absolute calm." : "В поиске абсолютного спокойствия.")
  );

  // Real Avatar state
  const [userAvatar, setUserAvatar] = useState(() =>
    localStorage.getItem(`mesa_user_avatar_${userEmail.toLowerCase().trim()}`) || ""
  );

  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [userKeyPair, setUserKeyPair] = useState<{ publicKey: JsonWebKey; privateKey: JsonWebKey } | null>(null);

  const userNameRef = useRef(userName);
  const userAvatarRef = useRef(userAvatar);
  const userBioRef = useRef(userBio);
  const statusMessageRef = useRef(statusMessage);
  const userKeyPairRef = useRef(userKeyPair);

  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { userAvatarRef.current = userAvatar; }, [userAvatar]);
  useEffect(() => { userBioRef.current = userBio; }, [userBio]);
  useEffect(() => { statusMessageRef.current = statusMessage; }, [statusMessage]);
  useEffect(() => { userKeyPairRef.current = userKeyPair; }, [userKeyPair]);

  const isSyncingProfileRef = useRef(false);
  const syncMetadataRef = useRef<() => Promise<void>>();

  useEffect(() => {
    if (!userEmail) return;

    const fetchInitialProfileAndKeys = async () => {
      let loadedKeys: { publicKey: JsonWebKey; privateKey: JsonWebKey } | null = null;
      try {
        const res = await fetch(getApiUrl(`/api/users/profile?email=${encodeURIComponent(userEmail)}`));
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const u = data.user;
            if (u.username !== undefined) {
              setUserName(u.username);
              setProfileNameInput(u.username);
            }
            if (u.avatar !== undefined) {
              setUserAvatar(u.avatar);
              localStorage.setItem(`mesa_user_avatar_${userEmail.toLowerCase().trim()}`, u.avatar);
            }
            if (u.bio !== undefined) {
              setUserBio(u.bio);
              localStorage.setItem(`mesa_user_bio_${userEmail.toLowerCase().trim()}`, u.bio);
            }
            if (u.statusMessage !== undefined) {
              setStatusMessage(u.statusMessage);
            }

            // If keypair exists on server, restore them
            if (u.publicKey && u.privateKey) {
              try {
                loadedKeys = { publicKey: JSON.parse(u.publicKey), privateKey: JSON.parse(u.privateKey) };
              } catch (errKey) {
                console.error("Error parsing keys retrieved from server", errKey);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial profile from server:", err);
      }

      const storageKey = `mesa_e2e_keys_${userEmail.toLowerCase().trim()}`;

      if (loadedKeys) {
        setUserKeyPair(loadedKeys);
        localStorage.setItem(storageKey, JSON.stringify(loadedKeys));
      } else {
        // No keys on the server yet, let's seek local storage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsedObj = JSON.parse(saved);
            setUserKeyPair(parsedObj);
            // Upload to server immediately so other client can sync
            fetch(getApiUrl("/api/users/pulse"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: userEmail,
                publicKey: JSON.stringify(parsedObj.publicKey),
                privateKey: JSON.stringify(parsedObj.privateKey)
              })
            }).catch(e => console.error("Error uploading existing key pair:", e));
          } catch (e) {
            console.error("Failed to parse local keys", e);
          }
        } else {
          // Generate brand-new E2EE RSA keys
          try {
            const keys = await generateKeyPair();
            const keyObj = { publicKey: keys.publicKeyJwk, privateKey: keys.privateKeyJwk };
            localStorage.setItem(storageKey, JSON.stringify(keyObj));
            setUserKeyPair(keyObj);
            // Upload to server immediately so other client can sync
            fetch(getApiUrl("/api/users/pulse"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: userEmail,
                publicKey: JSON.stringify(keyObj.publicKey),
                privateKey: JSON.stringify(keyObj.privateKey)
              })
            }).catch(e => console.error("Error uploading new key pair:", e));
          } catch (err) {
            console.error("Error generating key pair", err);
          }
        }
      }

      setIsProfileLoaded(true);
    };

    fetchInitialProfileAndKeys();
  }, [userEmail]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageAttachmentInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Context menus & interaction states
  const [activeChatOptionContactId, setActiveChatOptionContactId] = useState<string | null>(null);
  const [chatOptionPosition, setChatOptionPosition] = useState<{ x: number; y: number } | null>(null);

  const [contextedMessage, setContextedMessage] = useState<Message | null>(null);
  const [messageContextMenuPos, setMessageContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const [renameContactId, setRenameContactId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState("");

  const [deleteChatContactId, setDeleteChatContactId] = useState<string | null>(null);
  const [deleteChatForEveryone, setDeleteChatForEveryone] = useState(false);

  const [deleteMessageObj, setDeleteMessageObj] = useState<Message | null>(null);
  const [deleteMsgForEveryone, setDeleteMsgForEveryone] = useState(false);

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Synchronize dynamic message seen counts for unread badge metrics
  const [lastSeenCount, setLastSeenCount] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("mesa_last_seen_count");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync Dark Theme class with system or user preference
  useEffect(() => {
    const isDarkSaved = localStorage.getItem("mesa_dark_mode") === "true";
    setDarkModeEnabled(isDarkSaved);
    document.documentElement.classList.toggle("dark", isDarkSaved);

    const handleGlobalClick = () => {
      setActiveChatOptionContactId(null);
      setChatOptionPosition(null);
      setContextedMessage(null);
      setMessageContextMenuPos(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  const handleToggleDarkMode = (val: boolean) => {
    setDarkModeEnabled(val);
    document.documentElement.classList.toggle("dark", val);
    localStorage.setItem("mesa_dark_mode", String(val));
    showChatToast(val 
      ? (language === "EN" ? "Dark theme enabled!" : "Темная тема включена!") 
      : (language === "EN" ? "Light theme enabled!" : "Светлая тема включена!")
    );
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const syncProfileToServer = async (fields: Partial<{ username: string; avatar: string; bio: string; statusMessage: string }>) => {
    if (!userEmail) return;
    isSyncingProfileRef.current = true;
    try {
      await fetch(getApiUrl("/api/users/pulse"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          isUpdate: true,
          ...fields
        })
      });
      // Settle duration of 3 seconds before allowing incoming sync heartbeat to overwrite client settings
      setTimeout(() => {
        isSyncingProfileRef.current = false;
        syncMetadataRef.current?.();
      }, 3000);
    } catch (err) {
      console.error("Failed to sync profile update to server:", err);
      isSyncingProfileRef.current = false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        showChatToast(language === "EN" ? "File size exceeds 100 MB limit!" : "Размер файла превышает лимит 100 МБ!");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setUserAvatar(reader.result);
          localStorage.setItem(`mesa_user_avatar_${userEmail.toLowerCase().trim()}`, reader.result);
          syncProfileToServer({ avatar: reader.result });
          showChatToast(language === "EN" ? "Avatar successfully updated!" : "Аватар успешно обновлен!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        showChatToast(language === "EN" ? "File size exceeds 100 MB limit!" : "Размер файла превышает лимит 100 МБ!");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedImage(reader.result);
          setIsEmojiPickerOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Update profile input if name changes
  useEffect(() => {
    if (userName) {
      setProfileNameInput(userName);
    }
  }, [userName]);

  // Toast status inside ChatView
  const [chatToast, setChatToast] = useState("");
  const showChatToast = (msg: string) => {
    setChatToast(msg);
    setTimeout(() => {
      setChatToast("");
    }, 3000);
  };

  // Contacts loaded dynamically and updated via sync endpoint
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Dynamic Contact Bios Map updated via sync
  const [contactBios, setContactBios] = useState<Record<string, { email: string; phone: string; bio: string }>>({});

  // Current Active Contact in chats view
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

  // Selected Contact for details screen on Contacts tab
  const [selectedContactDetailedId, setSelectedContactDetailedId] = useState<string | null>(null);

  // In-messenger messages map per contact id
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});

  // Flag to auto-select contact only once on desktop view
  const hasAutoSelectedRef = useRef(false);

  // Real-time synchronization of contacts and messages from backend
  useEffect(() => {
    if (!userEmail || !isProfileLoaded) return;

    let isMounted = true;

    const syncMetadata = async () => {
      try {
        // 0. Heartbeat pulse to report online status and pull profile details from server
        const currentKeyPair = userKeyPairRef.current;
        const pulseRes = await fetch(getApiUrl("/api/users/pulse"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            publicKey: currentKeyPair ? JSON.stringify(currentKeyPair.publicKey) : undefined
          })
        }).catch(err => {
          console.error("Pulse heartbeat error:", err);
          return null;
        });

        if (pulseRes && pulseRes.ok) {
          const pulseData = await pulseRes.json();
          if (pulseData && pulseData.success && pulseData.user && isMounted) {
            const serverUser = pulseData.user;
            const activeElId = typeof document !== "undefined" ? document.activeElement?.id : "";

            if (!isSyncingProfileRef.current) {
              if (serverUser.username && serverUser.username !== userNameRef.current) {
                if (activeElId !== "settings-display-name-input") {
                  setUserName(serverUser.username);
                  setProfileNameInput(serverUser.username);
                }
              }
              if (serverUser.avatar !== undefined && serverUser.avatar !== userAvatarRef.current) {
                setUserAvatar(serverUser.avatar);
                localStorage.setItem(`mesa_user_avatar_${userEmail.toLowerCase().trim()}`, serverUser.avatar);
              }
              if (serverUser.bio !== undefined && serverUser.bio !== userBioRef.current) {
                if (activeElId !== "settings-bio-textarea") {
                  setUserBio(serverUser.bio);
                  localStorage.setItem(`mesa_user_bio_${userEmail.toLowerCase().trim()}`, serverUser.bio);
                }
              }
              if (serverUser.statusMessage && serverUser.statusMessage !== statusMessageRef.current) {
                setStatusMessage(serverUser.statusMessage);
              }
            }
          }
        }

        // 1. Fetch contacts
        const contactsRes = await fetch(getApiUrl(`/api/users/contacts?email=${encodeURIComponent(userEmail)}`));
        if (!contactsRes.ok) return;
        const contactsData = await contactsRes.json();
        
        if (contactsData.success && isMounted) {
          const fetchedContacts: Contact[] = contactsData.contacts;
          setContacts(fetchedContacts);

          // Auto-select first contact if activeContactId is null but we have contacts (only on desktop and only initially)
          if (fetchedContacts.length > 0 && !hasAutoSelectedRef.current) {
            const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
            if (isDesktop) {
              setActiveContactId(fetchedContacts[0].id);
              setSelectedContactDetailedId(fetchedContacts[0].id);
            }
            hasAutoSelectedRef.current = true;
          }

          // Build/update bios for contact detailed cards gracefully using dynamic server bio
          const updatedBios: Record<string, { email: string; phone: string; bio: string }> = {};
          fetchedContacts.forEach(c => {
            const bioEmail = c.email || c.id;
            updatedBios[c.id] = {
              email: bioEmail,
              phone: "—",
              bio: c.bio || (bioEmail === "elena@mesa.com"
                ? (language === "EN" ? "Your personal serene AI helper in Mesa." : "Ваш персональный ИИ помощник спокойствия.")
                : (language === "EN" ? "A serene registered user on Mesa." : "Участник мессенджера цифроového умиротворения Mesa."))
            };
          });
          setContactBios(updatedBios);
        }

        // 2. Fetch messages and map them
        if (currentKeyPair) {
          const messagesRes = await fetch(getApiUrl(`/api/messages/sync?email=${encodeURIComponent(userEmail)}`));
          if (!messagesRes.ok) return;
          const messagesData = await messagesRes.json();

          if (messagesData.success && isMounted) {
            const serverMsgs = messagesData.messages;

            // Background notification triggers for new incoming messages!
            const isFirstSync = isFirstSyncRef.current;
            if (isFirstSync) {
              isFirstSyncRef.current = false;
            }

            if (!isFirstSync && notificationsEnabled) {
              let hasNewIncoming = false;
              let latestNewMsg: any = null;
              
              serverMsgs.forEach((sm: any) => {
                const isIncoming = sm.sender.toLowerCase() !== userEmail.toLowerCase();
                if (isIncoming) {
                  const isAlreadyListed = (Object.values(messagesMapRef.current || {}) as Message[][]).some(list => 
                    list.some(m => String(m.id) === String(sm.id))
                  );
                  if (!isAlreadyListed) {
                    hasNewIncoming = true;
                    latestNewMsg = sm;
                  }
                }
              });

              if (hasNewIncoming && latestNewMsg) {
                playNotificationChime();
                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                  try {
                    const senderName = latestNewMsg.sender.split("@")[0];
                    new Notification(senderName, {
                      body: latestNewMsg.text || "📷 Изображение"
                    });
                  } catch (e) {
                    console.error("Failed to show browser notification:", e);
                  }
                }
              }
            }

            const decryptedMsgs = await Promise.all(
              serverMsgs.map(async (m: any) => {
                if (m.isEncrypted && currentKeyPair) {
                  try {
                    const isMe = m.sender.toLowerCase() === userEmail.toLowerCase();
                    const encKey = isMe ? m.encryptedKeyForSender : m.encryptedKeyForRecipient;
                    if (encKey && m.iv) {
                      const fallbackPassphrase = [m.sender.toLowerCase().trim(), m.recipient.toLowerCase().trim()].sort().join(":");
                      const decryptedText = await decryptMessage(
                        m.text, 
                        m.iv, 
                        encKey, 
                        currentKeyPair.privateKey, 
                        fallbackPassphrase, 
                        m.encryptedKeyForFallback
                      );
                      return { ...m, text: decryptedText };
                    }
                  } catch (e) {
                    console.error("Failed to decrypt message ID:", m.id, e);
                    return { ...m, text: language === "EN" ? "🔑 Encrypted (unreadable, key mismatch)" : "🔑 Зашифровано (несовпадение ключей)" };
                  }
                }
                return m;
              })
            );

            const mapped: Record<string, Message[]> = {};

            decryptedMsgs.forEach((m: any) => {
              const isMe = m.sender.toLowerCase() === userEmail.toLowerCase();
              const threadKey = isMe ? m.recipient.toLowerCase() : m.sender.toLowerCase();

              if (!mapped[threadKey]) {
                mapped[threadKey] = [];
              }
              mapped[threadKey].push({
                id: m.id,
                sender: isMe ? "user" : threadKey,
                text: m.text,
                time: m.time,
                isPinned: m.isPinned,
                isEncrypted: m.isEncrypted,
                imageUrl: m.imageUrl
              });
            });

            // Seed/initialize lastSeenCount so old messages aren't marked as unread
            setLastSeenCount(prev => {
              let changed = false;
              const updated = { ...prev };
              Object.keys(mapped).forEach(contactId => {
                if (updated[contactId] === undefined) {
                  updated[contactId] = mapped[contactId].length;
                  changed = true;
                }
              });
              if (changed) {
                localStorage.setItem("mesa_last_seen_count", JSON.stringify(updated));
                return updated;
              }
              return prev;
            });

            // Preserve any pending optimistic messages that are still not present in the fetched list
            setMessagesMap(prev => {
              const merged: Record<string, Message[]> = { ...mapped };
              
              Object.keys(prev).forEach((contactId) => {
                const prevMsgs = prev[contactId] || [];
                const optimisticMsgs = prevMsgs.filter(m => String(m.id).startsWith("msg-client-") || String(m.id).startsWith("optimistic-"));
                
                if (optimisticMsgs.length > 0) {
                  const currentMsgs = merged[contactId] || [];
                  const unpersisted = optimisticMsgs.filter(opt => {
                    // Match strictly by unique ID to secure bulletproof transition
                    return !currentMsgs.some(curr => String(curr.id) === String(opt.id));
                  });
                  if (unpersisted.length > 0) {
                    merged[contactId] = [...currentMsgs, ...unpersisted];
                  }
                }
              });
              
              return merged;
            });
          }
        }
      } catch (err) {
        console.error("Networking err during sync:", err);
      }
    };

    syncMetadataRef.current = syncMetadata;

    syncMetadata();
    const intervalId = setInterval(syncMetadata, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [userEmail, language, activeContactId, isProfileLoaded]);

  // Keep messagesMapRef in sync
  useEffect(() => {
    messagesMapRef.current = messagesMap;
  }, [messagesMap]);

  // Read message count observer to clear unread badge instantly
  useEffect(() => {
    if (activeContactId) {
      const currentCount = messagesMap[activeContactId]?.length || 0;
      setLastSeenCount(prev => {
        if (prev[activeContactId] !== currentCount) {
          const updated = { ...prev, [activeContactId]: currentCount };
          localStorage.setItem("mesa_last_seen_count", JSON.stringify(updated));
          return updated;
        }
        return prev;
      });

      // API call to mark messages as read adhering to our privacy toggle
      fetch(getApiUrl("/api/messages/read"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail,
          contactEmail: activeContactId,
          privacyEnabled: privacyEnabled
        })
      }).catch(err => console.error("Error marking messages as read:", err));
    }
  }, [activeContactId, messagesMap, userEmail, privacyEnabled]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");

  // Modal Dialog UI to Add dynamic new Custom Contacts
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (currentTab === "chats") {
      scrollToBottom();
    }
  }, [messagesMap, isTyping, currentTab, activeContactId]);

  // Current active messages thread list
  const activeMessages = activeContactId ? (messagesMap[activeContactId] || []) : [];
  const pinnedMessages = activeMessages.filter(m => m.isPinned);

  // Context actions execution methods
  const handlePinMessage = async (msg: Message) => {
    try {
      const response = await fetch(getApiUrl("/api/messages/pin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: msg.id,
          isPinned: !msg.isPinned
        })
      });
      const data = await response.json();
      if (data.success) {
        showChatToast(
          language === "EN" 
            ? (!msg.isPinned ? "Message pinned successfully!" : "Message unpinned successfully!")
            : (!msg.isPinned ? "Сообщение успешно закреплено!" : "Сообщение успешно откреплено!")
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (msg: Message, forEveryone: boolean) => {
    try {
      const response = await fetch(getApiUrl("/api/messages/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: msg.id,
          userEmail: userEmail,
          deleteForEveryone: forEveryone
        })
      });
      const data = await response.json();
      if (data.success) {
        showChatToast(
          language === "EN" 
            ? "Message deleted successfully." 
            : "Сообщение успешно удалено."
        );
        // Instantly force local thread update
        setMessagesMap(prev => {
          const thread = prev[activeContactId!] || [];
          return {
            ...prev,
            [activeContactId!]: thread.filter(m => m.id !== msg.id)
          };
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteMessageObj(null);
    }
  };

  const handleRenameChat = async (contactId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const response = await fetch(getApiUrl("/api/users/contacts/rename"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail,
          contactEmail: contactId,
          newName: newName.trim()
        })
      });
      const data = await response.json();
      if (data.success) {
        showChatToast(
          language === "EN" ? "Chat renamed successfully!" : "Чат успешно переименован!"
        );
        
        // Update contact name locally
        setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
            return { ...c, name: newName.trim() };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRenameContactId(null);
      setRenameInputValue("");
    }
  };

  const handleDeleteChat = async (contactId: string, forEveryone: boolean) => {
    try {
      const response = await fetch(getApiUrl("/api/chats/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail,
          contactEmail: contactId,
          deleteForEveryone: forEveryone
        })
      });
      const data = await response.json();
      if (data.success) {
        showChatToast(
          language === "EN" ? "Chat deleted successfully." : "Чат успешно удален."
        );
        
        setContacts(prev => prev.filter(c => c.id !== contactId));
        setMessagesMap(prev => {
          const updated = { ...prev };
          delete updated[contactId];
          return updated;
        });
        
        if (activeContactId === contactId) {
          setActiveContactId(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteChatContactId(null);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(getApiUrl("/api/users/delete-account"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await response.json();
      if (data.success) {
        const keySuffix = userEmail.toLowerCase().trim();
        localStorage.removeItem(`mesa_user_avatar_${keySuffix}`);
        localStorage.removeItem(`mesa_user_bio_${keySuffix}`);
        localStorage.removeItem(`mesa_e2e_keys_${keySuffix}`);
        onLogout();
        setTimeout(() => {
          window.location.reload();
        }, 120);
      } else {
        alert(data.error || (language === "EN" ? "Failed to delete account." : "Не удалось удалить аккаунт."));
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
    } finally {
      setShowDeleteAccountModal(false);
    }
  };

  // Submit new message to respective contact
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || !activeContactId || !userEmail) return;

    const messageText = inputText.trim();
    const sentImage = selectedImage;

    setInputText("");
    setSelectedImage(null);
    setIsEmojiPickerOpen(false);

    const currentContactObj = contacts.find(c => c.id === activeContactId);
    const hasRecipientPublicKey = !!(currentContactObj && currentContactObj.publicKey);

    const clientMsgId = `msg-client-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    // Optimistically push the message to local state map so UI acts with zero delay!
    const localUserMsg: Message = {
      id: clientMsgId,
      sender: "user",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isEncrypted: hasRecipientPublicKey && !!userKeyPair,
      imageUrl: sentImage || undefined
    };

    setMessagesMap(prev => {
      const existing = prev[activeContactId] || [];
      return {
        ...prev,
        [activeContactId]: [...existing, localUserMsg]
      };
    });

    // If it's the AI assistant, turn on typing indicator while waiting
    if (activeContactId === "elena@mesa.com" || activeContactId.endsWith("@ai")) {
      setIsTyping(true);
    }

    try {
      let requestPayload: any = {
        id: clientMsgId,
        sender: userEmail,
        recipient: activeContactId,
        text: messageText,
        imageUrl: sentImage || undefined
      };

      if (hasRecipientPublicKey && userKeyPair && currentContactObj?.publicKey) {
        try {
          const recipientPubKeyJwk = JSON.parse(currentContactObj.publicKey);
          const fallbackPassphrase = [userEmail.toLowerCase().trim(), activeContactId.toLowerCase().trim()].sort().join(":");
          const encrypted = await encryptMessage(messageText, recipientPubKeyJwk, userKeyPair.publicKey, fallbackPassphrase);
          requestPayload = {
            id: clientMsgId,
            sender: userEmail,
            recipient: activeContactId,
            text: encrypted.ciphertext,
            isEncrypted: true,
            encryptedKeyForRecipient: encrypted.encryptedKeyForRecipient,
            encryptedKeyForSender: encrypted.encryptedKeyForSender,
            encryptedKeyForFallback: encrypted.encryptedKeyForFallback,
            iv: encrypted.iv,
            imageUrl: sentImage || undefined
          };
        } catch (encErr) {
          console.error("Encryption failed, sending as cleartext fallback:", encErr);
        }
      }

      const response = await fetch(getApiUrl("/api/messages/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error("Failed to persist message on server");
      } else {
        // Fetch new state immediately to align optimistic and server states beautifully without delay!
        syncMetadataRef.current?.();
      }

      // Hide typing indicator after a brief simulated offset
      if (activeContactId === "elena@mesa.com" || activeContactId.endsWith("@ai")) {
        setTimeout(() => setIsTyping(false), 1200);
      }
    } catch (err) {
      console.error("Networking error sending message:", err);
      setIsTyping(false);
    }
  };

  // Create customized contact
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactEmail.trim() || !userEmail) return;

    const targetEmail = newContactEmail.trim().toLowerCase();

    try {
      const response = await fetch(getApiUrl("/api/users/contacts/add"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userEmail,
          contactEmail: targetEmail
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showChatToast(data.error || (language === "EN" ? "User is not registered." : "Пользователь с таким email не зарегистрирован."));
        return;
      }

      const freshContact: Contact = data.contact;

      setContacts(prev => {
        if (prev.find(c => c.id === freshContact.id)) return prev;
        return [...prev, freshContact];
      });

      showChatToast(language === "EN" ? "Contact added successfully!" : "Контакт успешно добавлен!");
      setNewContactEmail("");
      setIsAddContactOpen(false);
      setSelectedContactDetailedId(freshContact.id);
      setActiveContactId(freshContact.id);
      setCurrentTab("chats");
    } catch (err) {
      console.error("Error adding contact via API:", err);
      showChatToast(language === "EN" ? "Server connection issue." : "Ошибка соединения с сервером.");
    }
  };

  // Find active chat target contact attributes safely
  const currentChatContact = activeContactId ? contacts.find(c => c.id === activeContactId) : undefined;

  // Selected contact for detail pane safely
  const detailedContact = selectedContactDetailedId ? contacts.find(c => c.id === selectedContactDetailedId) : undefined;
  const detailedBio = detailedContact ? (contactBios[detailedContact.id] || {
    email: `${detailedContact.id}@mesa.com`,
    phone: "—",
    bio: "—"
  }) : null;

  // Filter contacts by search query
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  return (
    <div className={`flex ${isElectron ? "h-[calc(100vh-40px)]" : "h-screen"} w-screen bg-background text-on-background overflow-hidden font-sans`}>
      
      {/* 1. TOAST NOTIFIER FOR INTERNAL DIALOG ACTIONS */}
      {chatToast && (
        <div className="fixed top-6 right-6 md:right-8 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs px-5 py-3.5 rounded-2xl shadow-2xl z-[9999] border border-slate-700/20 dark:border-white/20">
          {chatToast}
        </div>
      )}

      {/* 2. SIDEBAR UTILITY NAVIGATION DRAWER */}
      <aside className={`w-full h-16 md:w-28 md:h-full bg-surface-container border-t md:border-t-0 md:border-r border-[#E2E8F0] dark:border-slate-800/80 flex flex-row md:flex-col items-center py-0 px-6 md:px-0 md:py-8 justify-between shrink-0 select-none fixed md:relative bottom-0 left-0 right-0 z-50 ${(currentTab === "chats" && activeContactId) || (currentTab === "contacts" && selectedContactDetailedId) ? "hidden md:flex" : "flex"}`}>
        
        {/* Mesa Logo Brand */}
        <div className="hidden md:flex md:flex-col md:items-center md:w-full">
          <div className="text-primary dark:text-indigo-400 font-extrabold text-2xl tracking-wider mb-10 select-none">
            Mesa
          </div>
        </div>

        {/* Navigation Items (Chats, Contacts, Settings) */}
        <nav className="flex flex-row md:flex-col gap-1 md:gap-5 justify-around md:justify-start items-center w-full h-full md:h-auto">
          
          {/* Chats Icon Box */}
          <button 
            type="button"
            onClick={() => {
              setCurrentTab("chats");
            }}
            className={`relative flex-1 md:w-full py-2.5 md:py-4 flex flex-col items-center justify-center gap-1 cursor-pointer group bg-transparent border-none transition-all ${
              currentTab === "chats" 
                ? "text-primary dark:text-indigo-400 font-semibold" 
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {currentTab === "chats" && (
              <div className="absolute md:left-0 md:top-0 md:bottom-0 md:w-1 md:h-full top-0 left-4 right-4 h-1 bg-primary dark:bg-indigo-400 rounded-b-md md:rounded-r-lg md:rounded-b-none"></div>
            )}
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-105 duration-200" />
            <span className="text-[10px] md:text-[11px] tracking-wide mt-0.5">
              {language === "EN" ? "Chats" : "Чаты"}
            </span>
          </button>

          {/* Contacts Icon Box */}
          <button 
            type="button"
            onClick={() => setCurrentTab("contacts")}
            className={`relative flex-1 md:w-full py-2.5 md:py-4 flex flex-col items-center justify-center gap-1 cursor-pointer group bg-transparent border-none transition-all ${
              currentTab === "contacts" 
                ? "text-primary dark:text-indigo-400 font-semibold" 
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {currentTab === "contacts" && (
              <div className="absolute md:left-0 md:top-0 md:bottom-0 md:w-1 md:h-full top-0 left-4 right-4 h-1 bg-primary dark:bg-indigo-400 rounded-b-md md:rounded-r-lg md:rounded-b-none"></div>
            )}
            <Users className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-105 duration-200" />
            <span className="text-[10px] md:text-[11px] tracking-wide mt-0.5">
              {language === "EN" ? "Contacts" : "Контакты"}
            </span>
          </button>

          {/* Settings Icon Box */}
          <button 
            type="button"
            onClick={() => setCurrentTab("settings")}
            className={`relative flex-1 md:w-full py-2.5 md:py-4 flex flex-col items-center justify-center gap-1 cursor-pointer group bg-transparent border-none transition-all ${
              currentTab === "settings" 
                ? "text-primary dark:text-indigo-400 font-semibold" 
                : "text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-indigo-400"
            }`}
          >
            {currentTab === "settings" && (
              <div className="absolute md:left-0 md:top-0 md:bottom-0 md:w-1 md:h-full top-0 left-4 right-4 h-1 bg-primary dark:bg-indigo-400 rounded-b-md md:rounded-r-lg md:rounded-b-none"></div>
            )}
            <SettingsIcon className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-105 duration-200" />
            <span className="text-[10px] md:text-[11px] tracking-wide mt-0.5">
              {language === "EN" ? "Settings" : "Настройки"}
            </span>
          </button>

        </nav>

        {/* Quiet Version Label */}
        <div className="hidden md:block text-[10px] text-slate-300 dark:text-slate-500 font-medium tracking-wider">
          v1.0
        </div>
      </aside>

      {/* 3. MULTI-TABS RENDER ENGINE */}

      {/* ======================= CHATS TAB ======================= */}
      {currentTab === "chats" && (
        <>
          {/* Chats left panel */}
          <section className={`w-full md:w-[320px] lg:w-[350px] border-r border-[#E2E8F0] dark:border-slate-800/80 bg-surface-container-lowest flex flex-col h-full shrink-0 animate-fade-in select-none ${activeContactId ? "hidden md:flex" : "flex"}`}>
            <div className="p-6 pb-4 flex flex-col gap-4">
              {/* Mobile Branding Bar */}
              <div className="md:hidden flex items-center gap-1.5 mb-1 bg-surface-container-low px-3 py-2 rounded-2xl w-fit">
                <span className="text-base font-black tracking-wider text-primary dark:text-indigo-400">Mesa</span>
                <span className="text-[9px] bg-primary-fixed text-[#15196c] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">v1.0</span>
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold tracking-tight text-on-surface font-sans">
                  {t.activeChats}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(true)}
                  className="p-1.5 bg-primary text-white hover:opacity-95 rounded-xl transition-all shadow-md cursor-pointer border-none flex items-center justify-center animate-pulse"
                  title={language === "EN" ? "Add Contact" : "Добавить контакт"}
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* List of active chat rooms */}
            <div className="flex-grow overflow-y-auto px-1 pb-24 md:pb-4">
              <div className="flex flex-col">
                {contacts.map((c) => {
                  const isActive = activeContactId === c.id;
                  const threadMessages = messagesMap[c.id] || [];
                  const lastMessage = threadMessages[threadMessages.length - 1];
                  const lastText = lastMessage ? lastMessage.text : (language === "EN" ? "No messages yet." : "Сообщений нет.");
                  
                  // Compute dynamic unread counts based on seen count
                  const currentCount = threadMessages.length;
                  const seenCount = lastSeenCount[c.id] ?? 0;
                  const unreadCount = activeContactId === c.id ? 0 : Math.max(0, currentCount - seenCount);
                  
                  return (
                    <div 
                      key={c.id}
                      onClick={() => setActiveContactId(c.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setChatOptionPosition({ x: e.clientX, y: e.clientY });
                        setActiveChatOptionContactId(c.id);
                      }}
                      className={`flex items-center gap-3 py-4 px-6 mx-2 my-1 rounded-2xl cursor-pointer transition-all border-l-4 ${
                        isActive 
                          ? "bg-primary-fixed/30 hover:bg-primary-fixed/35 border-primary" 
                          : "hover:bg-surface-container/30 border-transparent"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(c.name, c.avatar, "w-12 h-12 text-sm")}
                        {c.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-surface-container-lowest rounded-full animate-pulse"></span>
                        )}
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className={`font-bold text-sm truncate block font-sans ${isActive ? "text-primary" : "text-on-surface"}`}>
                            {c.name}
                          </span>
                          <span className="text-[10px] font-sans font-medium text-primary-fixed-variant whitespace-nowrap">
                            {lastMessage ? formatTimeByLang(lastMessage.time, language) : ""}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-on-surface-variant font-medium font-sans block truncate max-w-[140px]">
                            {lastText}
                          </span>
                          {!hideBadges && unreadCount > 0 && (
                            <span className="text-[10px] bg-primary text-white rounded-full px-1.5 min-w-[20px] h-5 flex items-center justify-center font-bold">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Conversation view on the right */}
          <section className={`flex-1 flex flex-col h-full bg-background relative animate-fade-in ${activeContactId ? "flex" : "hidden md:flex"}`}>
            {!currentChatContact ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface">
                <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-indigo-400/5 flex items-center justify-center text-primary dark:text-indigo-400 mb-6 border border-slate-100 dark:border-slate-800">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 tracking-tight mb-2">
                  {language === "EN" ? "Welcome to Mesa Serenity" : "Добро пожаловать в Mesa"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[340px] leading-relaxed mb-6 font-medium">
                  {language === "EN" 
                    ? "Add a contact using the button above or pick a user from your contacts tab to experience stress-free, serene conversations."
                    : "Добавьте новый контакт с помощью кнопки вверху или выберите собеседника для начала спокойного и уединенного диалога."}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddContactOpen(true)}
                  className="px-6 py-3 bg-primary text-white hover:opacity-95 font-bold text-xs rounded-2xl shadow-md cursor-pointer transition-all border-none flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-white" />
                  {language === "EN" ? "Add First Contact" : "Добавить первый контакт"}
                </button>
              </div>
            ) : (
              <>
                <header className="h-[72px] border-b border-outline-variant/20 bg-surface-container-lowest px-4 sm:px-6 flex justify-between items-center shrink-0 z-10 shadow-sm gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActiveContactId(null)}
                      className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 shrink-0 cursor-pointer border-none bg-transparent flex items-center justify-center"
                      title={language === "EN" ? "Back to Chats" : "Назад к чатам"}
                    >
                      <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div className="relative shrink-0">
                      {renderAvatar(currentChatContact.name, currentChatContact.avatar, "w-10 h-10 text-xs")}
                    </div>
                    <div className="min-w-0">
                      <h1 className="font-bold text-sm text-on-surface font-sans truncate" title={currentChatContact.name}>
                        {currentChatContact.name}
                      </h1>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-sans text-on-surface-variant flex items-center gap-1 font-semibold">
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${currentChatContact.isOnline ? "bg-emerald-500" : "bg-outline"}`}></span>
                          {currentChatContact.isOnline 
                            ? t.chatStatusOnline 
                            : (language === "EN" ? "Offline" : "Не в сети")}
                        </span>
                        {currentChatContact.publicKey && userKeyPair && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/5 px-1.5 py-0.5 rounded-md font-sans font-semibold flex items-center gap-0.5" title={language === "EN" ? "End-to-End Encrypted" : "Зашифровано сквозным шифрованием"}>
                            <Lock className="w-2.5 h-2.5" />
                            E2E
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedContactDetailedId(currentChatContact.id);
                        setCurrentTab("contacts");
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                      title={language === "EN" ? "User Information" : "Информация о пользователе"}
                    >
                      <Info className="w-5 h-5 text-slate-500" />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setChatOptionPosition({ x: rect.left - 140, y: rect.bottom + 8 });
                        setActiveChatOptionContactId(currentChatContact.id);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                      title={language === "EN" ? "Chat Options" : "Опции чата"}
                    >
                      <MoreVertical className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                </header>

                {/* Pinned Messages Banner */}
                {pinnedMessages.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900 border-b border-outline-variant/10 px-6 py-2 flex items-center justify-between shrink-0 z-10 text-xs text-slate-600 dark:text-slate-300 shadow-sm animate-scale-in">
                    <div className="flex items-center gap-2 truncate">
                      <Pin className="w-3.5 h-3.5 text-indigo-500 shrink-0 fill-indigo-500 rotate-45" />
                      <span className="font-bold uppercase tracking-wider text-[9px] text-[#15196c] dark:text-indigo-400 shrink-0">
                        {language === "EN" ? "Pinned:" : "Закреплено:"}
                      </span>
                      <span className="truncate font-medium">
                        {pinnedMessages[pinnedMessages.length - 1].text}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePinMessage(pinnedMessages[pinnedMessages.length - 1])}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer flex items-center justify-center transition-all"
                      title={language === "EN" ? "Unpin Message" : "Открепить"}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Messaging scroll pane */}
                <div className="flex-grow overflow-y-auto px-6 py-6 flex flex-col gap-5 bg-background">
                  <div className="text-center my-2 select-none">
                    <span className="text-[11px] font-sans font-bold bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full uppercase tracking-wider">
                      {t.today}
                    </span>
                  </div>

                  {activeMessages.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div
                        key={msg.id}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextedMessage(msg);
                          setMessageContextMenuPos({ x: e.clientX, y: e.clientY });
                        }}
                        className={`flex w-full items-end gap-2.5 cursor-context-menu select-text group ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className="hidden sm:block select-none">
                            {renderAvatar(currentChatContact.name, currentChatContact.avatar, "w-8 h-8 text-[10px]")}
                          </div>
                        )}

                        <div className="flex flex-col max-w-[70%] sm:max-w-[60%] gap-1">
                          <div
                            className={`relative overflow-hidden ${
                              isUser
                                ? "bg-primary text-on-primary rounded-[20px] rounded-br-[4px] shadow-sm selection:bg-white selection:text-primary"
                                : "bg-surface-container-lowest text-on-surface rounded-[20px] rounded-bl-[4px] shadow-[0_2px_8px_rgba(45,50,130,0.02)] selection:bg-primary-fixed selection:text-on-primary-fixed border border-outline-variant/20"
                            } ${msg.imageUrl ? "p-1.5" : "px-5 py-3.5"}`}
                          >
                            {msg.imageUrl && (
                              <div className="rounded-[16px] overflow-hidden max-w-full cursor-zoom-in group/img relative">
                                <img 
                                  src={msg.imageUrl} 
                                  alt="Attachment" 
                                  className="w-full h-auto max-h-[220px] object-cover rounded-[14px] transition-transform duration-300 hover:scale-[1.02] block"
                                  referrerPolicy="no-referrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFullscreenImage(msg.imageUrl || null);
                                  }}
                                />
                              </div>
                            )}
                            {msg.text && (
                              <p className={`whitespace-pre-wrap break-words ${msg.imageUrl ? "px-3 pt-2 pb-1 text-sm col-span-12" : "text-sm md:text-base leading-relaxed"}`}>
                                {msg.text}
                              </p>
                            )}
                          </div>
                          
                          <div className={`flex items-center gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
                            {msg.isEncrypted && (
                              <span className="text-emerald-500 flex items-center shrink-0" title={language === "EN" ? "End-to-End Encrypted" : "Зашифровано сквозным шифрованием"}>
                                <Lock className="w-3 h-3 text-emerald-500" />
                              </span>
                            )}
                            <span className="text-[10px] text-on-surface-variant/70 font-sans tracking-wide px-1.5 font-semibold">
                              {formatTimeByLang(msg.time, language)}
                            </span>
                            {isUser && (
                              <span className="shrink-0 flex items-center">
                                {msg.isRead && !msg.hideReadReceipt ? (
                                  <span className="text-blue-500 dark:text-blue-400 flex" title={language === "EN" ? "Read" : "Прочитано"}>
                                    <Check className="w-3 h-3" />
                                    <Check className="w-3 h-3 -ml-1.5" />
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500" title={language === "EN" ? "Sent" : "Отправлено"}>
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                              </span>
                            )}
                            {msg.isPinned && (
                              <span className="text-indigo-600 dark:text-indigo-400 flex items-center shrink-0" title={language === "EN" ? "Pinned" : "Закреплено"}>
                                <Pin className="w-3 h-3 fill-indigo-600 dark:fill-indigo-400 rotate-45" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex w-full items-end gap-2.5 justify-start animate-pulse">
                      <div className="hidden sm:block select-none">
                        {renderAvatar(currentChatContact.name, currentChatContact.avatar, "w-8 h-8 text-[10px]")}
                      </div>
                      <div className="flex flex-col">
                        <div className="bg-surface-container-lowest text-on-surface px-5 py-3.5 rounded-[20px] rounded-bl-[4px] border border-outline-variant/20 flex items-center gap-1.5 shadow-[0_2px_8px_rgba(45,50,130,0.02)]">
                          <div className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-2 h-2 bg-on-surface-variant/60 rounded-full animate-bounce" style={{ animationDelay: "300ms animate-duration-1000" }}></div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant/50 font-sans px-1 mt-1 font-semibold">
                          {language === "EN" 
                            ? `${currentChatContact.name} is typing...` 
                            : `${currentChatContact.name} печатает...`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/*composer footer */}
                <footer className="p-4 bg-surface-container-lowest border-t border-outline-variant/20 shrink-0 select-none z-10">
                  <input 
                    ref={imageAttachmentInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageAttachmentChange}
                    className="hidden"
                    id="image-file-input"
                  />

                  {/* Selected image preview panel */}
                  {selectedImage && (
                    <div className="max-w-4xl mx-auto mb-3 p-3 bg-slate-50 dark:bg-slate-900 border border-outline-variant/20 rounded-2xl flex items-center justify-between gap-4 animate-scale-in">
                      <div className="flex items-center gap-3">
                        <img 
                          src={selectedImage} 
                          alt="Selected Attachment Preview" 
                          className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left">
                          <span className="block text-xs font-bold text-on-surface">
                            {language === "EN" ? "Image Selected" : "Изображение выбрано"}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/70 font-semibold font-mono">
                            {language === "EN" ? "Ready to send" : "Готово к отправке"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-error-fixed rounded-full transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                        title={language === "EN" ? "Remove Image" : "Удалить изображение"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Local Serene Emoji Picker Popover */}
                  {isEmojiPickerOpen && (
                    <div className="max-w-4xl mx-auto mb-3 p-4 bg-slate-50 dark:bg-slate-900 border border-outline-variant/20 rounded-2xl shadow-xl animate-fade-in relative z-10">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-outline-variant/10">
                        <span className="text-xs font-extrabold text-[#15196c] dark:text-indigo-400 uppercase tracking-wider">
                          {language === "EN" ? "Select Emoji" : "Выберите эмодзи"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEmojiPickerOpen(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-850 cursor-pointer border-none bg-transparent flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-2.5 max-h-[130px] overflow-y-auto pr-1 select-none">
                        {COMMON_EMOJIS.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setInputText(prev => prev + emoji);
                            }}
                            className="text-2xl p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all border-none bg-transparent flex items-center justify-center active:scale-90"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => imageAttachmentInputRef.current?.click()}
                      className="p-3 bg-surface-container-low hover:bg-surface-container text-on-surface-variant rounded-full transition-colors flex items-center justify-center cursor-pointer border-none"
                      title={language === "EN" ? "Attach Image" : "Прикрепить изображение"}
                      id="attach-image-btn"
                    >
                      <Plus className="w-5 h-5 text-slate-500" />
                    </button>

                    <div className="flex-grow flex items-center bg-surface-container-low border border-outline-variant/10 rounded-full pl-5 pr-2 focus-within:ring-1 focus-within:ring-primary focus-within:bg-surface-container-lowest transition-all group duration-200">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t.chatInputPlaceholder}
                        className="flex-grow bg-transparent text-sm md:text-base text-on-surface py-3.5 focus:outline-none placeholder:text-on-surface-variant/40 outline-none"
                        id="chat-message-input"
                      />
                      <button 
                        type="button" 
                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer border-none bg-transparent ${isEmojiPickerOpen ? "text-primary" : "text-on-surface-variant/70 hover:text-on-surface"}`}
                        title={language === "EN" ? "Emojis" : "Эмодзи"}
                        id="emoji-picker-btn"
                      >
                        <Smile className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !selectedImage) || isTyping}
                      className="p-3.5 bg-primary text-white hover:opacity-95 disabled:opacity-40 rounded-full transition-all flex items-center justify-center shadow-md active:scale-95 duration-100 cursor-pointer shrink-0 border-none"
                      title={t.sendButtonLabel}
                      id="send-message-btn"
                    >
                      <Send className="w-[18px] h-[18px] text-white" />
                    </button>
                  </form>
                </footer>
              </>
            )}
          </section>
        </>
      )}

      {/* ======================= CONTACTS TAB ======================= */}
      {currentTab === "contacts" && (
        <>
          {/* Contacts Left Panel */}
          <section className={`w-full md:w-[320px] lg:w-[350px] border-r border-outline-variant/30 bg-surface-container-lowest flex flex-col h-full shrink-0 animate-fade-in select-none ${selectedContactDetailedId ? "hidden md:flex" : "flex"}`}>
            <div className="p-6 pb-4 flex flex-col gap-4">
              {/* Mobile Branding Bar */}
              <div className="md:hidden flex items-center gap-1.5 mb-1 bg-surface-container-low px-3 py-2 rounded-2xl w-fit">
                <span className="text-base font-black tracking-wider text-primary dark:text-indigo-400">Mesa</span>
                <span className="text-[9px] bg-primary-fixed text-[#15196c] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">v1.0</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-on-surface font-sans">
                {language === "EN" ? "Contacts" : "Контакты"}
              </h2>

              {/* Serene small search bar */}
              <div className="relative flex items-center bg-surface-container-low border border-outline-variant/15 rounded-xl px-3 py-1.5">
                <Search className="w-4 h-4 text-slate-400 mr-2 select-none shrink-0" />
                <input
                  type="text"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  placeholder={language === "EN" ? "Search contacts..." : "Поиск контактов..."}
                  className="w-full bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                />
              </div>
            </div>

            {/* List scroll */}
            <div className="flex-grow overflow-y-auto px-1 pb-24 md:pb-4">
              <div className="flex flex-col gap-1">
                {filteredContacts.map((c) => {
                  const isActive = selectedContactDetailedId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContactDetailedId(c.id)}
                      className={`flex items-center gap-3 py-3 px-5 mx-2 my-0.5 rounded-2xl cursor-pointer transition-all border-l-4 ${
                        isActive 
                          ? "bg-primary-fixed/30 border-primary" 
                          : "hover:bg-surface-container/20 border-transparent"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(c.name, c.avatar, "w-10 h-10 text-xs")}
                        {c.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface-container-lowest rounded-full"></span>
                        )}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <p className={`font-bold text-xs truncate ${isActive ? "text-primary" : "text-on-surface"}`}>
                          {c.name}
                        </p>
                        <p className="text-[10px] text-on-surface-variant/80 truncate">
                          {c.isOnline 
                            ? (language === "EN" ? "Online" : "В сети") 
                            : (language === "EN" ? "Offline" : "Не в сети")}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {filteredContacts.length === 0 && (
                  <p className="text-center text-[11px] text-on-surface-variant/65 mt-8 px-4 leading-normal">
                    {language === "EN" ? "No matches found." : "Совпадений не найдено."}
                  </p>
                )}
              </div>
            </div>

            {/* Add contact trigger */}
            <div className="p-4 bg-surface-container">
              <button
                type="button"
                onClick={() => setIsAddContactOpen(true)}
                className="w-full h-11 flex items-center justify-center gap-1.5 bg-primary text-white hover:opacity-95 rounded-xl text-xs font-bold font-sans transition-all shadow-md cursor-pointer border-none"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{language === "EN" ? "Add Contact" : "Добавить контакт"}</span>
              </button>
            </div>
          </section>

          {/* Contact detailed profile pane */}
          <section className={`flex-1 flex flex-col h-full bg-background relative animate-fade-in select-none ${selectedContactDetailedId ? "flex" : "hidden md:flex"}`}>
            <header className="h-[72px] border-b border-outline-variant/20 bg-surface-container-lowest px-4 sm:px-6 flex items-center gap-2 sm:gap-3 shrink-0 z-10 shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedContactDetailedId(null)}
                className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 shrink-0 cursor-pointer border-none bg-transparent flex items-center justify-center"
                title={language === "EN" ? "Back to Contacts" : "Назад к контактам"}
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <h1 className="font-bold text-sm text-on-surface font-sans">
                {language === "EN" ? "Detailed Contact Bio" : "Карточка контакта"}
              </h1>
            </header>

            {!detailedContact || !detailedBio ? (
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-transparent">
                <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-indigo-400/5 flex items-center justify-center text-primary dark:text-indigo-400 mb-6 border border-slate-100 dark:border-slate-800">
                  <Users className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 tracking-tight mb-2">
                  {language === "EN" ? "Select a Contact" : "Выберите контакт"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[340px] leading-relaxed mb-6 font-medium">
                  {language === "EN" 
                    ? "Add or select a user from the left pane to view their comprehensive directory details."
                    : "Выберите или добавьте контакт из левой панели для просмотра подробной информации."}
                </p>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto p-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                <div className="text-center flex flex-col items-center w-full max-w-sm">
                  
                  {/* Visual Circle Photo */}
                  <div className="relative mb-5">
                    {renderAvatar(detailedContact.name, detailedContact.avatar, "w-24 h-24 text-2xl")}
                    {detailedContact.isOnline && (
                      <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full"></span>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-on-surface mb-1 font-sans">
                    {detailedContact.name}
                  </h2>
                  
                  <div className="mb-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-tight ${
                      detailedContact.isOnline ? "bg-emerald-500/10 text-emerald-600 animate-pulse" : "bg-zinc-200/50 text-zinc-600"
                    }`}>
                      {detailedContact.isOnline 
                        ? (language === "EN" ? "Online" : "В сети") 
                        : (language === "EN" ? "Offline" : "Не в сети")}
                    </span>
                  </div>

                  {/* Info parameters */}
                  <div className="bg-surface-container-lowest border border-outline-variant/25 rounded-3xl p-5 w-full text-left shadow-sm flex flex-col gap-3.5 mb-6">
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-0.5">
                        Email
                      </span>
                      <span className="text-sm font-medium text-on-surface whitespace-nowrap block truncate">
                        {detailedBio.email}
                      </span>
                    </div>
                    <div className="border-t border-outline-variant/10 pt-3">
                      <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-0.5">
                        {language === "EN" ? "Mindful Bio" : "О себе"}
                      </span>
                      <p className="text-xs text-on-surface-variant/90 leading-relaxed font-sans mt-0.5 whitespace-normal">
                        {detailedBio.bio}
                      </p>
                    </div>
                  </div>

                  {/* Launch thread action */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveContactId(detailedContact.id);
                      setCurrentTab("chats");
                    }}
                    className="h-12 w-full bg-primary text-white hover:opacity-95 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 duration-100 flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{language === "EN" ? "Send Message" : "Начать диалог"}</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ======================= SETTINGS TAB ======================= */}
      {currentTab === "settings" && (
        <section className="flex-grow flex flex-col h-full bg-[#f8fafc] dark:bg-[#090d16] overflow-y-auto animate-fade-in relative pb-24 md:pb-6">
          
          <div className="max-w-2xl w-full mx-auto py-10 px-6 md:px-8 flex flex-col gap-8">
            
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {language === "EN" ? "Profile Settings" : "Настройки профиля"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
                {language === "EN" 
                  ? "Manage your identity and app preferences." 
                  : "Управление вашим профилем и настройками приложения."}
              </p>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-8 shadow-sm flex flex-col gap-6 items-center">
              
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={handleAvatarClick}
                  className="relative group cursor-pointer active:scale-95 transition-all duration-200"
                  title={language === "EN" ? "Upload avatar image" : "Загрузить свой аватар"}
                >
                  {renderAvatar(userName, userAvatar, "w-24 h-24 text-2xl border-4 border-slate-100 dark:border-slate-800 shadow-sm")}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs text-white font-bold tracking-wide uppercase">
                      {language === "EN" ? "Change" : "Изм."}
                    </span>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>

               <div className="w-full flex flex-col gap-5 mt-2">
                
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    {language === "EN" ? "Display Name" : "Отображаемое имя"}
                  </label>
                  <input
                    type="text"
                    id="settings-display-name-input"
                    value={profileNameInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProfileNameInput(val);
                      setUserName(val);
                    }}
                    onBlur={() => {
                      syncProfileToServer({ username: profileNameInput });
                    }}
                    placeholder="Alex Rivera"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-primary dark:focus:border-indigo-400 transition-all outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    {language === "EN" ? "Mindful Bio" : "О себе"}
                  </label>
                  <textarea
                    rows={3}
                    id="settings-bio-textarea"
                    value={userBio}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserBio(val);
                      localStorage.setItem(`mesa_user_bio_${userEmail.toLowerCase().trim()}`, val);
                    }}
                    onBlur={() => {
                      syncProfileToServer({ bio: userBio });
                    }}
                    placeholder={language === "EN" ? "Something quiet about yourself..." : "Что-нибудь спокойное о себе..."}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-primary dark:focus:border-indigo-400 transition-all outline-none resize-none font-sans"
                  />
                </div>

              </div>
            </div>

            {/* Preferences Card */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-8 shadow-sm flex flex-col gap-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {language === "EN" ? "Preferences" : "Предпочтения"}
              </h2>

              <div className="flex flex-col">
                
                <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-850/60">
                  <div className="flex flex-col max-w-[70%]">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      {language === "EN" ? "Notifications" : "Оповещения"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === "EN" 
                        ? "Receive alerts for new messages" 
                        : "Получать звуковые оповещения и пуш-уведомления"}
                    </span>
                  </div>
                  <Toggle active={notificationsEnabled} onChange={(val) => {
                    setNotificationsEnabled(val);
                    localStorage.setItem("mesa_settings_notifications", String(val));
                    if (val && typeof window !== "undefined" && "Notification" in window) {
                      if (Notification.permission === "default") {
                        Notification.requestPermission();
                      }
                    }
                  }} />
                </div>

                <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-855/60">
                  <div className="flex flex-col max-w-[70%]">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      {language === "EN" ? "Privacy" : "Конфиденциальность"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === "EN" 
                        ? "Show read receipts" 
                        : "Показывать статус прочтения собеседнику"}
                    </span>
                  </div>
                  <Toggle active={privacyEnabled} onChange={(val) => {
                    setPrivacyEnabled(val);
                    localStorage.setItem("mesa_settings_privacy", String(val));
                  }} />
                </div>

                <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-855/60">
                  <div className="flex flex-col max-w-[50%]">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      {language === "EN" ? "Language" : "Язык интерфейса"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === "EN" 
                        ? "Choose interface language" 
                        : "Выберите предпочтительный язык интерфейса"}
                    </span>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onLanguageChange("RU")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all font-sans cursor-pointer border-none ${
                        language === "RU"
                          ? "bg-primary text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-transparent"
                      }`}
                    >
                      Русский
                    </button>
                    <button
                      type="button"
                      onClick={() => onLanguageChange("EN")}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all font-sans cursor-pointer border-none ${
                        language === "EN"
                          ? "bg-primary text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-transparent"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-4">
                  <div className="flex flex-col max-w-[70%]">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      {language === "EN" ? "Dark Mode" : "Темная тема"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {language === "EN" 
                        ? "Switch to a darker theme" 
                        : "Включить темную тему для интерфейса приложения"}
                    </span>
                  </div>
                  <Toggle active={darkModeEnabled} onChange={handleToggleDarkMode} />
                </div>

              </div>
            </div>

            {/* Danger Zone Row */}
            <div className="bg-rose-50/20 dark:bg-rose-950/10 rounded-3xl border border-rose-100 dark:border-rose-900/30 p-8 shadow-sm flex flex-col gap-4">
              <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400 tracking-tight flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>{language === "EN" ? "Danger Zone" : "Опасная зона"}</span>
              </h2>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
                {language === "EN" 
                  ? "Permanently delete your Mesa account, including your public profile and all stored conversations. This action is irreversible." 
                  : "Навсегда удалите вашу учетную запись Mesa, включая ваш публичный профиль и всю историю диалогов. Это действие необратимо."}
              </p>
              <div className="flex justify-start mt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-sm active:scale-95 duration-150"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>{language === "EN" ? "Delete Account" : "Удалить аккаунт"}</span>
                </button>
              </div>
            </div>

            {/* Logout Trigger Link */}
            <div className="flex justify-start items-center mt-2 px-1">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 text-rose-600 hover:text-red-700 dark:hover:text-red-400 font-bold text-sm tracking-wide bg-transparent border-none outline-none cursor-pointer p-0 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>{t.logoutButton}</span>
              </button>
            </div>

          </div>
        </section>
      )}

      {/* ======================= ADD CONTACT MODAL DIALOG ======================= */}
      {isAddContactOpen && (
        <div 
          onClick={() => setIsAddContactOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest rounded-3xl p-6 max-w-sm w-full border border-outline-variant/30 shadow-2xl relative"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-on-surface font-sans">
                {language === "EN" ? "Add New Contact" : "Добавить новый контакт"}
              </h3>
              <button 
                type="button"
                onClick={() => setIsAddContactOpen(false)}
                className="p-1 px-1.5 hover:bg-slate-100 text-slate-500 rounded-full transition-colors font-sans hover:text-slate-800 cursor-pointer border-none bg-transparent flex items-center justify-center"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mb-2">
                  {language === "EN" 
                    ? "Enter the email of a registered Mesa user to add them to your contacts list immediately." 
                    : "Введите email зарегистрированного пользователя Mesa, чтобы сразу добавить его в контакты."}
                </p>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest font-sans">
                  {language === "EN" ? "Email Address" : "Email-адрес"}
                </label>
                <input
                  type="email"
                  required
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="test@mesa.com"
                  className="w-full h-11 bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-2 bg-primary text-white hover:opacity-90 rounded-xl text-xs font-bold tracking-wider uppercase shadow-md transition-all active:scale-95 cursor-pointer border-none"
              >
                {language === "EN" ? "Add Contact" : "Добавить в контакты"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= ABSOLUTE FLOATING PORTALS & CONTEXT MENUS ======================= */}

      {/* Chat Options Context Menu */}
      {activeChatOptionContactId && chatOptionPosition && (
        <div 
          style={{ top: `${chatOptionPosition.y}px`, left: `${chatOptionPosition.x}px` }}
          className="fixed bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-2xl py-2 w-48 z-[9999] select-none animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const currentName = contacts.find(c => c.id === activeChatOptionContactId)?.name || "";
              setRenameContactId(activeChatOptionContactId);
              setRenameInputValue(currentName);
              setActiveChatOptionContactId(null);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors"
          >
            <Edit3 className="w-4 h-4 text-indigo-500" />
            {language === "EN" ? "Rename Chat" : "Переименовать"}
          </button>
          
          <button
            onClick={() => {
              setDeleteChatContactId(activeChatOptionContactId);
              setDeleteChatForEveryone(false);
              setActiveChatOptionContactId(null);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-650 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            {language === "EN" ? "Delete Chat" : "Удалить чат"}
          </button>
        </div>
      )}

      {/* Message Context Options */}
      {contextedMessage && messageContextMenuPos && (
        <div 
          style={{ top: `${messageContextMenuPos.y}px`, left: `${messageContextMenuPos.x}px` }}
          className="fixed bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-2xl py-2 w-48 z-[9999] select-none animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handlePinMessage(contextedMessage);
              setContextedMessage(null);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-650 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors"
          >
            <Pin className="w-4 h-4 text-orange-500 rotate-45" />
            {contextedMessage.isPinned 
              ? (language === "EN" ? "Unpin Message" : "Открепить") 
              : (language === "EN" ? "Pin Message" : "Закрепить")}
          </button>
          
          <button
            onClick={() => {
              setDeleteMessageObj(contextedMessage);
              setDeleteMsgForEveryone(false);
              setContextedMessage(null);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-650 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-none bg-transparent cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-505" />
            {language === "EN" ? "Delete Message" : "Удалить сообщение"}
          </button>
        </div>
      )}

      {/* Rename Chat Interactive Prompt Modal */}
      {renameContactId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 select-none">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 font-sans">
              {language === "EN" ? "Rename Chat" : "Переименовать"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-sans leading-relaxed">
              {language === "EN" ? "Enter a new custom name for this conversation:" : "Введите новое имя для этой беседы:"}
            </p>
            <input
              type="text"
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              placeholder="e.g. Elena Support"
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-sm text-slate-800 dark:text-white rounded-xl px-4 py-3 mb-5 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-primary dark:focus:border-indigo-400 transition-all font-sans"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setRenameContactId(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                {language === "EN" ? "Cancel" : "Отмена"}
              </button>
              <button
                type="button"
                onClick={() => handleRenameChat(renameContactId, renameInputValue)}
                className="px-4 py-2.5 bg-primary text-white hover:opacity-90 rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-md"
              >
                {language === "EN" ? "Save" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 select-none">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-rose-600 mb-2 font-sans flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>{language === "EN" ? "Delete Account" : "Удалить аккаунт"}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-sans leading-relaxed font-semibold">
              {language === "EN" 
                ? "Are you absolutely sure you want to permanently delete your account? This action cannot be undone, and all your message archives will be destroyed." 
                : "Вы абсолютно уверены, что хотите навсегда удалить свой аккаунт? Это действие нельзя отменить, а все ваши архивы сообщений будут уничтожены."}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                {language === "EN" ? "Cancel" : "Отмена"}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-md"
              >
                {language === "EN" ? "Delete Permanently" : "Удалить навсегда"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Chat Confirmation Dialog */}
      {deleteChatContactId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 select-none">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 font-sans">
              {language === "EN" ? "Delete Chat" : "Удалить чат"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-sans leading-relaxed">
              {language === "EN" 
                ? "Are you sure you want to delete this chat room? This cannot be undone." 
                : "Вы уверены, что хотите удалить этот чат? Все сообщения будут очищены."}
            </p>
            
            <div className="flex items-center gap-2.5 mb-6 cursor-pointer" onClick={() => setDeleteChatForEveryone(!deleteChatForEveryone)}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${deleteChatForEveryone ? "bg-rose-600 border-rose-600 text-white font-bold" : "border-slate-300 dark:border-slate-750 bg-transparent"}`}>
                {deleteChatForEveryone && <span className="text-[10px] leading-none mb-0.5">✓</span>}
              </div>
              <span className="text-xs font-semibold text-slate-650 dark:text-slate-300 select-none">
                {language === "EN" ? "Also delete for other participant" : "Удалить также и у собеседника"}
              </span>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteChatContactId(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                {language === "EN" ? "Cancel" : "Отмена"}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteChat(deleteChatContactId, deleteChatForEveryone)}
                className="px-4 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-md"
              >
                {language === "EN" ? "Delete" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Dialog */}
      {deleteMessageObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 select-none animate-fade-in">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 font-sans">
              {language === "EN" ? "Delete Message" : "Удалить сообщение"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-sans leading-relaxed">
              {language === "EN" 
                ? "How do you want to delete this message?" 
                : "Как вы хотите удалить это сообщение?"}
            </p>
            
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() => handleDeleteMessage(deleteMessageObj, false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                {language === "EN" ? "Delete only for me" : "Удалить только у себя"}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(deleteMessageObj, true)}
                className="w-full py-3 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-md"
              >
                {language === "EN" ? "Delete for everyone" : "Удалить у всех"}
              </button>
              
              <button
                type="button"
                onClick={() => setDeleteMessageObj(null)}
                className="w-full py-2.5 mt-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer"
              >
                {language === "EN" ? "Cancel" : "Отмена"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Fullscreen Image Zoom Lightbox */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center z-[999999] p-4 select-none cursor-zoom-out animate-fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-none cursor-pointer flex items-center justify-center"
            title={language === "EN" ? "Close" : "Закрыть"}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <img 
            src={fullscreenImage} 
            alt="Fullscreen Zoomed View" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-scale-in"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 text-white/70 text-[10px] font-sans font-semibold">
            {language === "EN" ? "Click anywhere outside to exit Zoom" : "Нажмите в любом месте экрана для выхода из зума"}
          </div>
        </div>
      )}

    </div>
  );
}
