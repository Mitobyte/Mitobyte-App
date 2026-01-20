import { useState } from 'react';
import { FederationProfile } from '../components/federation/FederationProfile';
import { FediverseToggle } from '../components/federation/FediverseToggle';
import { ActivityFeed } from '../components/federation/ActivityFeed';
import { FollowButton } from '../components/federation/FollowButton';
import ProfileView from '../components/ProfileView';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export function FederationPage({ userEmail, user, walletAddress, darkMode, toggleDarkMode, onLogout, onAdminClick }) {
  const [showProfile, setShowProfile] = useState(false);

  const handleEditProfile = () => {
    window.history.pushState({}, '', '/profile/edit');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const isAdmin = user?.email?.startsWith('carl@craftthefuture.xyz');
  const [searchHandle, setSearchHandle] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchHandle.trim()) return;

    setSearching(true);
    try {
      // Search for ActivityPub actors via WebFinger
      const handle = searchHandle.trim();
      const [username, domain] = handle.replace('@', '').split('@');

      if (!domain) {
        alert('Please enter a full handle like @user@mastodon.social');
        return;
      }

      const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`;
      const response = await fetch(webfingerUrl);

      if (!response.ok) {
        throw new Error('User not found');
      }

      const data = await response.json();
      const actorUrl = data.links.find(link => link.type === 'application/activity+json')?.href;

      if (!actorUrl) {
        throw new Error('Not an ActivityPub actor');
      }

      setSearchResults({
        handle,
        actorUri: actorUrl,
        name: data.subject || handle
      });
    } catch (error) {
      alert(`Search failed: ${error.message}`);
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  // Show Profile View
  if (showProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Button onClick={() => setShowProfile(false)} variant="ghost">
              ← Back to Federation
            </Button>
            <div className="flex gap-2">
              <Button onClick={toggleDarkMode} variant="ghost" size="icon">
                {darkMode ? '☀️' : '🌙'}
              </Button>
              {isAdmin && (
                <Button onClick={onAdminClick} variant="outline" size="sm">
                  Admin
                </Button>
              )}
              <Button onClick={onLogout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>

          <ProfileView
            user={user}
            walletAddress={walletAddress}
            onEdit={handleEditProfile}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Fediverse Integration
            </h1>
            <p className="text-gray-600">
              Connect with the fediverse - Mastodon, Pleroma, and more!
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowProfile(true)} variant="outline" size="sm">
              My Profile
            </Button>
            <Button onClick={toggleDarkMode} variant="ghost" size="icon">
              {darkMode ? '☀️' : '🌙'}
            </Button>
            {isAdmin && (
              <Button onClick={onAdminClick} variant="outline" size="sm">
                Admin
              </Button>
            )}
            <Button onClick={onLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>

        {/* Settings */}
        <FediverseToggle userEmail={userEmail} />

        {/* Search for Users */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Find Fediverse Users</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="@username@mastodon.social"
              value={searchHandle}
              onChange={(e) => setSearchHandle(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {searchResults && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{searchResults.name}</div>
                  <div className="text-sm text-gray-500">{searchResults.handle}</div>
                </div>
                <FollowButton
                  userEmail={userEmail}
                  actorUri={searchResults.actorUri}
                  actorHandle={searchResults.handle}
                />
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Profile Stats */}
          <div>
            <FederationProfile userEmail={userEmail} />
          </div>

          {/* Right Column - Activity Feed */}
          <div>
            <ActivityFeed userEmail={userEmail} />
          </div>
        </div>

        {/* Info Section */}
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
          <h3 className="text-lg font-semibold mb-3">What is the Fediverse?</h3>
          <p className="text-gray-700 mb-3">
            The fediverse is a network of interconnected social platforms that use ActivityPub protocol.
            When you enable fediverse integration, your votes and activities can be shared across platforms like:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Mastodon - Twitter-like microblogging</li>
            <li>Pleroma - Lightweight social networking</li>
            <li>Pixelfed - Photo sharing (like Instagram)</li>
            <li>PeerTube - Video sharing (like YouTube)</li>
            <li>And many more!</li>
          </ul>
          <p className="text-gray-700 mt-3">
            Your Mitobyte profile becomes discoverable at <code className="bg-white px-2 py-1 rounded">@{userEmail}</code>
          </p>
        </Card>
      </div>
    </div>
  );
}
