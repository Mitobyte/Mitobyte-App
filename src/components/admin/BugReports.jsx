import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { exportToCSV, formatDateForCSV } from '../../utils/csvExport'

/**
 * BugReports Admin Component
 * View and manage bug reports submitted by users
 */
export default function BugReports({ adminEmail }) {
  const [bugReports, setBugReports] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [filter, setFilter] = useState('all') // all, open, in_progress, resolved

  useEffect(() => {
    fetchBugReports()
  }, [adminEmail])

  const fetchBugReports = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/bug-reports?adminEmail=${encodeURIComponent(adminEmail)}`)
      const data = await response.json()

      if (data.success) {
        setBugReports(data.bugReports || [])
        setStats(data.stats)
      } else {
        setError(data.error || 'Failed to load bug reports')
      }
    } catch (err) {
      console.error('Error fetching bug reports:', err)
      setError('Failed to load bug reports')
    } finally {
      setLoading(false)
    }
  }

  const updateBugStatus = async (bugReportId, status, priority = null, adminNotes = null) => {
    try {
      const response = await fetch('/api/bug-reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bugReportId,
          adminEmail,
          status,
          priority,
          adminNotes
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh bug reports
        await fetchBugReports()
        setSelectedReport(null)
      } else {
        alert(`Failed to update bug report: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating bug report:', error)
      alert('Failed to update bug report')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { variant: 'destructive', label: 'Open' },
      in_progress: { variant: 'default', label: 'In Progress' },
      resolved: { variant: 'secondary', label: 'Resolved' },
      closed: { variant: 'outline', label: 'Closed' },
      wont_fix: { variant: 'outline', label: "Won't Fix" }
    }

    const config = statusConfig[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      critical: { className: 'bg-red-500 text-white', label: '🔥 Critical' },
      high: { className: 'bg-orange-500 text-white', label: 'High' },
      medium: { className: 'bg-yellow-500 text-black', label: 'Medium' },
      low: { className: 'bg-green-500 text-white', label: 'Low' }
    }

    const config = priorityConfig[priority] || { className: '', label: priority }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const filteredReports = bugReports.filter(report => {
    if (filter === 'all') return true
    return report.status === filter
  })

  const handleExportBugReports = () => {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'user_name', label: 'Reported By Name' },
      { key: 'user_email', label: 'Reported By Email' },
      { key: 'page_url', label: 'Page URL' },
      { key: 'browser_info', label: 'Browser Info' },
      { key: 'admin_notes', label: 'Admin Notes' },
      { key: 'created_at', label: 'Created At' },
      { key: 'resolved_at', label: 'Resolved At' },
      { key: 'resolved_by', label: 'Resolved By' }
    ]

    const formattedData = bugReports.map(report => ({
      ...report,
      created_at: formatDateForCSV(report.created_at),
      resolved_at: formatDateForCSV(report.resolved_at),
      // Don't export base64 screenshot data to CSV
      screenshot_url: report.screenshot_url ? 'Yes' : 'No'
    }))

    exportToCSV(formattedData, 'mitobyte_bug_reports', columns)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading bug reports...</p>
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
            <h3 className="font-semibold text-destructive mb-1">Error Loading Bug Reports</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button
              onClick={fetchBugReports}
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
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{stats.open}</div>
              <p className="text-xs text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExportBugReports}
          variant="outline"
          size="sm"
          disabled={bugReports.length === 0}
        >
          📥 Export CSV
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All', count: stats?.total },
          { id: 'open', label: 'Open', count: stats?.open },
          { id: 'in_progress', label: 'In Progress', count: stats?.inProgress },
          { id: 'resolved', label: 'Resolved', count: stats?.resolved }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={filter === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(tab.id)}
          >
            {tab.label} ({tab.count || 0})
          </Button>
        ))}
      </div>

      {/* Bug Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-muted-foreground">No bug reports in this category</p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <CardTitle className="text-lg">
                          #{report.id} - {report.title}
                        </CardTitle>
                        {getStatusBadge(report.status)}
                        {getPriorityBadge(report.priority)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <strong>Reported by:</strong> {report.user_name || report.user_email || 'Anonymous'}
                          {' '} • {formatDate(report.created_at)}
                        </p>
                        {report.page_url && (
                          <p className="truncate">
                            <strong>Page:</strong> {report.page_url}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                    >
                      {selectedReport?.id === report.id ? 'Hide' : 'View'}
                    </Button>
                  </div>
                </CardHeader>

                {selectedReport?.id === report.id && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {/* Description */}
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                        {report.description}
                      </p>
                    </div>

                    {/* Screenshot */}
                    {report.screenshot_url && (
                      <div>
                        <h4 className="font-semibold mb-2">Screenshot</h4>
                        <div className="bg-muted/50 p-3 rounded-md">
                          <img
                            src={report.screenshot_url}
                            alt="Bug screenshot"
                            className="w-full max-w-2xl rounded-md border border-border"
                            onClick={(e) => {
                              // Open in new tab for full view
                              const win = window.open('', '_blank')
                              win.document.write(`<img src="${report.screenshot_url}" style="max-width:100%;height:auto;" />`)
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Click to view full size"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Click image to view full size
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Browser Info */}
                    {report.browser_info && (
                      <div>
                        <h4 className="font-semibold mb-2">Browser Info</h4>
                        <p className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded-md">
                          {report.browser_info}
                        </p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {report.admin_notes && (
                      <div>
                        <h4 className="font-semibold mb-2">Admin Notes</h4>
                        <p className="text-sm bg-blue-500/10 p-3 rounded-md">
                          {report.admin_notes}
                        </p>
                      </div>
                    )}

                    {/* Resolution Info */}
                    {report.resolved_at && (
                      <div>
                        <h4 className="font-semibold mb-2">Resolution</h4>
                        <p className="text-sm text-muted-foreground">
                          <strong>Resolved by:</strong> {report.resolved_by} <br />
                          <strong>Resolved at:</strong> {formatDate(report.resolved_at)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      <h4 className="w-full font-semibold mb-2">Change Status</h4>
                      {['open', 'in_progress', 'resolved', 'closed', 'wont_fix'].map(status => (
                        <Button
                          key={status}
                          variant={report.status === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateBugStatus(report.id, status)}
                          disabled={report.status === status}
                        >
                          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <h4 className="w-full font-semibold mb-2">Change Priority</h4>
                      {['low', 'medium', 'high', 'critical'].map(priority => (
                        <Button
                          key={priority}
                          variant={report.priority === priority ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateBugStatus(report.id, report.status, priority)}
                          disabled={report.priority === priority}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
