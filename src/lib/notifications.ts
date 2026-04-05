import { Notification } from '../types';

export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  const notifications: Notification[] = JSON.parse(localStorage.getItem('notifications') || '[]');
  
  const newNotification: Notification = {
    ...notification,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    read: false,
  };

  const updatedNotifications = [newNotification, ...notifications].slice(0, 50); // Keep last 50
  localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new CustomEvent('notifications-updated'));
  
  // Vibrate on mobile if supported
  if ('vibrate' in navigator) {
    navigator.vibrate(200);
  }
  
  // Play sound
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.volume = 0.3;
    audio.play();
  } catch (err) {
    console.warn('Could not play notification sound:', err);
  }
};

export const clearOldNotifications = () => {
  const notifications: Notification[] = JSON.parse(localStorage.getItem('notifications') || '[]');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const filtered = notifications.filter(n => new Date(n.timestamp) > thirtyDaysAgo);
  localStorage.setItem('notifications', JSON.stringify(filtered));
};
