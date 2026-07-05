// Service Worker — Gewoontes PWA v2.9
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

let scheduledTimers = [];

function clearAll(){
  scheduledTimers.forEach(t => clearTimeout(t));
  scheduledTimers = [];
}

function scheduleAll(habits, checkedData){
  clearAll();
  const now = new Date();
  const base = self.location.origin + '/Gewoontes/';

  habits.forEach(h => {
    const entry = checkedData[h.id] || {};
    // Skip if already done or reason given
    if(entry.done || entry.reason) return;

    const [hh, mm] = h.time.split(':').map(Number);
    const taskTime = new Date();
    taskTime.setHours(hh, mm, 0, 0);
    const diffToTask = taskTime - now;

    // 1. First notification exactly at task time
    if(diffToTask > 0){
      scheduledTimers.push(setTimeout(() => {
        showReminder(h, base, checkedData);
      }, diffToTask));
    }

    // 2. Hourly reminders after task time until end of day (23:00)
    const endOfDay = new Date();
    endOfDay.setHours(23, 0, 0, 0);

    // Start hourly from task time (or from now if task time already passed)
    let nextReminder = new Date(Math.max(taskTime.getTime(), now.getTime()));
    // Round up to next hour after task time
    nextReminder.setMinutes(0, 0, 0);
    nextReminder.setHours(nextReminder.getHours() + 1);

    while(nextReminder <= endOfDay){
      const delay = nextReminder - now;
      const reminderTime = new Date(nextReminder); // capture for closure
      if(delay > 0){
        scheduledTimers.push(setTimeout(() => {
          showReminder(h, base, checkedData);
        }, delay));
      }
      nextReminder = new Date(nextReminder);
      nextReminder.setHours(nextReminder.getHours() + 1);
    }
  });
}

async function showReminder(h, base, checkedData){
  // Re-check from all clients if task is still pending
  const allClients = await clients.matchAll();
  // Show notification
  await self.registration.showNotification('⏰ ' + h.emoji + ' ' + h.name, {
    body: 'Nog niet gedaan! Vink af of schrijf een reden.',
    icon: base + 'apple-touch-icon.png',
    badge: base + 'apple-touch-icon.png',
    tag: 'reminder-' + h.id,
    renotify: true,
    requireInteraction: false,
    data: { habitId: h.id, url: base }
  });
}

self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS'){
    scheduleAll(e.data.habits, e.data.checkedData || {});
  }
  if(e.data && e.data.type === 'HABIT_DONE'){
    // Reschedule when a habit is marked done or reason added
    scheduleAll(e.data.habits, e.data.checkedData || {});
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.location.origin + '/Gewoontes/';
  e.waitUntil(clients.openWindow(url));
});
