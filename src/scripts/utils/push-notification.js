// Push Notification Utility
import CONFIG from '../config';

// VAPID public key - akan diambil dari API
let VAPID_PUBLIC_KEY = null;

// Get VAPID public key from API
async function getVAPIDPublicKey() {
  if (VAPID_PUBLIC_KEY) {
    return VAPID_PUBLIC_KEY;
  }

  try {
    // Try to get from API endpoint (if available)
    const response = await fetch(`${CONFIG.BASE_URL}/vapid-public-key`);
    if (response.ok) {
      const data = await response.json();
      VAPID_PUBLIC_KEY = data.publicKey;
      return VAPID_PUBLIC_KEY;
    }
  } catch (error) {
    console.log('VAPID key endpoint not available, using default');
  }

  // VAPID public key from Dicoding API documentation
  VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
  return VAPID_PUBLIC_KEY;
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert ArrayBuffer to base64 string (standard base64, not URL-safe)
// API Dicoding expects standard base64 format
function arrayBufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Use standard base64 (with +, /, and = padding)
  return btoa(binary);
}

// Register service worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Subscribe to push notifications
async function subscribeToPush(registration) {
  try {
    const vapidKey = await getVAPIDPublicKey();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

// Unsubscribe from push notifications
async function unsubscribeFromPush(registration) {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

// Get current subscription
async function getSubscription(registration) {
  try {
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
}

// Send subscription to server
async function sendSubscriptionToServer(subscription) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.log('User not logged in, skipping subscription');
    return false;
  }

  try {
    // Extract keys from subscription
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');
    
    // Convert ArrayBuffer to base64 URL-safe string
    const keyBase64 = arrayBufferToBase64URL(key);
    const authBase64 = arrayBufferToBase64URL(auth);

    // Prepare request body according to API documentation
    const requestBody = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: keyBase64,
        auth: authBase64,
      },
    };

    const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok && !data.error) {
      console.log('Subscription sent to server:', data);
      return true;
    } else {
      console.error('Failed to send subscription to server:', data);
      return false;
    }
  } catch (error) {
    console.error('Error sending subscription to server:', error);
    return false;
  }
}

// Initialize push notifications
export async function initializePushNotifications() {
  const registration = await registerServiceWorker();
  if (!registration) {
    return { success: false, message: 'Service Worker tidak didukung' };
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return { success: false, message: 'Izin notifikasi ditolak' };
  }

  const subscription = await subscribeToPush(registration);
  if (!subscription) {
    return { success: false, message: 'Gagal berlangganan push notification' };
  }

  // Save subscription locally
  localStorage.setItem('pushSubscription', JSON.stringify(subscription));

  // Send to server
  await sendSubscriptionToServer(subscription);

  return { success: true, subscription };
}

// Enable push notifications
export async function enablePushNotifications() {
  return await initializePushNotifications();
}

// Disable push notifications
export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await getSubscription(registration);
  
  if (!subscription) {
    return true; // Already unsubscribed
  }

  // Get endpoint before unsubscribing
  const endpoint = subscription.endpoint;
  
  const unsubscribed = await unsubscribeFromPush(registration);

  if (unsubscribed) {
    localStorage.removeItem('pushSubscription');
    // Notify server to remove subscription
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint }),
        });

        const data = await response.json();
        if (response.ok && !data.error) {
          console.log('Unsubscribed from server:', data);
        } else {
          console.error('Failed to unsubscribe from server:', data);
        }
      } catch (error) {
        console.error('Error removing subscription from server:', error);
      }
    }
  }

  return unsubscribed;
}

// Check if push notifications are enabled
export async function isPushNotificationEnabled() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await getSubscription(registration);
  return subscription !== null;
}

// Get notification permission status
export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

