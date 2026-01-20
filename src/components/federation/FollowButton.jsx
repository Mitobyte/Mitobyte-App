import { useState } from 'react';
import { Button } from '../ui/button';

export function FollowButton({ userEmail, actorUri, actorHandle, initialFollowing = false }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFollow = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = following ? '/api/federation/unfollow' : '/api/federation/follow';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, actorUri })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update follow status');
      }

      setFollowing(!following);
    } catch (err) {
      setError(err.message);
      console.error('Follow error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleFollow}
        disabled={loading}
        variant={following ? 'outline' : 'default'}
        className="w-full sm:w-auto"
      >
        {loading ? 'Processing...' : following ? 'Unfollow' : 'Follow'}
      </Button>
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
}
