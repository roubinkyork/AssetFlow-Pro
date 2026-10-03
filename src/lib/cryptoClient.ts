import { OfflineMutation, Asset } from '../types';

const OFFLINE_QUEUE_KEY = 'omni_asset_offline_queue_v1';
const OFFLINE_ASSETS_CACHE_KEY = 'omni_asset_cache_encrypted_v1';

// Client-side key derivation for offline vault storage using WebCrypto
async function getDerivedClientKey(): Promise<CryptoKey> {
  const secret = 'iso55001-gdpr-client-vault-key-2026';
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('asset-mgmt-salt-gdpr'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptLocalPayload(data: any): Promise<string> {
  try {
    const key = await getDerivedClientKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.warn('Fallback plaintext encoding:', err);
    return JSON.stringify(data);
  }
}

export async function decryptLocalPayload(cipherBase64: string): Promise<any> {
  try {
    const raw = atob(cipherBase64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const key = await getDerivedClientKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    // If plaintext or error, try JSON parse
    try {
      return JSON.parse(cipherBase64);
    } catch {
      return null;
    }
  }
}

// Offline Queue Helpers
export function getOfflineQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineMutation(mutation: Omit<OfflineMutation, 'id' | 'synced'>): OfflineMutation {
  const queue = getOfflineQueue();
  const newMutation: OfflineMutation = {
    ...mutation,
    id: 'MUT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    synced: false,
  };
  queue.push(newMutation);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return newMutation;
}

export function clearSyncedMutations(ids: string[]) {
  const queue = getOfflineQueue().filter(m => !ids.includes(m.id));
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export const enqueueOfflineMutation = queueOfflineMutation;

export async function saveLocalAssetsCache(assets: Asset[]) {
  try {
    const encrypted = await encryptLocalPayload(assets);
    localStorage.setItem(OFFLINE_ASSETS_CACHE_KEY, encrypted);
  } catch (e) {
    console.error('Failed to cache assets locally:', e);
  }
}

export async function loadLocalAssetsCache(): Promise<Asset[] | null> {
  try {
    const raw = localStorage.getItem(OFFLINE_ASSETS_CACHE_KEY);
    if (!raw) return null;
    return await decryptLocalPayload(raw);
  } catch {
    return null;
  }
}

// Push Notification Helper
export async function sendPushNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (e) {
      console.warn('Native notification failed, fallback in-app:', e);
    }
  }
}
