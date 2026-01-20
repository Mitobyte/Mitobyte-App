import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, isPushNotificationSubscribed } from '../services/oneSignalNotifications';

export default function AppSettings({ user, walletAddress, darkMode, toggleDarkMode, onSettingsSaved }) {
  const [settings, setSettings] = useState({
    // Notification preferences
    eventReminders: true,
    communityUpdates: true,
    emailNotifications: true,

    // Privacy settings
    profileVisibility: 'public', // public, community, private
    showEmail: false,
    showActivity: true,

    // App preferences
    defaultView: 'events', // events, showcase, checkin, directory, profile
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [checkingPushStatus, setCheckingPushStatus] = useState(true);

  // Load settings from API
  useEffect(() => {
    fetchSettings();
    checkPushNotificationStatus();
  }, [walletAddress]);

  const checkPushNotificationStatus = async () => {
    try {
      setCheckingPushStatus(true);
      // Silently fail if OneSignal not available
      const isSubscribed = await isPushNotificationSubscribed().catch(() => false);
      setPushNotificationsEnabled(isSubscribed);
    } catch (error) {
      console.warn('OneSignal not available:', error);
      setPushNotificationsEnabled(false);
    } finally {
      setCheckingPushStatus(false);
    }
  };

  const handleTogglePushNotifications = async () => {
    try {
      if (pushNotificationsEnabled) {
        // Unsubscribe
        await unsubscribeFromPushNotifications();
        setPushNotificationsEnabled(false);
        // Clear the dismissed flag so they can re-enable
        localStorage.removeItem('notificationPromptDismissed');
        setSaveMessage({ type: 'success', text: 'Push notifications disabled' });
      } else {
        // Subscribe
        await subscribeToPushNotifications(walletAddress);
        setPushNotificationsEnabled(true);
        setSaveMessage({ type: 'success', text: 'Push notifications enabled!' });
      }
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      // Show user-friendly error message
      let errorMessage = 'Failed to update push notifications';
      if (error.message.includes('timeout')) {
        errorMessage = 'Connection timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('denied')) {
        errorMessage = 'Notification permission denied. Please enable notifications in your browser settings.';
      }
      setSaveMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const fetchSettings = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/settings?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          ...settings
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);

      // Notify parent component that settings were saved
      if (onSettingsSaved) {
        onSettingsSaved();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({ type: 'error', text: error.message });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🎨</span>
            <span>Appearance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🔔</span>
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Event Reminders</p>
              <p className="text-sm text-muted-foreground">Get notified about upcoming events you've registered for</p>
            </div>
            <button
              onClick={() => handleToggle('eventReminders')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.eventReminders ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.eventReminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Community Updates</p>
              <p className="text-sm text-muted-foreground">Stay informed about community news and announcements</p>
            </div>
            <button
              onClick={() => handleToggle('communityUpdates')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.communityUpdates ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.communityUpdates ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive instant notifications even when the app is closed
              </p>
              {!('Notification' in window) && (
                <p className="text-xs text-destructive mt-1">
                  Not supported in this browser
                </p>
              )}
            </div>
            {checkingPushStatus ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            ) : (
              <button
                onClick={handleTogglePushNotifications}
                disabled={!('Notification' in window)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pushNotificationsEnabled ? 'bg-primary' : 'bg-muted'
                } ${!('Notification' in window) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🔒</span>
            <span>Privacy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block font-medium mb-2">Profile Visibility</label>
            <p className="text-sm text-muted-foreground mb-3">Control who can see your profile</p>
            <select
              value={settings.profileVisibility}
              onChange={(e) => handleSelectChange('profileVisibility', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="public">Public - Anyone can view</option>
              <option value="community">Community - Only members can view</option>
              <option value="private">Private - Only you can view</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Email</p>
              <p className="text-sm text-muted-foreground">Display your email on your public profile</p>
            </div>
            <button
              onClick={() => handleToggle('showEmail')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showEmail ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showEmail ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Activity</p>
              <p className="text-sm text-muted-foreground">Let others see your event participation</p>
            </div>
            <button
              onClick={() => handleToggle('showActivity')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showActivity ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showActivity ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>⚙️</span>
            <span>App Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block font-medium mb-2">Default View</label>
            <p className="text-sm text-muted-foreground mb-3">Choose which tab to show when you open the app</p>
            <select
              value={settings.defaultView}
              onChange={(e) => handleSelectChange('defaultView', e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="events">📅 Events</option>
              <option value="showcase">🏆 Showcase</option>
              <option value="checkin">🔍 Check In</option>
              <option value="directory">👥 Directory</option>
              <option value="profile">👤 Profile</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>👤</span>
            <span>Account Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{user?.email || 'Not available'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Wallet Address</p>
            <p className="text-sm font-mono break-all">
              {walletAddress?.startsWith('email:')
                ? 'Email-based account'
                : walletAddress || 'Not connected'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Message */}
      {saveMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm ${
            saveMessage.type === 'success'
              ? 'bg-primary/10 border border-primary/20 text-primary'
              : 'bg-destructive/10 border border-destructive/20 text-destructive'
          }`}
        >
          {saveMessage.text}
        </motion.div>
      )}

      {/* Save Button */}
      <div className="sticky bottom-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </motion.div>
  );
}
