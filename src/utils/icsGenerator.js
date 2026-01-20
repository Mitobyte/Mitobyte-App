/**
 * ICS (iCalendar) File Generator
 * Generate .ics files for calendar events
 */

/**
 * Format date for ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(dateString, timeString) {
  // Parse the date (format: YYYY-MM-DD)
  const [year, month, day] = dateString.split('-')

  // Parse the time (format: HH:MM or HH:MM:SS)
  const [hours, minutes] = timeString.split(':')

  // Create date object in local timezone
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1, // Month is 0-indexed
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  )

  // Format as YYYYMMDDTHHMMSS
  const year4 = date.getFullYear()
  const month2 = String(date.getMonth() + 1).padStart(2, '0')
  const day2 = String(date.getDate()).padStart(2, '0')
  const hours2 = String(date.getHours()).padStart(2, '0')
  const minutes2 = String(date.getMinutes()).padStart(2, '0')
  const seconds2 = '00'

  return `${year4}${month2}${day2}T${hours2}${minutes2}${seconds2}`
}

/**
 * Get end time (add 2 hours to start time by default)
 */
function getEndTime(dateString, timeString, durationHours = 2) {
  const [year, month, day] = dateString.split('-')
  const [hours, minutes] = timeString.split(':')

  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  )

  // Add duration
  date.setHours(date.getHours() + durationHours)

  const year4 = date.getFullYear()
  const month2 = String(date.getMonth() + 1).padStart(2, '0')
  const day2 = String(date.getDate()).padStart(2, '0')
  const hours2 = String(date.getHours()).padStart(2, '0')
  const minutes2 = String(date.getMinutes()).padStart(2, '0')
  const seconds2 = '00'

  return `${year4}${month2}${day2}T${hours2}${minutes2}${seconds2}`
}

/**
 * Escape special characters in ICS content
 */
function escapeICSText(text) {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate ICS file content for an event
 * @param {Object} event - Event object with title, description, date, time, location
 * @returns {string} ICS file content
 */
export function generateICS(event) {
  const now = new Date()
  const timestamp = formatICSDate(
    now.toISOString().split('T')[0],
    now.toTimeString().split(' ')[0]
  )

  const startDateTime = formatICSDate(event.date, event.time)
  const endDateTime = getEndTime(event.date, event.time, 2)

  // Generate unique UID
  const uid = `event-${event.id}-${Date.now()}@mitobyte.com`

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mitobyte//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${escapeICSText(event.description)}`,
    `LOCATION:${escapeICSText(event.location)}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return icsContent
}

/**
 * Download ICS file
 * @param {Object} event - Event object
 */
export function downloadICS(event) {
  const icsContent = generateICS(event)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Get ICS file as data URL for sharing
 * @param {Object} event - Event object
 * @returns {string} Data URL
 */
export function getICSDataURL(event) {
  const icsContent = generateICS(event)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  return URL.createObjectURL(blob)
}
