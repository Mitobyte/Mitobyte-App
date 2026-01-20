const API_BASE = ''

/**
 * Get all announcements (admin only)
 */
export async function getAllAnnouncements(adminEmail) {
  const response = await fetch(`${API_BASE}/api/admin/announcements?adminEmail=${encodeURIComponent(adminEmail)}`)
  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch announcements')
  }

  return data.announcements
}

/**
 * Create and send a new announcement (admin only)
 */
export async function createAnnouncement({ adminEmail, title, message }) {
  const response = await fetch(`${API_BASE}/api/admin/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      adminEmail,
      title,
      message
    })
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to create announcement')
  }

  return data
}
