import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { motion, AnimatePresence } from 'framer-motion'

export default function SponsorManager({ user }) {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    websiteUrl: '',
    priority: 0,
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchSponsors()
  }, [])

  const fetchSponsors = async () => {
    try {
      const response = await fetch('/api/sponsors?includeInactive=true')
      const data = await response.json()
      if (data.success) {
        setSponsors(data.sponsors)
      }
    } catch (error) {
      console.error('Error fetching sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingSponsor) {
        // Update existing sponsor
        const response = await fetch(`/api/sponsors/${editingSponsor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminEmail: user.email,
            name: formData.name,
            logoUrl: formData.logoUrl,
            websiteUrl: formData.websiteUrl || null,
            priority: parseInt(formData.priority) || 0,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null
          })
        })

        const data = await response.json()
        if (data.success) {
          await fetchSponsors()
          setEditingSponsor(null)
          resetForm()
        } else {
          alert(`Failed to update sponsor: ${data.error}`)
        }
      } else {
        // Create new sponsor
        const response = await fetch('/api/sponsors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminEmail: user.email,
            name: formData.name,
            logoUrl: formData.logoUrl,
            websiteUrl: formData.websiteUrl || null,
            priority: parseInt(formData.priority) || 0,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null
          })
        })

        const data = await response.json()
        if (data.success) {
          await fetchSponsors()
          setShowAddForm(false)
          resetForm()
        } else {
          alert(`Failed to create sponsor: ${data.error}`)
        }
      }
    } catch (error) {
      console.error('Error saving sponsor:', error)
      alert('Failed to save sponsor')
    }
  }

  const handleToggleActive = async (sponsor) => {
    try {
      const response = await fetch(`/api/sponsors/${sponsor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          isActive: !sponsor.is_active
        })
      })

      const data = await response.json()
      if (data.success) {
        await fetchSponsors()
      }
    } catch (error) {
      console.error('Error toggling sponsor:', error)
    }
  }

  const handleDelete = async (sponsorId) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return

    try {
      const response = await fetch(`/api/sponsors/${sponsorId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: user.email })
      })

      const data = await response.json()
      if (data.success) {
        await fetchSponsors()
      }
    } catch (error) {
      console.error('Error deleting sponsor:', error)
    }
  }

  const handleEdit = (sponsor) => {
    setEditingSponsor(sponsor)
    setFormData({
      name: sponsor.name,
      logoUrl: sponsor.logo_url,
      websiteUrl: sponsor.website_url || '',
      priority: sponsor.priority,
      startDate: sponsor.start_date ? sponsor.start_date.split('T')[0] : '',
      endDate: sponsor.end_date ? sponsor.end_date.split('T')[0] : ''
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      logoUrl: '',
      websiteUrl: '',
      priority: 0,
      startDate: '',
      endDate: ''
    })
    setShowAddForm(false)
    setEditingSponsor(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No limit'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      <AnimatePresence mode="wait">
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Sponsor Name *
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Acme Corp"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Logo URL * <span className="text-xs text-muted-foreground">(direct image link)</span>
                    </label>
                    <Input
                      type="url"
                      required
                      placeholder="https://example.com/logo.png"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    />
                    {formData.logoUrl && (
                      <div className="mt-2 p-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                        <img
                          src={formData.logoUrl}
                          alt="Logo preview"
                          className="h-12 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'block'
                          }}
                        />
                        <p className="text-xs text-destructive hidden">Failed to load image</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Website URL <span className="text-xs text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Priority <span className="text-xs text-muted-foreground">(higher = shown first)</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Start Date <span className="text-xs text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        End Date <span className="text-xs text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingSponsor ? 'Update Sponsor' : 'Add Sponsor'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button */}
      {!showAddForm && (
        <Button onClick={() => setShowAddForm(true)} className="w-full">
          + Add New Sponsor
        </Button>
      )}

      {/* Sponsors List */}
      <div className="space-y-3">
        {sponsors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No sponsors yet. Add your first sponsor to get started!
            </CardContent>
          </Card>
        ) : (
          sponsors.map((sponsor) => (
            <Card key={sponsor.id} className={!sponsor.is_active ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0 w-24 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    <div className="hidden items-center justify-center w-full h-full text-xs text-muted-foreground">
                      No Image
                    </div>
                  </div>

                  {/* Sponsor Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{sponsor.name}</h3>
                    {sponsor.website_url && (
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {sponsor.website_url}
                      </a>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-muted rounded-full">
                        Priority: {sponsor.priority}
                      </span>
                      <span className="text-xs px-2 py-1 bg-muted rounded-full">
                        {sponsor.clicks} clicks
                      </span>
                      {sponsor.is_active ? (
                        <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-500/10 text-gray-600 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(sponsor.start_date)} → {formatDate(sponsor.end_date)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(sponsor)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={sponsor.is_active ? 'outline' : 'default'}
                      onClick={() => handleToggleActive(sponsor)}
                    >
                      {sponsor.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(sponsor.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{sponsors.length}</div>
              <div className="text-sm text-muted-foreground">Total Sponsors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {sponsors.filter(s => s.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {sponsors.reduce((sum, s) => sum + s.clicks, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Clicks</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
