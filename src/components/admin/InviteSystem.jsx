import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { Input } from '../ui/input'

export default function InviteSystem({ adminEmail }) {
  const [inviteOnly, setInviteOnly] = useState(false)
  const [inviteCodes, setInviteCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [maxUses, setMaxUses] = useState(1)
  const [expiresInDays, setExpiresInDays] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    fetchSettings()
    fetchInviteCodes()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/platform-settings')
      const data = await response.json()
      if (data.success) {
        setInviteOnly(data.settings.invite_only === 'true')
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const fetchInviteCodes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invite-codes?adminEmail=${encodeURIComponent(adminEmail)}`)
      const data = await response.json()
      if (data.success) {
        setInviteCodes(data.inviteCodes)
      }
    } catch (err) {
      console.error('Failed to fetch invite codes:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleInviteOnly = async () => {
    try {
      setError(null)
      const newValue = !inviteOnly

      const response = await fetch('/api/platform-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          settingKey: 'invite_only',
          settingValue: newValue.toString()
        })
      })

      const data = await response.json()
      if (data.success) {
        setInviteOnly(newValue)
        setSuccessMessage(`Platform is now ${newValue ? 'INVITE-ONLY' : 'OPEN for registration'}`)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to toggle invite-only:', err)
      setError(err.message)
    }
  }

  const generateCode = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          action: 'generate',
          maxUses: parseInt(maxUses) || 1,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
          notes: notes.trim() || null
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(`Generated code: ${data.code}`)
        setMaxUses(1)
        setExpiresInDays('')
        setNotes('')
        await fetchInviteCodes()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to generate code:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const deactivateCode = async (code) => {
    if (!confirm(`Deactivate invite code ${code}?`)) return

    try {
      const response = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          action: 'deactivate',
          code
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(`Code ${code} deactivated`)
        await fetchInviteCodes()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to deactivate code:', err)
      setError(err.message)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setSuccessMessage(`Copied ${code} to clipboard`)
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

  return (
    <div className="space-y-6">
      {/* Invite-Only Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              Invite-Only Mode
            </CardTitle>
            <CardDescription>
              Control who can register for the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div>
                <h3 className="font-semibold mb-1">
                  Platform Access: {inviteOnly ? '🔐 INVITE-ONLY' : '🌍 OPEN'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {inviteOnly
                    ? 'Users need a valid invite code to register'
                    : 'Anyone can register without restrictions'}
                </p>
              </div>
              <Button
                onClick={toggleInviteOnly}
                variant={inviteOnly ? 'destructive' : 'default'}
                size="lg"
              >
                {inviteOnly ? 'Disable Invite-Only' : 'Enable Invite-Only'}
              </Button>
            </div>

            {error && (
              <div className="mt-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">
                {successMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Generate Invite Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎫</span>
              Generate Invite Code
            </CardTitle>
            <CardDescription>
              Create new invite codes for users to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Uses
                </label>
                <Input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How many people can use this code
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Expires In (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="Never"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for no expiration
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., For beta testers, Event attendees, etc."
                maxLength={100}
              />
            </div>

            <Button
              onClick={generateCode}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="mr-2">✨</span>
                  Generate Invite Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Invite Codes List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4">Active Invite Codes</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">🎫</div>
              <p className="text-muted-foreground">Loading invite codes...</p>
            </div>
          </div>
        ) : inviteCodes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-muted-foreground">No invite codes yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate your first invite code above
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {inviteCodes.map((code, index) => (
                <motion.div
                  key={code.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={!code.is_active ? 'opacity-50' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <code className="text-2xl font-bold tracking-wider bg-primary/10 px-3 py-1 rounded">
                              {code.code}
                            </code>
                            {!code.is_active && (
                              <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">
                                Deactivated
                              </span>
                            )}
                            {code.uses_remaining === 0 && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                Fully Used
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Uses</p>
                              <p className="font-medium">{code.total_uses} / {code.max_uses}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Remaining</p>
                              <p className="font-medium">{code.uses_remaining}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Expires</p>
                              <p className="font-medium text-xs">{formatDate(code.expires_at)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Created</p>
                              <p className="font-medium text-xs">{formatDate(code.created_at)}</p>
                            </div>
                          </div>

                          {code.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              📝 {code.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCode(code.code)}
                          >
                            📋 Copy
                          </Button>
                          {code.is_active && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivateCode(code.code)}
                            >
                              🚫 Deactivate
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}
