import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

/**
 * InviteQRManager Component
 * Allows admins to generate and manage invite QR codes for platform access
 */
export default function InviteQRManager({ user }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const [formData, setFormData] = useState({
    maxUses: '',
    expiresIn: '',
    description: ''
  });

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invites?adminEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();

      if (data.success) {
        setInvites(data.invites);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
          expiresIn: formData.expiresIn ? parseInt(formData.expiresIn) : null,
          description: formData.description || null
        })
      });

      const data = await response.json();

      if (data.success) {
        // Show QR code modal with new invite
        setSelectedInvite(data.inviteCode);
        setShowQRModal(true);
        setShowCreateForm(false);
        setFormData({ maxUses: '', expiresIn: '', description: '' });
        fetchInvites();
      } else {
        alert('Failed to create invite code: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Create invite error:', error);
      alert('Failed to create invite code');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (code) => {
    if (!confirm('Are you sure you want to deactivate this invite code?')) {
      return;
    }

    try {
      const response = await fetch(`/api/invites/${code}?adminEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchInvites();
      } else {
        alert('Failed to deactivate invite code: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Deactivate invite error:', error);
      alert('Failed to deactivate invite code');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadQRCode = (code) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      `${window.location.origin}/invite/${code}`
    )}`;

    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `invite-${code}.png`;
    link.click();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (invite) => {
    if (!invite.is_active) {
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">Deactivated</Badge>;
    }

    if (isExpired(invite.expires_at)) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Expired</Badge>;
    }

    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Limit Reached</Badge>;
    }

    return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invite QR Codes</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate QR codes to grant platform access to new users
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '✕ Cancel' : '➕ Create Invite Code'}
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Create New Invite Code</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Max Uses (Optional)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.maxUses}
                        onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                        placeholder="Unlimited"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank for unlimited uses
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Expires In (Days, Optional)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.expiresIn}
                        onChange={(e) => setFormData({ ...formData, expiresIn: e.target.value })}
                        placeholder="Never expires"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank for no expiration
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description (Optional)
                    </label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Milwaukee Hackathon 2024"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Help you remember what this invite is for
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">🎟️</span>
                          Generate Invite Code
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invites List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : invites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">🎟️</div>
            <h3 className="text-lg font-semibold mb-2">No Invite Codes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first invite code to start onboarding new users
            </p>
            <Button onClick={() => setShowCreateForm(true)}>Create Invite Code</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {invites.map((invite) => (
            <Card key={invite.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                        {invite.code}
                      </code>
                      {getStatusBadge(invite)}
                    </div>

                    {invite.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {invite.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{formatDate(invite.created_at)}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Expires</p>
                        <p className="font-medium">{formatDate(invite.expires_at)}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Uses</p>
                        <p className="font-medium">
                          {invite.current_uses} / {invite.max_uses || '∞'}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Redemptions</p>
                        <p className="font-medium">{invite.redemption_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedInvite(invite);
                        setShowQRModal(true);
                      }}
                    >
                      📱 View QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.code}`)}
                    >
                      🔗 Copy Link
                    </Button>
                    {invite.is_active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeactivate(invite.code)}
                      >
                        🚫 Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence mode="wait">
        {showQRModal && selectedInvite && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              style={{ pointerEvents: 'auto' }}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Invite QR Code</h3>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="w-8 h-8 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-center space-y-4">
                  <div className="bg-white p-6 rounded-xl inline-block">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                        `${window.location.origin}/invite/${selectedInvite.code}`
                      )}`}
                      alt="Invite QR Code"
                      className="w-64 h-64"
                    />
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
                    <code className="text-lg font-mono font-bold">
                      {selectedInvite.code}
                    </code>
                  </div>

                  {selectedInvite.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedInvite.description}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyToClipboard(`${window.location.origin}/invite/${selectedInvite.code}`)}
                    >
                      🔗 Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => downloadQRCode(selectedInvite.code)}
                    >
                      💾 Download QR
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Users can scan this QR code to get instant access to the platform
                  </p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
