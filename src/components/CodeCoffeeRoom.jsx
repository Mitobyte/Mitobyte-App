import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';

export default function CodeCoffeeRoom({ event, walletAddress, onBack }) {
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('gallery');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchRoomData();
  }, [event.id, walletAddress, refreshKey]);

  const fetchRoomData = async () => {
    try {
      setLoading(true);
      const url = `/api/code-coffee-room?eventId=${event.id}${walletAddress ? `&walletAddress=${encodeURIComponent(walletAddress)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load room data');
      }

      setRoomData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching room data:', err);
      setError(err.message);
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

  if (error && !roomData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold mb-2">Error Loading Room</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => setRefreshKey(prev => prev + 1)} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const eventTypeIcon = event.event_type === 'code_and_coffee' ? '☕' : '🍺';
  const eventTypeLabel = event.event_type === 'code_and_coffee' ? 'Code & Coffee' : 'Code & Brews';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onBack && (
        <Button onClick={onBack} variant="ghost" size="sm">
          ← Back to Events
        </Button>
      )}

      {/* Room Header */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardHeader>
          <div className="flex items-start gap-3 sm:gap-4">
            {roomData.event.thumbnailUrl ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-amber-500/30">
                <img
                  src={roomData.event.thumbnailUrl}
                  alt={roomData.event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="text-4xl sm:text-5xl flex-shrink-0">{eventTypeIcon}</div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2">{roomData.event.title}</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {roomData.event.description}
              </CardDescription>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{roomData.event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>{roomData.event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{roomData.event.location}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>{roomData.stats.totalAttendees} Attendees</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>{roomData.stats.totalCheckIns} Checked In</span>
                </div>
                {roomData.stats.totalAttendees > 0 && (
                  <div className="flex items-center gap-2">
                    <span>📊</span>
                    <span>{roomData.stats.attendanceRate}% Attendance</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
            activeTab === 'gallery'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          💬 Standup Gallery
        </button>
        <button
          onClick={() => setActiveTab('attendees')}
          className={`px-4 py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
            activeTab === 'attendees'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          👥 Attendees
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-3 font-medium text-sm sm:text-base transition-colors whitespace-nowrap ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📋 Event Details
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Standup Gallery ({roomData.checkIns.length})</CardTitle>
                <CardDescription>
                  See what everyone's working on and how they can help
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roomData.checkIns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No one has checked in yet. Be the first!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roomData.checkIns.map((checkIn) => (
                      <motion.div
                        key={checkIn.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-lg bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                      >
                        {/* User Info */}
                        <div className="flex items-start gap-3 mb-3 pb-3 border-b border-border">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                            {checkIn.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{checkIn.displayName}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(checkIn.checkInTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Standup Responses */}
                        <div className="space-y-3">
                          {/* Working On */}
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <span>💻</span>
                              <span>Working On</span>
                            </div>
                            <p className="text-sm">{checkIn.workingOn}</p>
                          </div>

                          {/* Can Help With */}
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <span>🤝</span>
                              <span>Can Help With</span>
                            </div>
                            <p className="text-sm">{checkIn.canHelpWith}</p>
                          </div>

                          {/* Need Help With */}
                          {checkIn.needHelpWith && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <span>🆘</span>
                                <span>Need Help With</span>
                              </div>
                              <p className="text-sm">{checkIn.needHelpWith}</p>
                            </div>
                          )}
                        </div>

                        {/* AI Verified Badge */}
                        {checkIn.confidenceScore && checkIn.confidenceScore > 0.7 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                              ✓ AI Verified
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'attendees' && (
          <motion.div
            key="attendees"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Attendees ({roomData.attendees.length})</CardTitle>
                <CardDescription>
                  People who RSVP'd to this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roomData.attendees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendees yet
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roomData.attendees.map((attendee, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-muted/30 border border-border"
                      >
                        <div className="font-medium">{attendee.displayName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>
                  Information about this {eventTypeLabel} event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Event Type</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{eventTypeIcon}</span>
                    <span className="font-semibold">{eventTypeLabel}</span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Title</div>
                  <div className="font-semibold">{roomData.event.title}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                  <p className="text-sm">{roomData.event.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Date</div>
                    <div className="text-sm font-semibold">📅 {roomData.event.date}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Time</div>
                    <div className="text-sm font-semibold">🕐 {roomData.event.time}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Location</div>
                  <div className="text-sm font-semibold">📍 {roomData.event.location}</div>
                </div>

                {roomData.event.capacity && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Capacity</div>
                    <div className="text-sm font-semibold">{roomData.event.capacity} people</div>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Your Status</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className={roomData.userHasRSVP ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {roomData.userHasRSVP ? '✅' : '❌'}
                      </span>
                      <span className="text-sm">
                        {roomData.userHasRSVP ? 'RSVP Confirmed' : 'Not RSVP\'d'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={roomData.userHasCheckedIn ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {roomData.userHasCheckedIn ? '✅' : '❌'}
                      </span>
                      <span className="text-sm">
                        {roomData.userHasCheckedIn ? 'Checked In' : 'Not Checked In'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
