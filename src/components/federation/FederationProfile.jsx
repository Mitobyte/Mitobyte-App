import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function FederationProfile({ userEmail }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [userEmail]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/federation/stats?userEmail=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error('Failed to fetch federation stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">Loading federation profile...</div>
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

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Fediverse Profile</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Followers" value={stats.stats.followers} />
          <StatCard label="Following" value={stats.stats.following} />
          <StatCard label="Posts" value={stats.stats.posts} />
          <StatCard label="Likes" value={stats.stats.likes} />
        </div>
      </Card>

      {/* Recent Followers */}
      {stats.followers && stats.followers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Followers</h3>
          <div className="space-y-3">
            {stats.followers.map((follower, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{follower.follower_name || follower.follower_handle}</div>
                  <div className="text-sm text-gray-500">@{follower.follower_handle}</div>
                </div>
                <Badge variant="secondary">
                  {new Date(follower.accepted_at).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Following */}
      {stats.following && stats.following.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Following</h3>
          <div className="space-y-3">
            {stats.following.map((following, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{following.following_name || following.following_handle}</div>
                  <div className="text-sm text-gray-500">@{following.following_handle}</div>
                </div>
                <Badge variant="secondary">
                  {new Date(following.accepted_at).toLocaleDateString()}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activities */}
      {stats.recentActivities && stats.recentActivities.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {stats.recentActivities.map((activity, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">
                  {new Date(activity.published_at).toLocaleString()}
                </div>
                <div className="text-gray-800">{activity.content}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
      <div className="text-3xl font-bold text-purple-600">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}
