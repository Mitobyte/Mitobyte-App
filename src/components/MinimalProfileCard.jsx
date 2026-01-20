import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';

export function MinimalProfileCard({ user, walletAddress }) {
  const [profile, setProfile] = useState(null);
  const [xpData, setXpData] = useState({ totalXp: 0, level: 1 });
  const [collectibles, setCollectibles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      fetchProfileData();
    }
  }, [walletAddress]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const profileResponse = await fetch(`/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`);
      const profileData = await profileResponse.json();
      if (profileData.success) {
        setProfile(profileData.profile);
      }

      // Fetch XP data from bingo rewards
      const xpResponse = await fetch(`/api/user/xp?walletAddress=${encodeURIComponent(walletAddress)}`);
      const xpResult = await xpResponse.json();
      if (xpResult.success) {
        setXpData(xpResult.data);
      }

      // Fetch collectibles (badges)
      const collectiblesResponse = await fetch(`/api/user/collectibles?walletAddress=${encodeURIComponent(walletAddress)}`);
      const collectiblesResult = await collectiblesResponse.json();
      if (collectiblesResult.success) {
        setCollectibles(collectiblesResult.collectibles || []);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevel = (xp) => {
    return Math.floor(xp / 100) + 1;
  };

  const getXpProgress = (xp) => {
    return xp % 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  const level = calculateLevel(xpData.totalXp);
  const xpProgress = getXpProgress(xpData.totalXp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-6"
    >
      {/* Minimal Profile Card */}
      <Card className="p-6 mb-6">
        {/* Avatar and Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={user?.name || 'User'}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-3xl font-bold border-2 border-primary/20">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {/* Level Badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background">
              <span className="text-xs font-bold text-primary-foreground">{level}</span>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold">
              {profile?.display_name || user?.name || user?.email?.split('@')[0] || 'Member'}
            </h2>
            {profile?.tagline && (
              <p className="text-sm text-muted-foreground mt-1">{profile.tagline}</p>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Level {level}</span>
            <span className="font-medium">{xpData.totalXp} XP</span>
          </div>
          <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-primary/60"
            />
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {xpProgress}/100 XP to next level
          </div>
        </div>
      </Card>

      {/* Collectibles Section */}
      {collectibles.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🏆</span>
            <span>Collectibles</span>
            <span className="text-sm font-normal text-muted-foreground">({collectibles.length})</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {collectibles.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 transition-colors"
              >
                <div className="text-3xl mb-2">
                  {item.reward_type === 'badge' ? '🏅' :
                   item.reward_type === 'raffle_entry' ? '🎟️' :
                   item.reward_type === 'shout_out' ? '📢' : '⭐'}
                </div>
                <p className="text-xs font-medium text-center line-clamp-2">
                  {item.reward_name}
                </p>
                {item.points_awarded > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{item.points_awarded} XP
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {collectibles.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">Start Your Journey</h3>
          <p className="text-muted-foreground">
            Attend events, complete networking bingo, and earn collectibles!
          </p>
        </Card>
      )}
    </motion.div>
  );
}
