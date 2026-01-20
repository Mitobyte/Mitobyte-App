/**
 * CSV Export Utility
 * Converts JSON data to CSV and triggers download
 */

/**
 * Convert JSON array to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Optional array of column definitions {key, label}
 * @returns {string} CSV formatted string
 */
export function jsonToCSV(data, columns = null) {
  if (!data || data.length === 0) {
    return ''
  }

  // If columns not provided, use all keys from first object
  const headers = columns || Object.keys(data[0]).map(key => ({ key, label: key }))

  // Create header row
  const headerRow = headers.map(col => escapeCSVValue(col.label)).join(',')

  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(col => {
      const value = row[col.key]
      return escapeCSVValue(value)
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 * @param {any} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return ''
  }

  // Convert to string
  let stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    stringValue = '"' + stringValue.replace(/"/g, '""') + '"'
  }

  return stringValue
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    // Create download link
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up URL
    URL.revokeObjectURL(url)
  }
}

/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Base filename (will add timestamp and .csv)
 * @param {Array} columns - Optional column definitions
 */
export function exportToCSV(data, filename, columns = null) {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  const csvContent = jsonToCSV(data, columns)
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const fullFilename = `${filename}_${timestamp}.csv`

  downloadCSV(csvContent, fullFilename)
}

/**
 * Format date for CSV export
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDateForCSV(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
