import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Drawer } from './ui/drawer'
import { Button } from './ui/button'
import { Input } from './ui/input'

/**
 * BugReportButton Component
 * Navigation button that opens a drawer for bug reporting
 */
export default function BugReportButton({ walletAddress }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState(null) // Base64 image data
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Handle image upload and convert to base64
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result
      setScreenshot(base64String)
      setScreenshotPreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  // Remove screenshot
  const removeScreenshot = () => {
    setScreenshot(null)
    setScreenshotPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim() || !description.trim()) {
      alert('Please fill in both title and description')
      return
    }

    setSubmitting(true)

    try {
      // Get browser info
      const browserInfo = `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`

      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: walletAddress || 'anonymous',
          title: title.trim(),
          description: description.trim(),
          pageUrl: window.location.href,
          browserInfo,
          screenshot: screenshot // Base64 image string
        })
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        setTitle('')
        setDescription('')
        setScreenshot(null)
        setScreenshotPreview(null)
      } else {
        alert(`Failed to submit bug report: ${data.error}`)
      }
    } catch (error) {
      console.error('Error submitting bug report:', error)
      alert('Failed to submit bug report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Nav Bar Bug Report Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-9 h-9 rounded-full hover:bg-foreground/5 flex items-center justify-center transition-colors"
        aria-label="Report a Bug"
        title="Report a Bug"
      >
        <span className="text-sm">🐛</span>
      </button>

      {/* Bug Report Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={() => !submitting && setIsOpen(false)}
      >
        <div className="p-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <span>🐛</span>
              <span>Report a Bug</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Help us improve by reporting any issues you encounter
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-2">
                Bug Report Submitted!
              </h3>
              <p className="text-muted-foreground mb-6">
                Thank you for helping us improve
              </p>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bug Title *
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                  maxLength={200}
                  disabled={submitting}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/200 characters
                </p>
              </div>

              {/* Description Textarea */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what happened, what you expected, and steps to reproduce..."
                  required
                  rows={6}
                  maxLength={2000}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/2000 characters
                </p>
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Screenshot (Optional)
                </label>
                {screenshotPreview ? (
                  <div className="relative">
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="w-full max-h-64 object-contain rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      disabled={submitting}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="text-center">
                      <div className="text-3xl mb-2">📷</div>
                      <p className="text-sm text-muted-foreground">
                        Click to upload screenshot
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF (max 5MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={submitting}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Info Note */}
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="mb-1">
                  <strong>Note:</strong> Your current page URL and browser info will be included automatically.
                </p>
                {walletAddress && walletAddress !== 'anonymous' && (
                  <p>Your account will be linked to this report.</p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !title.trim() || !description.trim()}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Drawer>
    </>
  )
}
