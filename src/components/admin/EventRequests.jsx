import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { getAllEventRequests, approveEventRequest, rejectEventRequest, deleteEventRequest } from '../../services/eventRequestsApi'

/**
 * EventRequests Component
 * Admin interface for reviewing and managing user-submitted event requests
 */
export default function EventRequests({ adminEmail }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [filterStatus])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllEventRequests({ status: filterStatus })
      setRequests(data.requests || [])
    } catch (err) {
      console.error('Failed to fetch event requests:', err)
      setError(err.message || 'Failed to load event requests')
    } finally {
      setLoading(false)
    }
  }

  // Filter requests by search
  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests

    const term = searchTerm.toLowerCase()
    return requests.filter(req =>
      req.title?.toLowerCase().includes(term) ||
      req.description?.toLowerCase().includes(term) ||
      req.requested_by?.toLowerCase().includes(term) ||
      req.location?.toLowerCase().includes(term)
    )
  }, [requests, searchTerm])

  const handleApprove = async (request) => {
    const confirmed = window.confirm(
      `Approve event "${request.title}"?\n\nThis will create the event and notify the requester.`
    )
    if (!confirmed) return

    try {
      await approveEventRequest(request.id)
      await fetchRequests()
      alert('Event request approved and event created!')
    } catch (err) {
      console.error('Failed to approve request:', err)
      alert(`Failed to approve request: ${err.message}`)
    }
  }

  const handleReject = (request) => {
    setSelectedRequest(request)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleRejectConfirm = async () => {
    if (!selectedRequest) return

    try {
      await rejectEventRequest(selectedRequest.id, rejectReason)
      setShowRejectModal(false)
      setSelectedRequest(null)
      setRejectReason('')
      await fetchRequests()
      alert('Event request rejected')
    } catch (err) {
      console.error('Failed to reject request:', err)
      alert(`Failed to reject request: ${err.message}`)
    }
  }

  const handleDelete = async (requestId) => {
    const confirmed = window.confirm(
      'Delete this event request permanently?\n\nThis action cannot be undone.'
    )
    if (!confirmed) return

    try {
      await deleteEventRequest(requestId)
      setRequests(prev => prev.filter(r => r.id !== requestId))
      alert('Event request deleted')
    } catch (err) {
      console.error('Failed to delete request:', err)
      alert(`Failed to delete request: ${err.message}`)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getEventTypeIcon = (type) => {
    const icons = {
      'code_and_coffee': '☕',
      'code_and_brews': '🍺',
      'hackathon': '💻',
      'workshop': '🎓',
      'meetup': '🤝'
    }
    return icons[type] || '📅'
  }

  const getEventTypeLabel = (type) => {
    const labels = {
      'code_and_coffee': 'Code & Coffee',
      'code_and_brews': 'Code & Brews',
      'hackathon': 'Hackathon',
      'workshop': 'Workshop',
      'meetup': 'Meetup'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-600">Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-600">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading event requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-destructive/10 border border-destructive/20 rounded-lg p-6"
      >
        <div className="flex items-start space-x-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-destructive mb-1">Error Loading Requests</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button
              onClick={fetchRequests}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Event Requests</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve user-submitted event requests
          </p>
        </div>
        <Button onClick={fetchRequests} variant="outline">
          <span className="mr-2">🔄</span>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <Input
            type="text"
            placeholder="🔍 Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="pending">⏳ Pending Only</option>
            <option value="approved">✅ Approved Only</option>
            <option value="rejected">❌ Rejected Only</option>
            <option value="all">All Requests</option>
          </select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {requests.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {requests.filter(r => r.status === 'approved').length}
          </div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {requests.filter(r => r.status === 'rejected').length}
          </div>
          <div className="text-sm text-muted-foreground">Rejected</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{filteredRequests.length}</div>
          <div className="text-sm text-muted-foreground">Showing</div>
        </Card>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-4">📋</div>
            <p>
              {searchTerm
                ? 'No requests found matching your search'
                : filterStatus === 'pending'
                ? 'No pending event requests'
                : `No ${filterStatus} requests`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 sm:p-6 hover:border-primary/50 transition-colors">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  {/* Request Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl flex-shrink-0">
                        {getEventTypeIcon(request.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold truncate">{request.title}</h3>
                          {getStatusBadge(request.status)}
                          <Badge variant="outline">
                            {getEventTypeLabel(request.event_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {request.description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>📅 {formatDate(request.date)}</span>
                          <span>🕒 {request.time}</span>
                          <span>📍 {request.location}</span>
                          {request.expected_attendees && (
                            <span>👥 ~{request.expected_attendees} attendees</span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span>Requested by: {request.requested_by}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                        {request.admin_notes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <strong>Admin Notes:</strong> {request.admin_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 flex-shrink-0">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleApprove(request)}
                          className="bg-green-600 hover:bg-green-700 flex-1 lg:flex-none"
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request)}
                          variant="outline"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950 flex-1 lg:flex-none"
                        >
                          ✗ Reject
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => handleDelete(request.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2">Reject Event Request</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Rejecting: <strong>{selectedRequest.title}</strong>
                </p>
                <label className="block text-sm font-medium mb-2">
                  Reason for rejection (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Let the user know why their event was rejected..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRejectConfirm}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Reject Request
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
