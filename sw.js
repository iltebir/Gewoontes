// Service Worker for Gewoontes PWA
const CACHE = 'gewoontes-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Listen for messages from the main app
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS'){
    const { habits, fajrTime } = e.data;
    scheduleAll(habits, fajrTime);
  }
  if(e.data && e.data.type === 'CANCEL_NOTIFICATIONS'){
    // Cancel handled by re-scheduling
  }
});

// Store scheduled alarms
let scheduledTimers = [];

function clearAll(){
  scheduledTimers.forEach(t => clearTimeout(t));
  scheduledTimers = [];
}

function scheduleAll(habits, fajrTime){
  clearAll();
  const now = new Date();
  habits.forEach(h => {
    let timeStr = h.time;
    const [hh, mm] = timeStr.split(':').map(Number);
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    const diff = target - now;
    if(diff > 0){
      const t = setTimeout(() => {
        self.registration.showNotification('⏰ Herinnering — Gewoontes', {
          body: h.emoji + ' ' + h.name + ' — tijd om te beginnen!',
          icon: self.location.origin+'/Gewoontes/apple-touch-icon.png',
          badge: self.location.origin+'/Gewoontes/apple-touch-icon.png',
          tag: h.id,
          renotify: true,
          requireInteraction: false,
          data: { habitId: h.id }
        });
      }, diff);
      scheduledTimers.push(t);
    }
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(self.location.origin+'/Gewoontes/'));
});
