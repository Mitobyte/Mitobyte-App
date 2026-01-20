import React, { useState, useEffect } from 'react'
import { exportToCSV, formatDateForCSV } from '../utils/csvExport'

export default function SponsorDashboard({ user, onBack, isInDrawer = false }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedEventId, setExpandedEventId] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [user])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Determine authentication value - use email if logged in with email, otherwise wallet
      const authValue = user.email || user.walletAddress

      console.log('🔍 Sponsor Dashboard Debug:', {
        user: user,
        email: user.email,
        walletAddress: user.walletAddress,
        authValue: authValue,
        authHeader: `Bearer ${authValue}`
      })

      const response = await fetch('/api/sponsor-analytics', {
        headers: {
          'Authorization': `Bearer ${authValue}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error Response:', errorData)
        throw new Error(errorData.error || 'Failed to fetch analytics')
      }

      const data = await response.json()
      console.log('✅ Sponsor Analytics Data Received:', data)
      console.log('📊 Events with form data:', data.events?.map(e => ({
        id: e.id,
        title: e.title,
        hasCheckInForm: !!e.formData?.checkIn,
        checkInResponses: e.formData?.checkIn?.totalResponses || 0,
        checkInFields: e.formData?.checkIn?.fields?.length || 0,
        hasFeedbackForm: !!e.formData?.feedback,
        feedbackResponses: e.formData?.feedback?.totalResponses || 0,
        feedbackFields: e.formData?.feedback?.fields?.length || 0
      })))
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching sponsor analytics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportEvents = () => {
    if (!analytics?.events || analytics.events.length === 0) {
      alert('No event data to export')
      return
    }

    const columns = [
      { key: 'id', label: 'Event ID' },
      { key: 'title', label: 'Title' },
      { key: 'eventType', label: 'Event Type' },
      { key: 'date', label: 'Date' },
      { key: 'location', label: 'Location' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'rsvpCount', label: 'RSVPs' },
      { key: 'checkInCount', label: 'Check-Ins' },
      { key: 'attendanceRate', label: 'Attendance Rate (%)' },
      { key: 'capacityUtilization', label: 'Capacity Utilization (%)' }
    ]

    const formattedData = analytics.events.map(event => ({
      ...event,
      date: formatDateForCSV(event.date)
    }))

    exportToCSV(formattedData, 'sponsor_event_analytics', columns)
  }

  const handleExportSummary = () => {
    if (!analytics?.summary) {
      alert('No summary data to export')
      return
    }

    const columns = [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' }
    ]

    const summaryData = [
      { metric: 'Total Events', value: analytics.summary.totalEvents },
      { metric: 'Upcoming Events', value: analytics.summary.upcomingEvents },
      { metric: 'Past Events', value: analytics.summary.pastEvents },
      { metric: 'Total RSVPs', value: analytics.summary.totalRSVPs },
      { metric: 'Total Check-Ins', value: analytics.summary.totalCheckIns },
      { metric: 'Average RSVPs per Event', value: analytics.summary.avgRSVPsPerEvent },
      { metric: 'Average Check-Ins per Event', value: analytics.summary.avgCheckInsPerEvent },
      { metric: 'Average Attendance Rate', value: `${analytics.summary.avgAttendanceRate}%` }
    ]

    exportToCSV(summaryData, 'sponsor_summary_analytics', columns)
  }

  // Filter and sort events
  const getFilteredAndSortedEvents = () => {
    if (!analytics?.events) return []

    let filtered = analytics.events

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      )
    }

    // Event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.eventType === eventTypeFilter)
    }

    // Date filter
    const now = new Date()
    if (dateFilter === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.date) >= now)
    } else if (dateFilter === 'past') {
      filtered = filtered.filter(event => new Date(event.date) < now)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case 'date':
          aVal = new Date(a.date)
          bVal = new Date(b.date)
          break
        case 'title':
          aVal = a.title?.toLowerCase() || ''
          bVal = b.title?.toLowerCase() || ''
          break
        case 'rsvps':
          aVal = a.rsvpCount
          bVal = b.rsvpCount
          break
        case 'checkins':
          aVal = a.checkInCount
          bVal = b.checkInCount
          break
        case 'attendance':
          aVal = a.attendanceRate
          bVal = b.attendanceRate
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }

  const filteredEvents = getFilteredAndSortedEvents()
  const eventTypes = analytics?.events ? [...new Set(analytics.events.map(e => e.eventType).filter(Boolean))] : []

  if (loading) {
    return (
      <div className={isInDrawer ? "p-4 sm:p-6" : "min-h-screen p-4 sm:p-6 md:p-8"}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={isInDrawer ? "p-4 sm:p-6" : "min-h-screen p-4 sm:p-6 md:p-8"}>
        <div className="text-center py-12">
          <p className="text-red-500">Error: {error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={isInDrawer ? "p-4 sm:p-6" : "min-h-screen p-4 sm:p-6 md:p-8"}>
      {/* Header - Only show when not in drawer */}
      {!isInDrawer && (
        <div className="flex justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
              aria-label="Go back"
            >
              <span className="text-xl">←</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <span>💼</span>
                <span>Sponsor Analytics</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Anonymous event data and insights
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Title - Only show when in drawer */}
      {isInDrawer && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>💼</span>
            <span>Sponsor Analytics</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Anonymous event data and insights
          </p>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Events"
          value={analytics?.summary?.totalEvents || 0}
          icon="🎉"
          subtitle={`${analytics?.summary?.upcomingEvents || 0} upcoming`}
        />
        <StatCard
          title="Total RSVPs"
          value={analytics?.summary?.totalRSVPs || 0}
          icon="✓"
          subtitle={`${analytics?.summary?.avgRSVPsPerEvent || 0} avg per event`}
        />
        <StatCard
          title="Total Check-Ins"
          value={analytics?.summary?.totalCheckIns || 0}
          icon="📍"
          subtitle={`${analytics?.summary?.avgCheckInsPerEvent || 0} avg per event`}
        />
        <StatCard
          title="Attendance Rate"
          value={`${analytics?.summary?.avgAttendanceRate || 0}%`}
          icon="📊"
          subtitle="Average across all events"
        />
      </div>

      {/* Event Type Distribution */}
      {analytics?.eventTypeStats && Object.keys(analytics.eventTypeStats).length > 0 && (
        <div className="mb-8 bg-card border border-border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Event Type Distribution</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(analytics.eventTypeStats).map(([type, stats]) => (
              <div key={type} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="capitalize font-medium">{type}</span>
                    <span className="text-sm text-muted-foreground">
                      ({stats.count} {stats.count === 1 ? 'event' : 'events'})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats.rsvps} RSVPs • {stats.checkIns} Check-ins
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {stats.rsvps > 0 ? Math.round((stats.checkIns / stats.rsvps) * 100) : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">attendance</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Query Controls */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🔍</span>
          <span>Query Events</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Search</label>
            <input
              type="text"
              placeholder="Title, location, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Event Type</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Time Period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="rsvps">RSVPs</option>
                <option value="checkins">Check-ins</option>
                <option value="attendance">Attendance</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-muted-foreground">
          Showing {filteredEvents.length} of {analytics?.events?.length || 0} events
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-xl font-semibold">Event Analytics</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportSummary}
              className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              disabled={!analytics?.summary}
            >
              Export Summary
            </button>
            <button
              onClick={handleExportEvents}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              disabled={!analytics?.events || analytics.events.length === 0}
            >
              Export Events CSV
            </button>
          </div>
        </div>

        {filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Event</th>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-right p-4 font-semibold">RSVPs</th>
                  <th className="text-right p-4 font-semibold">Check-Ins</th>
                  <th className="text-right p-4 font-semibold">Feedback</th>
                  <th className="text-right p-4 font-semibold">Attendance</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <React.Fragment key={event.id}>
                    <tr className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {event.location}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary capitalize">
                          {event.eventType || 'other'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-right font-medium">{event.rsvpCount}</td>
                      <td className="p-4 text-right font-medium">{event.checkInCount}</td>
                      <td className="p-4 text-right font-medium">
                        <span className={event.feedbackCount > 0 ? 'text-primary' : 'text-muted-foreground'}>
                          {event.feedbackCount}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${
                          event.attendanceRate >= 70 ? 'text-green-500' :
                          event.attendanceRate >= 40 ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {event.attendanceRate}%
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                          className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                        >
                          {expandedEventId === event.id ? '▼ Hide' : '▶ Details'}
                        </button>
                      </td>
                    </tr>
                    {expandedEventId === event.id && (
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan="8" className="p-6">
                          <EventDetailView event={event} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            {analytics?.events && analytics.events.length > 0 ? (
              <div>
                <p className="mb-2">No events match your filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setEventTypeFilter('all')
                    setDateFilter('all')
                  }}
                  className="text-primary hover:underline text-sm"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              'No event data available'
            )}
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <h4 className="font-semibold mb-1">Privacy Notice</h4>
            <p className="text-sm text-muted-foreground">
              This dashboard displays anonymous event analytics only. No personal user information (names, emails, wallet addresses) is included in this data to protect attendee privacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, subtitle }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground mb-1">{title}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
  )
}

function FormFieldVisualization({ field }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h5 className="font-medium mb-3">{field.label}</h5>
      <div className="text-xs text-muted-foreground mb-2">
        Type: {field.type} | Responses: {field.totalResponses}
      </div>

      {/* Numeric/Rating fields */}
      {(field.type === 'number' || field.type === 'rating') && field.distribution ? (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm mb-3">
            <span>Avg: <strong>{field.average}</strong></span>
            <span>Min: <strong>{field.min}</strong></span>
            <span>Max: <strong>{field.max}</strong></span>
            <span>Median: <strong>{field.median}</strong></span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(field.distribution)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([value, count]) => {
                const percentage = field.totalResponses > 0 ? Math.round((count / field.totalResponses) * 100) : 0
                return (
                  <div key={value} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-12">{value} {field.type === 'rating' ? '⭐' : ''}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-yellow-500 h-full flex items-center justify-end pr-2 text-xs font-semibold"
                        style={{ width: `${percentage}%` }}
                      >
                        {percentage > 10 ? `${count}` : ''}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      ) : (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && field.responses ? (
        /* Choice fields (select, radio, checkbox) */
        <div className="space-y-1.5">
          {field.responses.map((resp, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                <div
                  className="bg-primary h-full flex items-center px-2 text-xs font-semibold text-white"
                  style={{ width: `${resp.percentage}%` }}
                >
                  {resp.percentage > 15 ? resp.value.substring(0, 30) : ''}
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-20 text-right">
                {resp.count} ({resp.percentage}%)
              </span>
            </div>
          ))}
        </div>
      ) : field.topResponses && field.topResponses.length > 0 ? (
        /* Text fields */
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground mb-2">Top 10 responses:</p>
          {field.topResponses.map((resp, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full flex items-center px-2 text-xs font-semibold text-white"
                  style={{ width: `${resp.percentage}%` }}
                >
                  {resp.percentage > 15 ? resp.value.substring(0, 30) : ''}
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-20 text-right">
                {resp.count} ({resp.percentage}%)
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No response data available</p>
      )}
    </div>
  )
}

function EventDetailView({ event }) {
  return (
    <div className="space-y-6">
      {/* Event Metrics Bar Graph */}
      <div>
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Event Metrics</span>
        </h4>
        <div className="space-y-3">
          {/* RSVP Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">RSVPs</span>
              <span className="text-sm text-muted-foreground">
                {event.rsvpCount} {event.capacity > 0 ? `/ ${event.capacity}` : ''}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
              <div
                className="bg-blue-500 h-full flex items-center justify-end pr-2 text-xs font-semibold text-white"
                style={{ width: `${event.capacity > 0 ? Math.min((event.rsvpCount / event.capacity) * 100, 100) : 50}%` }}
              >
                {event.capacityUtilization > 0 ? `${event.capacityUtilization}%` : ''}
              </div>
            </div>
          </div>

          {/* Check-ins Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Check-ins</span>
              <span className="text-sm text-muted-foreground">
                {event.checkInCount} / {event.rsvpCount}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
              <div
                className="bg-green-500 h-full flex items-center justify-end pr-2 text-xs font-semibold text-white"
                style={{ width: `${event.attendanceRate}%` }}
              >
                {event.attendanceRate > 0 ? `${event.attendanceRate}%` : ''}
              </div>
            </div>
          </div>

          {/* Feedback Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Feedback Responses</span>
              <span className="text-sm text-muted-foreground">
                {event.feedbackCount} / {event.checkInCount}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
              <div
                className="bg-purple-500 h-full flex items-center justify-end pr-2 text-xs font-semibold text-white"
                style={{
                  width: `${event.checkInCount > 0 ? Math.round((event.feedbackCount / event.checkInCount) * 100) : 0}%`
                }}
              >
                {event.checkInCount > 0 ? `${Math.round((event.feedbackCount / event.checkInCount) * 100)}%` : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Form Data */}
      {event.formData?.checkIn && event.formData.checkIn.totalResponses > 0 && (
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <span>📝</span>
            <span>Check-in Form Responses ({event.formData.checkIn.totalResponses} responses)</span>
          </h4>
          <div className="space-y-4">
            {event.formData.checkIn.fields.map((field) => (
              <FormFieldVisualization key={field.id} field={field} />
            ))}
          </div>
        </div>
      )}

      {/* Feedback Form Data */}
      {event.formData?.feedback && event.formData.feedback.totalResponses > 0 && (
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <span>💬</span>
            <span>Feedback Form Responses ({event.formData.feedback.totalResponses} responses)</span>
          </h4>
          <div className="space-y-4">
            {event.formData.feedback.fields.map((field) => (
              <FormFieldVisualization key={field.id} field={field} />
            ))}
          </div>
        </div>
      )}

      {/* No form data message */}
      {(!event.formData?.checkIn || event.formData.checkIn.totalResponses === 0) &&
       (!event.formData?.feedback || event.formData.feedback.totalResponses === 0) && (
        <div className="bg-muted/50 rounded-lg p-4 text-center text-muted-foreground">
          <p>No form responses available for this event</p>
        </div>
      )}

      {/* Additional Event Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Event ID</div>
          <div className="font-medium">{event.id}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Capacity</div>
          <div className="font-medium">{event.capacity || 'Unlimited'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Attendance Rate</div>
          <div className="font-medium">{event.attendanceRate}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Capacity Utilization</div>
          <div className="font-medium">{event.capacity > 0 ? `${event.capacityUtilization}%` : 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}
