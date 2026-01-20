import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { updateProfileVisibility, deleteAccount, getProfile } from '../services/profileApi';

export default function SettingsPage({ user, dbUser, walletAddress, onBack, onLogout }) {
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if user is admin (bootstrap admin OR database is_admin field)
  const isAdmin = user?.email?.startsWith('carl@craftthefuture.xyz') || dbUser?.is_admin === 1 || dbUser?.is_admin === true;

  const fetchProfileVisibility = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const profile = await getProfile(walletAddress);
      if (profile) {
        setVisibility(profile.profile_visibility || 'public');
      }
    } catch (err) {
      console.error('Error fetching profile visibility:', err);
      // Set default visibility on error to prevent issues
      setVisibility('public');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileVisibility();
  }, [walletAddress]);

  const handleVisibilityToggle = async () => {
    const newVisibility = visibility === 'public' ? 'private' : 'public';
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfileVisibility(walletAddress, newVisibility);
      setVisibility(newVisibility);
      setSuccess(`Profile is now ${newVisibility}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteAccount(walletAddress);
      setSuccess('Account and all associated data have been permanently deleted');
      // Wait 2 seconds then log out
      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (err) {
      // Check if it's an admin restriction error
      if (err.message.includes('Admin accounts cannot be deleted')) {
        setError('Administrator accounts are protected and cannot be deleted for security reasons.');
      } else {
        setError(err.message);
      }
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={onBack} variant="ghost" size="sm">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Profile Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Visibility</CardTitle>
            <CardDescription>
              Control who can see your profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {visibility === 'public' ? '🌍 Public Profile' : '🔒 Private Profile'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {visibility === 'public'
                    ? 'Your profile is visible to everyone'
                    : 'Your profile is hidden from public view'}
                </p>
              </div>
              <Button
                onClick={handleVisibilityToggle}
                disabled={saving}
                variant={visibility === 'public' ? 'outline' : 'default'}
              >
                {saving ? 'Updating...' : visibility === 'public' ? 'Make Private' : 'Make Public'}
              </Button>
            </div>

            {success && (
              <div className="p-3 bg-green-500/10 text-green-500 rounded-lg text-sm">
                ✓ {success}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                ✗ {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-500">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <div className="p-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-sm">
                ⚠️ Administrator accounts cannot be deleted for security reasons.
              </div>
            )}
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
                disabled={isAdmin}
              >
                Delete My Account
              </Button>
            ) : (
              <div className="space-y-4 p-4 border border-red-500/20 rounded-lg bg-red-500/5">
                <div>
                  <p className="font-medium text-red-500 mb-2">
                    ⚠️ This action cannot be undone
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will permanently delete your account and <strong>ALL</strong> associated data including:
                  </p>
                  <ul className="text-sm text-muted-foreground mb-4 list-disc list-inside space-y-1">
                    <li>All your posts and comments</li>
                    <li>Event RSVPs and check-ins</li>
                    <li>Profile information</li>
                    <li>Follows and connections</li>
                    <li>Any other user-generated content</li>
                  </ul>
                  <p className="text-sm font-medium mb-2">
                    Type <span className="font-mono bg-background px-2 py-1 rounded">DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Type DELETE"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                      setError(null);
                    }}
                    className="flex-1"
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="flex-1"
                    disabled={deleting || deleteConfirmText !== 'DELETE'}
                  >
                    {deleting ? 'Deleting...' : 'Confirm Deletion'}
                  </Button>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                    ✗ {error}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
