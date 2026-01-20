import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';

export default function EventCheckIns({ eventId, userWalletHash }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (eventId && userWalletHash) {
      fetchCheckIns();
    }
  }, [eventId, userWalletHash]);

  const fetchCheckIns = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/checkins?eventId=${eventId}&userWalletHash=${userWalletHash}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch check-ins');
      }

      setData(result);
    } catch (err) {
      console.error('Error fetching check-ins:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCheckIn = async (checkInId) => {
    if (!confirm('Are you sure you want to remove this check-in?')) {
      return;
    }

    try {
      setRemovingId(checkInId);

      const response = await fetch(`/api/admin/checkins/${checkInId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userWalletHash }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove check-in');
      }

      // Refresh the list
      await fetchCheckIns();
    } catch (err) {
      console.error('Error removing check-in:', err);
      alert(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.checkins.length) return;

    const csv = [
      ['Username', 'Wallet Hash', 'Email', 'Check-in Time', 'Method', 'Device Info'],
      ...data.checkins.map(c => [
        c.username,
        c.userWalletHash,
        c.email || 'N/A',
        new Date(c.checkedInAt).toLocaleString(),
        c.checkInMethod,
        c.deviceInfo || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.event.title.replace(/\s+/g, '-')}-checkins.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading check-ins...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchCheckIns} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { event, checkins, stats } = data;

  return (
    <div className="space-y-4">
      {/* Event Info & Stats */}
      <Card>
        <CardHeader>
          <CardTitle>{event.title} - Check-ins</CardTitle>
          <CardDescription>
            {event.date} at {event.time} • {event.location}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Check-ins</p>
              <p className="text-2xl font-bold">{stats.totalCheckIns}</p>
            </div>

            {stats.capacity && (
              <>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="text-2xl font-bold">{stats.capacity}</p>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Spots Remaining</p>
                  <p className="text-2xl font-bold">{stats.spotsRemaining}</p>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Filled</p>
                  <p className="text-2xl font-bold">{stats.percentageFilled}%</p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleExportCSV} variant="outline" disabled={!checkins.length}>
              Export CSV
            </Button>
            <Button onClick={fetchCheckIns} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Check-ins List */}
      <Card>
        <CardHeader>
          <CardTitle>Attendees ({checkins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {checkins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No check-ins yet
            </div>
          ) : (
            <div className="space-y-2">
              {checkins.map((checkIn) => (
                <motion.div
                  key={checkIn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{checkIn.username}</p>
                      {checkIn.checkInMethod === 'manual' && (
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {checkIn.email || checkIn.userWalletHash.substring(0, 12) + '...'}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Checked in: {new Date(checkIn.checkedInAt).toLocaleString()}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveCheckIn(checkIn.id)}
                    disabled={removingId === checkIn.id}
                  >
                    {removingId === checkIn.id ? 'Removing...' : 'Remove'}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
