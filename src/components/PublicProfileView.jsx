import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import mitobyteLogoLarge from '../mitobyte-c-large.png';

export default function PublicProfileView({ viewWalletAddress, isAuthenticated, onLogin, currentUserWallet }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    if (isAuthenticated && currentUserWallet) {
      checkConnectionStatus();
    }
  }, [viewWalletAddress, isAuthenticated, currentUserWallet]);

  const checkConnectionStatus = async () => {
    if (!currentUserWallet || !viewWalletAddress) return;

    try {
      const response = await fetch(`/api/connections?walletAddress=${encodeURIComponent(currentUserWallet)}`);
      const data = await response.json();

      if (data.success) {
        const connected = data.connections.some(c => c.walletAddress === viewWalletAddress);
        setIsConnected(connected);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleConnect = async () => {
    if (!currentUserWallet) {
      onLogin();
      return;
    }

    try {
      setConnectLoading(true);
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletHash: currentUserWallet,
          connectedWalletHash: viewWalletAddress
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
          connectedWalletHash: viewWalletAddress
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
    if (!viewWalletAddress) return;

    try {
      setLoading(true);
      // Check if this is already a hash (64 hex characters) or an unhashed address
      const isHash = /^[a-f0-9]{64}$/i.test(viewWalletAddress);
      const queryParam = isHash ? 'walletHash' : 'walletAddress';
      const response = await fetch(`/api/profile?${queryParam}=${encodeURIComponent(viewWalletAddress)}`);
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

  const handleBack = () => {
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2">{error || 'Profile Not Found'}</h2>
          <p className="text-muted-foreground mb-6">
            This profile doesn't exist or hasn't been set up yet.
          </p>
          <Button onClick={handleBack}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Parse skills and interests if they exist
  let skillsArray = [];
  let interestsArray = [];

  try {
    if (profile.skills) {
      const parsed = JSON.parse(profile.skills);
      skillsArray = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    skillsArray = [];
  }

  try {
    if (profile.interests) {
      const parsed = JSON.parse(profile.interests);
      interestsArray = Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    interestsArray = [];
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
              >
                ← Back
              </Button>
              <img
                src={mitobyteLogoLarge}
                alt="Mitobyte"
                className="h-6 sm:h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated && currentUserWallet !== viewWalletAddress && (
                <Button
                  onClick={isConnected ? handleDisconnect : handleConnect}
                  disabled={connectLoading}
                  size="sm"
                  variant={isConnected ? 'outline' : 'default'}
                >
                  {connectLoading ? (
                    <span>...</span>
                  ) : isConnected ? (
                    <>✓ Connected</>
                  ) : (
                    <>+ Connect</>
                  )}
                </Button>
              )}
              {!isAuthenticated && (
                <Button onClick={onLogin} size="sm">
                  Join
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || 'User'}
                      className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-3xl font-bold border-4 border-primary/20">
                      {(profile.display_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold truncate">
                    {profile.display_name || 'Member'}
                  </h2>
                  {profile.tagline && (
                    <p className="text-sm text-muted-foreground italic mt-1">
                      {profile.tagline}
                    </p>
                  )}
                  {profile.role && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.role}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Location */}
              {profile.location && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>📍</span>
                  <span>{profile.location}</span>
                </div>
              )}

              {/* Website */}
              {profile.website && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span>🔗</span>
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Social Links Card */}
        {(profile.github_username || profile.twitter_username || profile.linkedin_url || profile.discord_username) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.github_username && (
                  <a
                    href={`https://github.com/${profile.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">@{profile.github_username}</p>
                    </div>
                  </a>
                )}

                {profile.twitter_username && (
                  <a
                    href={`https://twitter.com/${profile.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    <div>
                      <p className="font-medium">Twitter</p>
                      <p className="text-sm text-muted-foreground">@{profile.twitter_username}</p>
                    </div>
                  </a>
                )}

                {profile.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <div>
                      <p className="font-medium">LinkedIn</p>
                      <p className="text-sm text-muted-foreground">View profile</p>
                    </div>
                  </a>
                )}

                {profile.discord_username && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0 a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <div>
                      <p className="font-medium">Discord</p>
                      <p className="text-sm text-muted-foreground">{profile.discord_username}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Skills & Interests */}
        {(skillsArray.length > 0 || interestsArray.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills & Interests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {skillsArray.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {skillsArray.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {interestsArray.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {interestsArray.map((interest, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Call to Action */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">🤝</div>
                <h3 className="text-xl font-bold mb-2">Join the Community</h3>
                <p className="text-muted-foreground mb-4">
                  Create your own profile and connect with {profile.display_name} and other members!
                </p>
                <Button onClick={onLogin} size="lg">
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
