import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

/**
 * EventCSVUpload Component
 * Allows bulk upload of events via CSV file
 */
export default function EventCSVUpload({ user, onSuccess }) {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [errors, setErrors] = useState([])
  const [successCount, setSuccessCount] = useState(0)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setUploadStatus(null)
      setErrors([])
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first')
      return
    }

    setIsUploading(true)
    setUploadStatus(null)
    setErrors([])

    try {
      const formData = new FormData()
      formData.append('csv', file)
      formData.append('userEmail', user.email)

      const response = await fetch('/api/events/import-csv', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadStatus('success')
        setSuccessCount(data.successCount || 0)
        setErrors(data.errors || [])
        setFile(null)

        if (onSuccess) {
          onSuccess(data)
        }

        // Reset file input
        document.getElementById('csv-upload-input').value = ''
      } else {
        setUploadStatus('error')
        setErrors([data.error || 'Failed to upload CSV'])
      }
    } catch (error) {
      console.error('CSV upload error:', error)
      setUploadStatus('error')
      setErrors([error.message || 'Failed to upload CSV'])
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `title,description,date,time,location,capacity,eventType,thumbnailUrl
"Milwaukee Tech Meetup","Join us for networking and tech talks","2025-12-15","18:00","The Commons, Milwaukee",50,"meetup","https://example.com/image.jpg"
"Code and Coffee","Casual coding session with coffee","2025-12-20","09:00","Starbucks Downtown",30,"code_and_coffee",""
"Hackathon 2025","24-hour coding challenge","2025-12-25","10:00","Innovation Center",100,"hackathon",""`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'event_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import Events from CSV</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Upload a CSV file to create multiple events at once
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Format Instructions */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold text-sm">CSV Format Requirements:</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>title</strong> - Event title (required)</li>
            <li><strong>description</strong> - Event description (required)</li>
            <li><strong>date</strong> - Date in YYYY-MM-DD format (required)</li>
            <li><strong>time</strong> - Time in HH:MM format (required)</li>
            <li><strong>location</strong> - Event location (required)</li>
            <li><strong>capacity</strong> - Max attendees (optional, number)</li>
            <li><strong>eventType</strong> - One of: code_and_coffee, code_and_brews, hackathon, workshop, meetup (required)</li>
            <li><strong>thumbnailUrl</strong> - Image URL (optional)</li>
          </ul>
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              📥 Download CSV Template
            </Button>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <label htmlFor="csv-upload-input" className="block text-sm font-medium">
            Select CSV File
          </label>
          <div className="flex items-center gap-3">
            <input
              id="csv-upload-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <span className="text-sm text-muted-foreground">
                ✓ {file.name}
              </span>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Uploading Events...
            </>
          ) : (
            <>
              <span className="mr-2">📤</span>
              Upload CSV
            </>
          )}
        </Button>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
          >
            <p className="text-green-600 dark:text-green-400 font-semibold">
              ✓ Successfully imported {successCount} event{successCount !== 1 ? 's' : ''}!
            </p>
            {errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  {errors.length} row{errors.length !== 1 ? 's' : ''} had errors:
                </p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index} className="text-xs">• {error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-xs">• ... and {errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {uploadStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <p className="text-destructive font-semibold">
              ✗ Upload Failed
            </p>
            <ul className="text-sm text-destructive/80 mt-2 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Example Preview */}
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <h4 className="text-sm font-semibold mb-2">Example CSV Row:</h4>
          <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`"Tech Meetup","Networking event","2025-12-15","18:00","Downtown",50,"meetup",""`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
