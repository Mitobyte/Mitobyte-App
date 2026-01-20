import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/button'

/**
 * APIDocsViewer Component
 * Displays OpenAPI specification in a visual, interactive format using Swagger UI
 */
export default function APIDocsViewer() {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css'
    document.head.appendChild(link)

    // Load Swagger UI JS
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js'
    script.async = true

    script.onload = () => {
      try {
        // Initialize Swagger UI
        window.SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui-container',
          deepLinking: true,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIBundle.SwaggerUIStandalonePreset
          ],
          plugins: [
            window.SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: 'BaseLayout',
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          docExpansion: 'list',
          filter: true,
          tryItOutEnabled: true,
          requestInterceptor: (request) => {
            // You can add custom headers here if needed
            return request
          }
        })
        setLoading(false)
      } catch (err) {
        console.error('Failed to initialize Swagger UI:', err)
        setError('Failed to load API documentation viewer')
        setLoading(false)
      }
    }

    script.onerror = () => {
      setError('Failed to load Swagger UI library')
      setLoading(false)
    }

    document.body.appendChild(script)

    // Cleanup
    return () => {
      document.head.removeChild(link)
      document.body.removeChild(script)
    }
  }, [])

  const handleDownloadSpec = () => {
    window.open('/api/openapi.json', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>📚</span>
            <span>API Documentation</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Interactive API reference with request/response examples
          </p>
        </div>
        <Button onClick={handleDownloadSpec} variant="outline" size="sm">
          📥 Download OpenAPI Spec
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-muted-foreground">Loading API documentation...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-6"
        >
          <div className="flex items-start space-x-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-destructive mb-1">Error Loading Documentation</h3>
              <p className="text-sm text-destructive/80">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <div className="text-xl">💡</div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-blue-700 dark:text-blue-300">How to Use</h3>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>Click on any endpoint to expand and see details</li>
              <li>Use "Try it out" to test endpoints directly (requires API key)</li>
              <li>Click "Authorize" button to add your API key for testing</li>
              <li>View request/response schemas and examples</li>
              <li>Download the OpenAPI spec for use with API clients</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Swagger UI Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="bg-background border rounded-lg overflow-hidden"
      >
        <div
          id="swagger-ui-container"
          ref={containerRef}
          className="swagger-ui-wrapper"
          style={{ minHeight: '600px' }}
        />
      </motion.div>

      {/* Custom Styles for Swagger UI */}
      <style jsx global>{`
        .swagger-ui-wrapper {
          padding: 1rem;
        }

        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .information-container {
          margin: 0;
        }

        .swagger-ui .scheme-container {
          background: transparent;
          box-shadow: none;
          padding: 0;
          margin: 0;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .swagger-ui {
            filter: invert(0.9) hue-rotate(180deg);
          }
          .swagger-ui img {
            filter: invert(1) hue-rotate(180deg);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .swagger-ui-wrapper {
            padding: 0.5rem;
          }

          .swagger-ui .opblock-tag {
            font-size: 1rem;
          }

          .swagger-ui .opblock {
            margin: 0.5rem 0;
          }
        }
      `}</style>
    </div>
  )
}
