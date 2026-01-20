/**
 * Example: User Registration with Crossmint Wallet
 * Shows how to integrate wallet authentication with user database
 */

import { useState } from 'react';
import { useCrossmintAuth } from '@crossmint/client-sdk-react-ui';
import { getOrCreateUser, updateUser } from '../services/userApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function UserRegistrationExample() {
  const { wallet, isConnected } = useCrossmintAuth(); // Adjust based on Crossmint SDK
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Register or login user with wallet
  const handleWalletAuth = async () => {
    if (!wallet?.address) return;

    setLoading(true);
    try {
      const userData = await getOrCreateUser({
        walletAddress: wallet.address,
        email: email || undefined,
        displayName: displayName || undefined,
      });

      setUser(userData);
      console.log('User authenticated:', userData);
    } catch (error) {
      console.error('Authentication failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const handleUpdateProfile = async () => {
    if (!user?.walletAddress) return;

    setLoading(true);
    try {
      await updateUser(user.walletAddress, {
        email,
        displayName,
      });

      setUser({ ...user, email, displayName });
      alert('Profile updated!');
    } catch (error) {
      console.error('Update failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>User Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="text-center">
              <p className="mb-4">Connect your wallet to continue</p>
              <Button>Connect Wallet</Button>
            </div>
          ) : !user ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Wallet Address
                </label>
                <Input value={wallet?.address || ''} disabled />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email (optional)
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Display Name (optional)
                </label>
                <Input
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <Button
                onClick={handleWalletAuth}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Registering...' : 'Register / Login'}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-50 p-4 rounded">
                <p className="font-medium">Welcome back!</p>
                <p className="text-sm mt-2">ID: {user.id}</p>
                <p className="text-sm">
                  Wallet: {user.walletAddress.slice(0, 10)}...
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={user.email || 'Add email'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user.displayName || 'Add display name'}
                />
              </div>

              <Button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
