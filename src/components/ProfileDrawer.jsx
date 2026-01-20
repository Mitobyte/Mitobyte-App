import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function ProfileDrawer({ walletHash, onClose, currentUserWallet, isAuthenticated, onLogin }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    if (walletHash) {
      fetchProfile();
      if (isAuthenticated && currentUserWallet) {
        checkConnectionStatus();
      }
    }
  }, [walletHash, isAuthenticated, currentUserWallet]);

  const checkConnectionStatus = async () => {
    if (!currentUserWallet || !walletHash) return;

    try {
      const response = await fetch(`/api/connections?walletAddress=${encodeURIComponent(currentUserWallet)}`);
      const data = await response.json();

      if (data.success) {
        const connected = data.connections.some(c => c.walletAddress === walletHash);
        setIsConnected(connected);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleConnect = async () => {
    if (!currentUserWallet) {
      alert('Please sign in to connect with users');
      return;
    }

    try {
      setConnectLoading(true);
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletHash: currentUserWallet,
          connectedWalletHash: walletHash
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(true);
      } else {
        alert(data.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      alert('Failed to connect. Please try again.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentUserWallet) return;

    try {
      setConnectLoading(true);
      const response = await fetch('/api/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletHash: currentUserWallet,
          connectedWalletHash: walletHash
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
      } else {
        alert(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect. Please try again.');
    } finally {
      setConnectLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!walletHash) return;

    try {
      setLoading(true);
      const isHash = /^[a-f0-9]{64}$/i.test(walletHash);
      const queryParam = isHash ? 'walletHash' : 'walletAddress';
      const response = await fetch(`/api/profile?${queryParam}=${encodeURIComponent(walletHash)}`);
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
      } else {
        setError('Profile not found');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {walletHash && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-background border-l border-border z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Profile</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Loading profile...</p>
                </div>
              ) : error || !profile ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">😕</div>
                  <h3 className="text-xl font-bold mb-2">{error || 'Profile Not Found'}</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    This profile doesn't exist or hasn't been set up yet.
                  </p>
                  <Button onClick={onClose}>Close</Button>
                </div>
              ) : (
                <>
                  {/* Profile Header */}
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Avatar */}
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name || profile.email}
                        className="w-24 h-24 rounded-full object-cover border-4 border-border"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-3xl font-bold border-4 border-border">
                        {(profile.name || profile.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Name & Email */}
                    <div>
                      <h2 className="text-2xl font-bold">{profile.name || 'Community Member'}</h2>
                      {profile.email && (
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      )}
                    </div>

                    {/* Tagline */}
                    {profile.tagline && (
                      <p className="text-muted-foreground italic">{profile.tagline}</p>
                    )}
                  </div>

                  {/* Connection Button */}
                  {currentUserWallet && currentUserWallet !== walletHash && (
                    <div className="pt-4 border-t border-border">
                      {isConnected ? (
                        <Button
                          onClick={handleDisconnect}
                          disabled={connectLoading}
                          variant="outline"
                          className="w-full"
                        >
                          {connectLoading ? 'Disconnecting...' : '✅ Connected'}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleConnect}
                          disabled={connectLoading}
                          className="w-full"
                        >
                          {connectLoading ? 'Connecting...' : '🤝 Connect'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">About</h3>
                      <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {/* Location */}
                  {profile.location && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📍</span>
                      <div>
                        <div className="font-medium">{profile.location}</div>
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {profile.website && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌐</span>
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}

                  {/* Social Links */}
                  {(profile.githubUsername || profile.twitterUsername || profile.linkedinUrl || profile.discordUsername) && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Social Links</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {profile.githubUsername && (
                          <a
                            href={`https://github.com/${profile.githubUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-foreground/5 transition-colors"
                          >
                            <span className="text-xl">🐙</span>
                            <span className="text-sm font-medium">GitHub</span>
                          </a>
                        )}
                        {profile.twitterUsername && (
                          <a
                            href={`https://twitter.com/${profile.twitterUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-foreground/5 transition-colors"
                          >
                            <span className="text-xl">🐦</span>
                            <span className="text-sm font-medium">Twitter</span>
                          </a>
                        )}
                        {profile.linkedinUrl && (
                          <a
                            href={profile.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-foreground/5 transition-colors"
                          >
                            <span className="text-xl">💼</span>
                            <span className="text-sm font-medium">LinkedIn</span>
                          </a>
                        )}
                        {profile.discordUsername && (
                          <div className="flex items-center gap-2 p-3 rounded-lg border border-border">
                            <span className="text-xl">💬</span>
                            <span className="text-sm font-medium">{profile.discordUsername}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {profile.skills && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(profile.skills).map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interests */}
                  {profile.interests && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(profile.interests).map((interest, index) => (
                          <Badge key={index} variant="outline">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
