import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';

export default function CommunityCheckInsFeed() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const eventTypeInfo = {
    code_and_coffee: { icon: '☕', label: 'Code and Coffee', color: 'bg-amber-500/10 text-amber-600', activeColor: 'bg-amber-500 text-white' },
    code_and_brews: { icon: '🍺', label: 'Code and Brews', color: 'bg-orange-500/10 text-orange-600', activeColor: 'bg-orange-500 text-white' },
    hackathon: { icon: '💻', label: 'Hackathon', color: 'bg-purple-500/10 text-purple-600', activeColor: 'bg-purple-500 text-white' }
  };

  useEffect(() => {
    fetchCheckIns();
  }, []);

  const fetchCheckIns = async (offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/community-checkins?limit=20&offset=${offset}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch check-ins');
      }

      console.log('DEBUG: API Response', data);
      console.log('DEBUG: Checkins', data.checkins);
      data.checkins.forEach((checkin, idx) => {
        console.log(`DEBUG: Checkin ${idx}:`, {
          username: checkin.username,
          walletHash: checkin.walletHash,
          profileVisibility: checkin.profileVisibility,
          avatarUrl: checkin.avatarUrl,
          displayName: checkin.display_name
        });
      });

      if (offset === 0) {
        setCheckins(data.checkins);
      } else {
        setCheckins(prev => [...prev, ...data.checkins]);
      }

      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching check-ins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (pagination?.hasMore) {
      fetchCheckIns(pagination.offset + pagination.limit);
    }
  };

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

  if (loading && checkins.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading community check-ins...</p>
        </div>
      </div>
    );
  }

  if (error && checkins.length === 0) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-destructive mb-1">Error Loading Check-ins</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button onClick={() => fetchCheckIns()} variant="outline" size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold mb-2">No Community Check-ins Yet</h3>
        <p className="text-muted-foreground">
          Check-ins from Code and Coffee and Code and Brews events will appear here.
        </p>
      </div>
    );
  }

  // Filter checkins based on selected filter
  const filteredCheckins = selectedFilter === 'all'
    ? checkins
    : checkins.filter(checkin => checkin.eventType === selectedFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Community Stand-ups</h2>
          <p className="text-sm text-muted-foreground">
            See what the community is working on and where they can help
          </p>
        </div>
        <Button onClick={() => fetchCheckIns(0)} variant="ghost" size="sm">
          🔄
        </Button>
      </div>

      {/* Compact Filter Chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </motion.button>
        {Object.entries(eventTypeInfo).map(([key, info]) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedFilter === key
                ? info.activeColor
                : `${info.color} hover:opacity-80`
            }`}
          >
            <span className="mr-1">{info.icon}</span>
            {info.label}
          </motion.button>
        ))}
      </div>

      {/* No Results Message */}
      {filteredCheckins.length === 0 && checkins.length > 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No check-ins found</h3>
          <p className="text-muted-foreground mb-4">
            No community stand-ups match the selected filter.
          </p>
          <Button onClick={() => setSelectedFilter('all')} variant="outline" size="sm">
            Clear Filter
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {filteredCheckins.map((checkin, index) => {
          const typeInfo = eventTypeInfo[checkin.eventType] || eventTypeInfo.code_and_coffee;

          return (
            <motion.div
              key={checkin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {checkin.avatarUrl ? (
                          <img
                            src={checkin.avatarUrl}
                            alt={checkin.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-lg font-bold">
                            {checkin.profileVisibility === 'private' ? '?' : checkin.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {checkin.walletHash ? (
                            <a
                              href={`/profile?wallet=${checkin.walletHash}`}
                              onClick={(e) => {
                                e.preventDefault();
                                window.history.pushState({}, '', `/profile?wallet=${checkin.walletHash}`);
                                window.location.reload();
                              }}
                              className="font-semibold text-base hover:text-primary transition-colors cursor-pointer"
                            >
                              {checkin.username}
                            </a>
                          ) : (
                            <span className="font-semibold text-base text-muted-foreground">
                              {checkin.username}
                            </span>
                          )}
                          {checkin.totalEventsAttended > 5 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {checkin.totalEventsAttended} events
                            </span>
                          )}
                        </div>
                        {checkin.tagline && (
                          <span className="text-xs text-muted-foreground italic">
                            {checkin.tagline}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(checkin.checkedInAt)}
                          {checkin.location && (
                            <span> • {checkin.location}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                      <span className="mr-1">{typeInfo.icon}</span>
                      {typeInfo.label}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Event Info */}
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>📅</span>
                    <span>{checkin.eventTitle}</span>
                    <span>•</span>
                    <span>{formatDateTime(checkin.eventDate, checkin.eventTime)}</span>
                  </div>

                  {/* Working On */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>💻</span>
                      <span>Working on:</span>
                    </div>
                    <p className="text-sm leading-relaxed pl-6">{checkin.workingOn}</p>
                  </div>

                  {/* Can Help With */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>🤝</span>
                      <span>Can help with:</span>
                    </div>
                    <p className="text-sm leading-relaxed pl-6">{checkin.canHelpWith}</p>
                  </div>

                  {/* Bio and Social Links */}
                  {(checkin.bio || checkin.githubUsername || checkin.twitterUsername || checkin.discordUsername) && (
                    <div className="pt-3 border-t space-y-2">
                      {checkin.bio && (
                        <p className="text-xs text-muted-foreground italic">{checkin.bio}</p>
                      )}
                      {(checkin.githubUsername || checkin.twitterUsername || checkin.discordUsername) && (
                        <div className="flex items-center gap-3 text-xs">
                          {checkin.githubUsername && (
                            <a
                              href={`https://github.com/${checkin.githubUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                              </svg>
                              {checkin.githubUsername}
                            </a>
                          )}
                          {checkin.twitterUsername && (
                            <a
                              href={`https://twitter.com/${checkin.twitterUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                              </svg>
                              @{checkin.twitterUsername}
                            </a>
                          )}
                          {checkin.discordUsername && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                              </svg>
                              {checkin.discordUsername}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Load More Button */}
      {pagination?.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={loadMore}
            variant="outline"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {pagination && (
        <p className="text-center text-sm text-muted-foreground">
          {selectedFilter === 'all' ? (
            `Showing ${checkins.length} of ${pagination.total} check-ins`
          ) : (
            `Showing ${filteredCheckins.length} of ${checkins.length} loaded check-ins`
          )}
        </p>
      )}
    </div>
  );
}
