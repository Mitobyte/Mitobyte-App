import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ProfileQRCode from '../ProfileQRCode';

export function UserProfileRedesigned({ userId, onClose, currentUserEmail, fallbackEmail, fallbackName, walletAddress }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from database
  useEffect(() => {
    const loadProfile = async () => {
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`);
        const data = await response.json();

        if (data.success && data.profile) {
          setProfile(data.profile);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [walletAddress]);

  const handleEditProfile = () => {
    window.history.pushState({}, '', '/profile/edit');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayName = profile?.name || fallbackName || 'User';
  const email = profile?.email || fallbackEmail;
  const skills = profile?.skills ? JSON.parse(profile.skills) : [];
  const interests = profile?.interests ? JSON.parse(profile.interests) : [];

  return (
    <div className="space-y-6 p-4">
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-primary-foreground">
                {displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Name & Info */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {profile?.username && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
            {profile?.tagline && (
              <p className="text-sm italic text-muted-foreground">{profile.tagline}</p>
            )}
            {profile?.location && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <span>📍</span>
                {profile.location}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-xs space-y-2">
            <Button onClick={handleEditProfile} variant="outline" className="w-full">
              Edit Profile
            </Button>
            <ProfileQRCode walletAddress={walletAddress} profile={profile} />
          </div>
        </div>
      </Card>

      {/* Bio */}
      {profile?.bio && (
        <Card className="p-6">
          <h2 className="font-semibold mb-3">About</h2>
          <p className="text-muted-foreground">{profile.bio}</p>
        </Card>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <Badge key={index} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold mb-3">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest, index) => (
              <Badge key={index} variant="outline">{interest}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Social Links */}
      {(profile?.website || profile?.github_username || profile?.twitter_username || profile?.linkedin_url) && (
        <Card className="p-6">
          <h2 className="font-semibold mb-3">Links</h2>
          <div className="space-y-2">
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                🌐 {profile.website}
              </a>
            )}
            {profile.github_username && (
              <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                💻 GitHub: {profile.github_username}
              </a>
            )}
            {profile.twitter_username && (
              <a href={`https://twitter.com/${profile.twitter_username}`} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                🐦 Twitter: @{profile.twitter_username}
              </a>
            )}
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                💼 LinkedIn
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
