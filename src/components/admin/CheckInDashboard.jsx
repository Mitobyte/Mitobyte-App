import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { exportToCSV, formatDateForCSV } from '../../utils/csvExport';

export default function CheckInDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const eventTypeInfo = {
    code_and_coffee: { icon: '☕', label: 'Code and Coffee', color: 'bg-amber-500' },
    code_and_brews: { icon: '🍺', label: 'Code and Brews', color: 'bg-orange-500' },
    hackathon: { icon: '💻', label: 'Hackathon', color: 'bg-purple-500' }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/checkin-stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data);
    } catch (err) {
      console.error('Error fetching check-in stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCheckIns = () => {
    if (!stats || !stats.recentCheckIns || stats.recentCheckIns.length === 0) {
      alert('No check-in data to export');
      return;
    }

    const columns = [
      { key: 'event_title', label: 'Event Title' },
      { key: 'event_type', label: 'Event Type' },
      { key: 'event_date', label: 'Event Date' },
      { key: 'event_time', label: 'Event Time' },
      { key: 'user_email', label: 'User Email' },
      { key: 'user_name', label: 'User Name' },
      { key: 'check_in_time', label: 'Check-In Time' }
    ]

    const formattedData = stats.recentCheckIns.map(checkin => ({
      ...checkin,
      check_in_time: formatDateForCSV(checkin.check_in_time)
    }))

    exportToCSV(formattedData, 'mitobyte_checkins', columns)
  }

  const formatDateTime = (dateStr, timeStr) => {
    const date = new Date(dateStr + 'T' + timeStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading check-in statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-destructive mb-1">Error Loading Statistics</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button onClick={fetchStats} variant="outline" size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Check-In Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Analytics and statistics for community check-ins
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCheckIns} variant="outline" size="sm" disabled={!stats || !stats.recentCheckIns || stats.recentCheckIns.length === 0}>
            📥 Export CSV
          </Button>
          <Button onClick={fetchStats} variant="ghost" size="sm">
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Total Check-Ins</div>
              <div className="text-3xl font-bold">{stats.totalCheckIns}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Unique Users</div>
              <div className="text-3xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Last 30 Days</div>
              <div className="text-3xl font-bold">{stats.checkInsLast30Days}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Avg per User</div>
              <div className="text-3xl font-bold">
                {stats.uniqueUsers > 0 ? (stats.totalCheckIns / stats.uniqueUsers).toFixed(1) : 0}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Check-ins by Event Type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Check-Ins by Event Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.checkInsByType.map((type, index) => {
                const typeInfo = eventTypeInfo[type.event_type] || eventTypeInfo.code_and_coffee;
                const percentage = stats.totalCheckIns > 0 ? (type.count / stats.totalCheckIns * 100).toFixed(1) : 0;

                return (
                  <div key={type.event_type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeInfo.icon}</span>
                        <span className="font-medium">{typeInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{percentage}%</span>
                        <span className="font-semibold">{type.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                        className={`h-full ${typeInfo.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity and Most Active Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Active Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Most Active Users</CardTitle>
              <CardDescription>Top contributors to community check-ins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.mostActiveUsers.map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{user.display_name}</div>
                        {user.email && (
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary">{user.checkin_count}</div>
                  </div>
                ))}

                {stats.mostActiveUsers.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    No check-ins yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Check-Ins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-Ins</CardTitle>
              <CardDescription>Latest community stand-ups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {stats.recentCheckIns.map((checkin) => {
                  const typeInfo = eventTypeInfo[checkin.event_type] || eventTypeInfo.code_and_coffee;

                  return (
                    <div
                      key={checkin.id}
                      className="p-3 border border-border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{checkin.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatRelativeTime(checkin.checked_in_at)}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${typeInfo.color} text-white`}>
                          {typeInfo.icon} {typeInfo.label}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Working on:</div>
                        <div className="line-clamp-2">{checkin.working_on}</div>
                      </div>
                    </div>
                  );
                })}

                {stats.recentCheckIns.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    No recent check-ins
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Daily Check-Ins (Last 7 Days) */}
      {stats.dailyCheckIns && stats.dailyCheckIns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Daily Check-Ins (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.dailyCheckIns.map((day, index) => {
                  const maxCount = Math.max(...stats.dailyCheckIns.map(d => d.count));
                  const percentage = maxCount > 0 ? (day.count / maxCount * 100) : 0;

                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="font-semibold">{day.count} check-ins</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.9 + index * 0.05, duration: 0.3 }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
