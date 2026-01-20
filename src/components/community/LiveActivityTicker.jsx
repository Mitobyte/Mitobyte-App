import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function LiveActivityTicker() {
  const [activities, setActivities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchRecentActivity();
    const interval = setInterval(fetchRecentActivity, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activities.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activities.length);
      }, 5000); // Rotate every 5 seconds
      return () => clearInterval(interval);
    }
  }, [activities.length]);

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/community/recent-activity');
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  };

  if (activities.length === 0) {
    return null;
  }

  const currentActivity = activities[currentIndex];

  const getActivityIcon = (type) => {
    const icons = {
      'check_in': '✅',
      'badge_earned': '🏅',
      'project_launched': '🚀',
      'connection_made': '🤝',
      'event_joined': '🎉',
      'post_created': '💬'
    };
    return icons[type] || '📢';
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            🔴 LIVE:
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 min-w-0"
            >
              <span className="text-lg">{getActivityIcon(currentActivity.type)}</span>
              <p className="text-sm truncate">
                <span className="font-medium">{currentActivity.user_name}</span>
                {' '}
                {currentActivity.action}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Activity Indicator Dots */}
        {activities.length > 1 && (
          <div className="flex gap-1">
            {activities.slice(0, 5).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  index === currentIndex ? 'bg-primary w-3' : 'bg-primary/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
