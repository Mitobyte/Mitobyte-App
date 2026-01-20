import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';

export function CommunityHeroBanner() {
  const [stats, setStats] = useState({
    newConnections: 0,
    activeMembers: 0,
    recentWins: 0
  });

  useEffect(() => {
    fetchCommunityStats();
  }, []);

  const fetchCommunityStats = async () => {
    try {
      const response = await fetch('/api/community/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load community stats:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-background border border-primary/20 mb-6"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative px-6 py-8 sm:px-12 sm:py-12">
        {/* Main Greeting */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Welcome to Milwaukee's Tech Community
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Meet, Share, Build Together 🏙️
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/40">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤝</span>
              <div>
                <div className="text-2xl font-bold">{stats.newConnections || 0}</div>
                <div className="text-sm text-muted-foreground">New connections this month</div>
              </div>
            </div>
          </div>

          <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/40">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👥</span>
              <div>
                <div className="text-2xl font-bold">{stats.activeMembers || 0}</div>
                <div className="text-sm text-muted-foreground">Active members</div>
              </div>
            </div>
          </div>

          <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/40">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <div className="text-2xl font-bold">{stats.recentWins || 0}</div>
                <div className="text-sm text-muted-foreground">Recent wins this week</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trending Topics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-wrap gap-2"
        >
          <span className="text-sm text-muted-foreground">Trending:</span>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            #CreamCityCode
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            #HoanTalks
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            #MKETech
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            #BrewCityBuilders
          </Badge>
        </motion.div>
      </div>
    </motion.div>
  );
}
