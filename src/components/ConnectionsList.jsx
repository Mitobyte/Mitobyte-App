import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export default function ConnectionsList({ walletAddress }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetchConnections();
  }, [walletAddress]);

  const fetchConnections = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/connections?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      if (data.success) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId, connectedWalletHash) => {
    if (!confirm('Are you sure you want to disconnect from this user?')) {
      return;
    }

    try {
      setRemovingId(connectionId);
      const response = await fetch('/api/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletHash: walletAddress,
          connectedWalletHash: connectedWalletHash
        })
      });

      const data = await response.json();

      if (data.success) {
        setConnections(connections.filter(c => c.id !== connectionId));
      } else {
        alert(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewProfile = (walletAddress) => {
    window.location.href = `/?viewProfile=${encodeURIComponent(walletAddress)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted-foreground/20"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted-foreground/20 rounded mb-2 w-1/3"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>🤝</span>
          <span>My Connections</span>
          <span className="text-sm text-muted-foreground font-normal ml-auto">
            ({connections.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-muted-foreground mb-2">No connections yet</p>
            <p className="text-sm text-muted-foreground">
              Connect with others by scanning their QR codes or visiting their profiles
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((connection, index) => (
              <motion.div
                key={connection.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {connection.avatarUrl ? (
                    <img
                      src={connection.avatarUrl}
                      alt={connection.displayName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-lg font-bold border-2 border-primary/20">
                      {connection.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">
                    {connection.displayName}
                  </h4>
                  {connection.tagline ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {connection.tagline}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {connection.role || 'Community Member'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Connected {new Date(connection.connectedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewProfile(connection.walletAddress)}
                    className="text-xs"
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(connection.id, connection.walletAddress)}
                    disabled={removingId === connection.id}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    {removingId === connection.id ? '...' : 'Disconnect'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
