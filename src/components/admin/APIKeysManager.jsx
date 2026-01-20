import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

export default function APIKeysManager({ adminEmail }) {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [newApiKey, setNewApiKey] = useState(null)

  // Form state for generating new key
  const [formData, setFormData] = useState({
    keyName: '',
    expiresInDays: '',
    rateLimit: 1000,
    notes: ''
  })

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/api-keys?adminEmail=${encodeURIComponent(adminEmail)}`)
      const data = await response.json()

      if (data.success) {
        setKeys(data.keys)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateKey = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          adminEmail,
          ...formData,
          expiresInDays: formData.expiresInDays ? parseInt(formData.expiresInDays) : null,
          rateLimit: parseInt(formData.rateLimit)
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewApiKey(data.key)
        setSuccessMessage('API key generated successfully! Please save it securely.')
        setFormData({ keyName: '', expiresInDays: '', rateLimit: 1000, notes: '' })
        await fetchKeys()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to generate API key:', err)
      setError(err.message)
    }
  }

  const handleDeactivate = async (keyId) => {
    if (!confirm('Deactivate this API key? It will no longer work for authentication.')) return

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deactivate',
          adminEmail,
          keyId
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage('API key deactivated successfully')
        await fetchKeys()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to deactivate API key:', err)
      setError(err.message)
    }
  }

  const handleActivate = async (keyId) => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          adminEmail,
          keyId
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage('API key activated successfully')
        await fetchKeys()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to activate API key:', err)
      setError(err.message)
    }
  }

  const handleDelete = async (keyId) => {
    if (!confirm('Permanently delete this API key? This cannot be undone.')) return

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          adminEmail,
          keyId
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage('API key deleted successfully')
        await fetchKeys()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to delete API key:', err)
      setError(err.message)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setSuccessMessage('Copied to clipboard!')
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const maskApiKey = (key) => {
    if (key.length <= 12) return key
    return key.substring(0, 12) + '•'.repeat(key.length - 12)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔑</div>
          <p className="text-muted-foreground">Loading API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🔑</span>
            API Keys
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for secure access to the Mitobyte API
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('/api/openapi.json', '_blank')}
          >
            <span className="mr-2">📄</span>
            Raw Spec
          </Button>
          <Button onClick={() => setShowGenerateModal(true)}>
            <span className="mr-2">✨</span>
            Generate API Key
          </Button>
        </div>
      </div>

      {/* Info Card - API Documentation */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-xl">📚</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
              Visual API Documentation Available
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Check out the <strong>API Documentation</strong> tab for an interactive, visual guide to all available endpoints with examples and the ability to test requests directly in your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* API Keys List */}
      {keys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🔑</div>
            <p className="text-muted-foreground">No API keys yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Generate your first API key to start using the API
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {keys.map((key, index) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={!key.is_active ? 'opacity-50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* Key Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold">{key.key_name}</h3>
                          {key.is_active === 1 ? (
                            <Badge variant="default" className="bg-green-600">Active</Badge>
                          ) : (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 font-mono text-xs bg-muted px-3 py-2 rounded">
                            <code>{maskApiKey(key.api_key)}</code>
                            <button
                              onClick={() => copyToClipboard(key.api_key)}
                              className="text-primary hover:text-primary/80 ml-auto"
                            >
                              📋 Copy
                            </button>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Created</p>
                              <p className="font-medium">{formatDate(key.created_at)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Last Used</p>
                              <p className="font-medium">{formatDate(key.last_used_at)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Expires</p>
                              <p className="font-medium">{formatDate(key.expires_at)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Rate Limit</p>
                              <p className="font-medium">{key.rate_limit}/hour</p>
                            </div>
                          </div>

                          {key.notes && (
                            <p className="text-muted-foreground text-xs">
                              📝 {key.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2 flex-shrink-0">
                        {key.is_active === 1 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(key.id)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            ⏸ Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivate(key.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            ✓ Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(key.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Generate Key Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !newApiKey && setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    {newApiKey ? 'API Key Generated!' : 'Generate New API Key'}
                  </CardTitle>
                  <CardDescription>
                    {newApiKey
                      ? 'Save this key securely. You will not be able to see it again.'
                      : 'Create a new API key for secure access to the Mitobyte API'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {newApiKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm font-medium mb-2">Your API Key:</p>
                        <div className="flex items-center gap-2 font-mono text-xs bg-background px-3 py-2 rounded break-all">
                          <code className="flex-1">{newApiKey.apiKey}</code>
                          <button
                            onClick={() => copyToClipboard(newApiKey.apiKey)}
                            className="text-primary hover:text-primary/80"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Next Steps:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Save this key in a secure location</li>
                          <li>Use it in your API requests as X-API-Key header</li>
                          <li>View the API documentation for endpoint details</li>
                        </ol>
                      </div>
                      <Button
                        onClick={() => {
                          setNewApiKey(null)
                          setShowGenerateModal(false)
                        }}
                        className="w-full"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleGenerateKey} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Key Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.keyName}
                          onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                          placeholder="e.g., Production API Key"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Expires In (Days)
                          </label>
                          <Input
                            type="number"
                            value={formData.expiresInDays}
                            onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                            placeholder="Never"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Rate Limit (per hour)
                          </label>
                          <Input
                            type="number"
                            value={formData.rateLimit}
                            onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
                            placeholder="1000"
                            min="1"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Notes (Optional)
                        </label>
                        <Input
                          type="text"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="e.g., For mobile app integration"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowGenerateModal(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                          <span className="mr-2">✨</span>
                          Generate
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
