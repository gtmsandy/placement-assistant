export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  const permission =
    await Notification.requestPermission()

  return permission
}

export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

export function showNotification(
  title,
  options = {}
) {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission !== 'granted') {
    return false
  }

  new Notification(title, {
    icon: '/vite.svg',
    ...options,
  })

  return true
}

export function showTestNotification() {
  return showNotification(
    'Placement Assistant',
    {
      body: '🔔 Test notification is working successfully!',
      tag: 'placement-assistant-test',
    }
  )
}