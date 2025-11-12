/**
 * CSV Event Import API Endpoint
 * Handles bulk event creation from CSV file upload
 */

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    // Parse multipart form data
    const formData = await request.formData()
    const csvFile = formData.get('csv')
    const userEmail = formData.get('userEmail')

    if (!csvFile) {
      return new Response(JSON.stringify({ error: 'No CSV file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'User email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Read CSV content
    const csvText = await csvFile.text()

    // Parse CSV (simple parsing - split by lines and commas)
    const lines = csvText.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV file is empty or invalid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse header row
    const headers = parseCSVLine(lines[0])

    // Validate required headers
    const requiredHeaders = ['title', 'description', 'date', 'time', 'location', 'eventType']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      return new Response(JSON.stringify({
        error: `Missing required columns: ${missingHeaders.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Process each data row
    const results = []
    const errors = []
    let successCount = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const values = parseCSVLine(line)

        // Create event object from CSV row
        const eventData = {}
        headers.forEach((header, index) => {
          eventData[header] = values[index] || null
        })

        // Validate required fields
        const missingFields = []
        requiredHeaders.forEach(field => {
          if (!eventData[field] || eventData[field].trim() === '') {
            missingFields.push(field)
          }
        })

        if (missingFields.length > 0) {
          errors.push(`Row ${i + 1}: Missing required fields: ${missingFields.join(', ')}`)
          continue
        }

        // Validate event type
        const validTypes = ['code_and_coffee', 'code_and_brews', 'hackathon', 'workshop', 'meetup']
        if (!validTypes.includes(eventData.eventType)) {
          errors.push(`Row ${i + 1}: Invalid eventType "${eventData.eventType}". Must be one of: ${validTypes.join(', ')}`)
          continue
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(eventData.date)) {
          errors.push(`Row ${i + 1}: Invalid date format "${eventData.date}". Use YYYY-MM-DD`)
          continue
        }

        // Validate time format (HH:MM)
        const timeRegex = /^\d{2}:\d{2}$/
        if (!timeRegex.test(eventData.time)) {
          errors.push(`Row ${i + 1}: Invalid time format "${eventData.time}". Use HH:MM`)
          continue
        }

        // Create event in database
        const stmt = env.DB.prepare(`
          INSERT INTO events (
            title, description, date, time, location,
            capacity, event_type, thumbnail_url, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)

        await stmt.bind(
          eventData.title.trim(),
          eventData.description.trim(),
          eventData.date.trim(),
          eventData.time.trim(),
          eventData.location.trim(),
          eventData.capacity ? parseInt(eventData.capacity) : null,
          eventData.eventType.trim(),
          eventData.thumbnailUrl || null,
          userEmail
        ).run()

        successCount++
        results.push({
          row: i + 1,
          title: eventData.title,
          status: 'success'
        })

      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error)
        errors.push(`Row ${i + 1}: ${error.message}`)
      }
    }

    // Return results
    return new Response(JSON.stringify({
      success: true,
      successCount,
      totalRows: lines.length - 1,
      errors,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('CSV import error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to import CSV',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Parse a CSV line, handling quoted values
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      current += '"'
      i++ // Skip next quote
    } else if (char === '"') {
      // Toggle quote mode
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last value
  values.push(current.trim())

  return values
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
