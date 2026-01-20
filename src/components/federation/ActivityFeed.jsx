import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

export function ActivityFeed({ userEmail, limit = 20 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, [userEmail]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/federation/stats?userEmail=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data.recentActivities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">Loading activity feed...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">Error: {error}</div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          No activities yet. Start voting and sharing to build your fediverse presence!
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Activity Feed</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <ActivityItem key={index} activity={activity} />
        ))}
      </div>
    </Card>
  );
}

function ActivityItem({ activity }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'Create':
        return '📝';
      case 'Like':
        return '❤️';
      case 'Announce':
        return '🔄';
      default:
        return '📌';
    }
  };

  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="text-2xl flex-shrink-0">
        {getActivityIcon(activity.activity_type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs">
            {activity.activity_type}
          </Badge>
          <span className="text-sm text-gray-500">
            {new Date(activity.published_at).toLocaleString()}
          </span>
        </div>
        <p className="text-gray-800">{activity.content}</p>
        {activity.vote_id && (
          <div className="mt-2 text-xs text-gray-500">
            Related to vote #{activity.vote_id}
          </div>
        )}
      </div>
    </div>
  );
}
