import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import mitobyteLogoLarge from '../mitobyte-c-large.png';

/**
 * InviteRedemption Component
 * Handles invite code redemption flow for new users
 */
export default function InviteRedemption({ inviteCode, isAuthenticated, user, wallet, onLogin }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    validateInvite();
  }, [inviteCode]);

  useEffect(() => {
    if (isAuthenticated && invite && !redeemed) {
      // Auto-redeem if user is logged in
      redeemInvite();
    }
  }, [isAuthenticated, invite]);

  const validateInvite = async () => {
    try {
      setLoading(true);
      alert(`🔍 Validating invite code: ${inviteCode}`);
      const response = await fetch(`/api/invites/${inviteCode}`);
      const data = await response.json();
      alert(`📥 Validation response: ${JSON.stringify(data, null, 2)}`);

      if (data.valid) {
        setInvite(data.invite);
        alert('✅ Invite code is valid!');
      } else {
        alert(`❌ Validation failed: ${data.error}`);
        setError(data.error || 'Invalid invite code');
      }
    } catch (err) {
      console.error('Validate invite error:', err);
      alert(`🚨 Validation error: ${err.message}`);
      setError('Failed to validate invite code');
    } finally {
      setLoading(false);
    }
  };

  const redeemInvite = async () => {
    try {
      setRedeeming(true);

      const userEmail = user?.email || null;
      const userWallet = wallet?.address || null;

      alert(`🎟️ Redeeming invite code: ${inviteCode}\nEmail: ${userEmail}\nWallet: ${userWallet}`);

      const response = await fetch(`/api/invites/${inviteCode}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          userWallet
        })
      });

      alert(`📡 Redemption response status: ${response.status}`);
      const data = await response.json();
      alert(`📥 Redemption response: ${JSON.stringify(data, null, 2)}`);

      if (data.success) {
        alert('🎉 Redemption successful! Redirecting...');
        setRedeemed(true);

        // Redirect to main app after 3 seconds
        setTimeout(() => {
          window.history.pushState({}, '', '/');
          window.location.reload();
        }, 3000);
      } else {
        alert(`❌ Redemption failed: ${data.error}`);
        setError(data.error || 'Failed to redeem invite');
      }
    } catch (err) {
      console.error('Redeem invite error:', err);
      alert(`🚨 Redemption error: ${err.message}`);
      setError('Failed to redeem invite code');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Validating invite code...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-destructive/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-6">❌</div>
              <h2 className="text-2xl font-bold mb-3">Invalid Invite Code</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => window.location.href = '/'}>
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (redeemed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-green-500/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl font-bold mb-3">Welcome to Mitobyte!</h2>
              <p className="text-muted-foreground mb-2">
                {invite.description || 'Your invite code has been redeemed successfully!'}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Redirecting you to the platform...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardContent className="p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <img
                src={mitobyteLogoLarge}
                alt="Mitobyte"
                className="w-20 h-20 mx-auto mb-4 rounded-xl"
              />
              <h1 className="text-3xl font-bold mb-2">Welcome to Mitobyte!</h1>
              <p className="text-muted-foreground">
                You've been invited to join Milwaukee's premier tech community
              </p>
            </div>

            {/* Invite Info */}
            {invite.description && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-center">{invite.description}</p>
              </div>
            )}

            {/* Invite Code */}
            <div className="bg-muted rounded-lg p-4 mb-6 text-center">
              <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
              <code className="text-lg font-mono font-bold">{inviteCode}</code>

              {invite.usesRemaining && (
                <p className="text-xs text-muted-foreground mt-2">
                  {invite.usesRemaining} {invite.usesRemaining === 1 ? 'use' : 'uses'} remaining
                </p>
              )}
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-sm">What you'll get:</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">🤝</span>
                  <div>
                    <p className="text-sm font-medium">Network with Developers</p>
                    <p className="text-xs text-muted-foreground">Connect with 1,000+ Milwaukee developers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">📅</span>
                  <div>
                    <p className="text-sm font-medium">Exclusive Events</p>
                    <p className="text-xs text-muted-foreground">Access hackathons, workshops, and meetups</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">💡</span>
                  <div>
                    <p className="text-sm font-medium">Collaborate & Learn</p>
                    <p className="text-xs text-muted-foreground">Build projects and grow your skills</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            {isAuthenticated ? (
              <Button
                onClick={redeemInvite}
                disabled={redeeming}
                className="w-full"
                size="lg"
              >
                {redeeming ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Joining...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🎉</span>
                    Join Mitobyte
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={onLogin}
                  className="w-full"
                  size="lg"
                >
                  <span className="mr-2">🔐</span>
                  Sign In to Join
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  You'll be automatically added after signing in
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
