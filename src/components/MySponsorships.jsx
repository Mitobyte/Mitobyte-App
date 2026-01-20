import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

/**
 * MySponsorships Component
 * Shows the sponsor's current event sponsorships
 */
export default function MySponsorships({ user }) {
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSponsorships();
  }, [user]);

  const fetchSponsorships = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/event-sponsorships?sponsorEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();

      if (data.success) {
        setSponsorships(data.sponsorships || []);
      } else {
        setError(data.error || 'Failed to load sponsorships');
      }
    } catch (err) {
      console.error('Error fetching sponsorships:', err);
      setError('Failed to load sponsorships');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSponsorship = async (sponsorshipId) => {
    if (!confirm('Are you sure you want to remove this sponsorship?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/event-sponsorships?id=${sponsorshipId}&sponsorEmail=${encodeURIComponent(user.email)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        alert('Sponsorship removed successfully');
        fetchSponsorships();
      } else {
        alert(data.error || 'Failed to remove sponsorship');
      }
    } catch (err) {
      console.error('Error removing sponsorship:', err);
      alert('Failed to remove sponsorship');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'platinum': return 'bg-purple-500 text-white';
      case 'premium': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchSponsorships}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Event Sponsorships</CardTitle>
            <Badge variant="secondary">{sponsorships.length} Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {sponsorships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">You haven't sponsored any events yet</p>
              <p className="text-sm">Browse events to start sponsoring!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sponsorships.map((sponsorship) => (
                <div
                  key={sponsorship.id}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Sponsor Logo */}
                    <div className="w-full md:w-32 h-24 flex-shrink-0">
                      <img
                        src={sponsorship.sponsor_logo_url}
                        alt={sponsorship.sponsor_name}
                        className="w-full h-full object-contain bg-muted rounded p-2"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {sponsorship.event_title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={getTierColor(sponsorship.tier)}>
                              {sponsorship.tier.toUpperCase()}
                            </Badge>
                            <Badge variant="secondary">
                              {sponsorship.event_type?.replace('_', ' ')}
                            </Badge>
                            {sponsorship.is_approved ? (
                              <Badge className="bg-green-600">Approved</Badge>
                            ) : (
                              <Badge variant="outline">Pending Approval</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>📅 {formatDate(sponsorship.event_date)}</p>
                            <p>📍 {sponsorship.event_location}</p>
                            <p>💼 {sponsorship.sponsor_name}</p>
                            {sponsorship.sponsor_website_url && (
                              <p>
                                🌐{' '}
                                <a
                                  href={sponsorship.sponsor_website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {sponsorship.sponsor_website_url}
                                </a>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Event Thumbnail */}
                        {sponsorship.event_thumbnail && (
                          <div className="w-24 h-24 flex-shrink-0">
                            <img
                              src={sponsorship.event_thumbnail}
                              alt={sponsorship.event_title}
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveSponsorship(sponsorship.id)}
                        >
                          🗑️ Remove Sponsorship
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="font-semibold mb-1">Sponsorship Tiers</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong className="text-purple-500">Platinum:</strong> Largest logo placement, premium positioning</p>
                <p><strong className="text-yellow-500">Premium:</strong> Featured logo, prominent display</p>
                <p><strong className="text-blue-500">Standard:</strong> Standard logo placement</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
