import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import FeedbackViewer from './FeedbackViewer';

export default function EventAnalytics({ event, onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checkins'); // 'checkins' or 'feedback'

  useEffect(() => {
    fetchAnalytics();
  }, [event.id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${event.id}/analytics`);
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      } else {
        console.error('Failed to fetch analytics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load analytics</p>
        <Button onClick={fetchAnalytics} className="mt-4">Retry</Button>
      </div>
    );
  }

  const { checkIns, feedback } = analytics;
  const responseRate = checkIns.total > 0
    ? ((feedback.total / checkIns.total) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'checkins' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('checkins')}
          >
            Check-Ins ({checkIns.total})
          </Button>
          <Button
            variant={activeTab === 'feedback' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('feedback')}
          >
            Feedback ({feedback.total})
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕ Close
        </Button>
      </div>

      {/* Check-Ins Tab */}
      {activeTab === 'checkins' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Check-Ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{checkIns.total}</div>
                {event.capacity && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Capacity</span>
                      <span>{checkIns.total} / {event.capacity}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((checkIns.total / event.capacity) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  QR Code Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {checkIns.byMethod.find(m => m.check_in_method === 'qr_code')?.count || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {checkIns.total > 0
                    ? `${(((checkIns.byMethod.find(m => m.check_in_method === 'qr_code')?.count || 0) / checkIns.total) * 100).toFixed(1)}%`
                    : '0%'} of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Manual Check-Ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {checkIns.byMethod.find(m => m.check_in_method === 'manual')?.count || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {checkIns.total > 0
                    ? `${(((checkIns.byMethod.find(m => m.check_in_method === 'manual')?.count || 0) / checkIns.total) * 100).toFixed(1)}%`
                    : '0%'} of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          {checkIns.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Check-In Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checkIns.timeline.map((item, index) => {
                    const maxCount = Math.max(...checkIns.timeline.map(t => t.count));
                    const percentage = (item.count / maxCount) * 100;

                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground w-32 flex-shrink-0">
                          {new Date(item.hour).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            hour12: true
                          })}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-6 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: index * 0.05 }}
                              className="bg-primary h-full rounded-full flex items-center justify-end px-2"
                            >
                              <span className="text-xs text-primary-foreground font-medium">
                                {item.count}
                              </span>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Check-Ins */}
          {checkIns.recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-Ins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checkIns.recent.map((checkIn, index) => (
                    <motion.div
                      key={checkIn.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {checkIn.display_name || checkIn.email || 'Anonymous'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(checkIn.checked_in_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          checkIn.check_in_method === 'qr_code'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-green-500/10 text-green-600 dark:text-green-400'
                        }`}>
                          {checkIn.check_in_method === 'qr_code' ? '📱 QR' : '✍️ Manual'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <FeedbackViewer
          feedback={feedback}
          checkInsTotal={checkIns.total}
        />
      )}
    </div>
  );
}
