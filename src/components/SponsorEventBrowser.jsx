import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

/**
 * SponsorEventBrowser Component
 * Allows sponsors to browse and sponsor events
 */
export default function SponsorEventBrowser({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTime, setFilterTime] = useState('upcoming');
  const [sponsoringEvent, setSponsoringEvent] = useState(null);
  const [sponsorForm, setSponsorForm] = useState({
    sponsorName: '',
    logoUrl: '',
    websiteUrl: '',
    tier: 'standard'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      const data = await response.json();

      if (data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleSponsorEvent = async (eventId) => {
    if (!sponsorForm.sponsorName || !sponsorForm.logoUrl) {
      alert('Please provide sponsor name and logo URL');
      return;
    }

    try {
      const response = await fetch('/api/event-sponsorships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sponsorEmail: user.email,
          eventId,
          sponsorName: sponsorForm.sponsorName,
          logoUrl: sponsorForm.logoUrl,
          websiteUrl: sponsorForm.websiteUrl,
          tier: sponsorForm.tier
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Successfully sponsored event!');
        setSponsoringEvent(null);
        setSponsorForm({
          sponsorName: '',
          logoUrl: '',
          websiteUrl: '',
          tier: 'standard'
        });
      } else {
        alert(data.error || 'Failed to sponsor event');
      }
    } catch (err) {
      console.error('Error sponsoring event:', err);
      alert('Failed to sponsor event');
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchTerm ||
      event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const matchesTime = filterTime === 'all' ||
      (filterTime === 'upcoming' && new Date(event.date) >= now) ||
      (filterTime === 'past' && new Date(event.date) < now);

    return matchesSearch && matchesTime;
  });

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <Button onClick={fetchEvents}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Events to Sponsor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="🔍 Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="upcoming">Upcoming Events</option>
              <option value="past">Past Events</option>
              <option value="all">All Events</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Showing {filteredEvents.length} of {events.length} events
          </p>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <Card key={event.id}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Event Thumbnail */}
                {event.thumbnail_url && (
                  <div className="w-full md:w-48 h-32 flex-shrink-0">
                    <img
                      src={event.thumbnail_url}
                      alt={event.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Event Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          {event.event_type?.replace('_', ' ')}
                        </Badge>
                        {new Date(event.date) >= new Date() ? (
                          <Badge className="bg-green-600">Upcoming</Badge>
                        ) : (
                          <Badge variant="outline">Past</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>📅 {formatDate(event.date)} • 🕒 {event.time}</p>
                        <p>📍 {event.location}</p>
                      </div>
                      {event.description && (
                        <p className="text-sm mt-2 line-clamp-2">{event.description}</p>
                      )}
                    </div>

                    {/* Sponsor Button */}
                    <div>
                      {sponsoringEvent === event.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSponsoringEvent(null)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setSponsoringEvent(event.id)}
                        >
                          💼 Sponsor This Event
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sponsorship Form */}
                  {sponsoringEvent === event.id && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="font-semibold mb-3">Sponsorship Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Sponsor Name *
                          </label>
                          <Input
                            type="text"
                            placeholder="Your Company Name"
                            value={sponsorForm.sponsorName}
                            onChange={(e) => setSponsorForm({
                              ...sponsorForm,
                              sponsorName: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Logo URL *
                          </label>
                          <Input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={sponsorForm.logoUrl}
                            onChange={(e) => setSponsorForm({
                              ...sponsorForm,
                              logoUrl: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Website URL (optional)
                          </label>
                          <Input
                            type="url"
                            placeholder="https://yourcompany.com"
                            value={sponsorForm.websiteUrl}
                            onChange={(e) => setSponsorForm({
                              ...sponsorForm,
                              websiteUrl: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Sponsorship Tier
                          </label>
                          <select
                            value={sponsorForm.tier}
                            onChange={(e) => setSponsorForm({
                              ...sponsorForm,
                              tier: e.target.value
                            })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="platinum">Platinum</option>
                          </select>
                        </div>
                      </div>

                      {/* Logo Preview */}
                      {sponsorForm.logoUrl && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Logo Preview:</p>
                          <img
                            src={sponsorForm.logoUrl}
                            alt="Logo preview"
                            className="h-16 object-contain bg-muted rounded p-2"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleSponsorEvent(event.id)}
                          disabled={!sponsorForm.sponsorName || !sponsorForm.logoUrl}
                        >
                          Confirm Sponsorship
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSponsoringEvent(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredEvents.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No events match your filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
