import { useState, useEffect } from 'react';
import { Card } from '../ui/card';

export function FediverseToggle({ userEmail }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [userEmail]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/federation/toggle-publishing?userEmail=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setEnabled(data.enabled);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/federation/toggle-publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, enabled: !enabled })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update settings');
      }

      setEnabled(!enabled);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Publish Votes to Fediverse</h3>
          <p className="text-sm text-gray-500 mt-1">
            Share your votes with followers on Mastodon, Pleroma, and other ActivityPub platforms
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${enabled ? 'bg-purple-600' : 'bg-gray-300'}
            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${enabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </Card>
  );
}
