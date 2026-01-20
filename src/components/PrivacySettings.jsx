import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { updateProfileVisibility, deleteAccount } from '../services/profileApi';

export default function PrivacySettings({ walletAddress, currentVisibility, onLogout }) {
  const [visibility, setVisibility] = useState(currentVisibility || 'public');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleVisibilityToggle = async () => {
    const newVisibility = visibility === 'public' ? 'private' : 'public';
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfileVisibility(walletAddress, newVisibility);
      setVisibility(newVisibility);
      setSuccess(`Profile is now ${newVisibility}`);
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
      setSuccess('Account deleted successfully');
      // Wait 2 seconds then log out
      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
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
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full"
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
                  This will permanently delete your account, profile, and all associated data.
                  Your content will be removed from the platform.
                </p>
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
    </div>
  );
}
