import { useState, useEffect } from 'react';
import ProfileQRCode from './ProfileQRCode';

export default function ProfileCard({ user, walletAddress }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [connectionsCount, setConnectionsCount] = useState(0);

  useEffect(() => {
    fetchProfile();
    fetchConnectionsCount();
  }, [walletAddress]);

  const fetchProfile = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionsCount = async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/connections?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      if (data.success) {
        setConnectionsCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching connections count:', error);
    }
  };

  if (loading) {
    return (
      <div className="border border-border/40 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-foreground/10 animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-foreground/10 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-foreground/10 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/40 rounded-lg p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={user?.name || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-medium">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">
            {user?.name || user?.email?.split('@')[0] || 'Member'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {profile?.tagline || user?.email || 'Community Member'}
          </p>
        </div>

        {/* QR Code Toggle Button */}
        <button
          onClick={() => setShowQRCode(!showQRCode)}
          className="flex-shrink-0 px-3 h-8 rounded-full border border-border/40 hover:bg-foreground/5 transition-colors flex items-center gap-1.5"
        >
          <span className="text-sm">📱</span>
          <span className="text-xs">{showQRCode ? 'Hide' : 'QR'}</span>
        </button>

        {/* Connections Count */}
        {!showQRCode && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>🤝</span>
            <span>{connectionsCount}</span>
          </div>
        )}
      </div>

      {/* Collapsible QR Code Section */}
      {showQRCode && (
        <div className="pt-4 mt-4 border-t border-border/40">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground text-center">
              Share this QR code for networking
            </p>
            <ProfileQRCode
              walletAddress={walletAddress}
              profile={profile}
              showInline={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
