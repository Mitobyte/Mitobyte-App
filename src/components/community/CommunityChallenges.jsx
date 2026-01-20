import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function CommunityChallenges({ userEmail }) {
  const [activePoll, setActivePoll] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [userVote, setUserVote] = useState(null);

  useEffect(() => {
    fetchActivePoll();
    fetchChallenges();
  }, []);

  const fetchActivePoll = async () => {
    try {
      const response = await fetch('/api/community/active-poll');
      const data = await response.json();
      if (data.success && data.poll) {
        setActivePoll(data.poll);
        // Check if user has voted
        if (userEmail && data.poll.user_votes) {
          const vote = data.poll.user_votes.find(v => v.user_email === userEmail);
          if (vote) setUserVote(vote.option_id);
        }
      }
    } catch (error) {
      console.error('Failed to load poll:', error);
    }
  };

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/community/challenges');
      const data = await response.json();
      if (data.success) {
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  };

  const handleVote = async (optionId) => {
    if (!userEmail) {
      alert('Please sign in to vote');
      return;
    }

    try {
      const response = await fetch('/api/community/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poll_id: activePoll.id,
          option_id: optionId,
          user_email: userEmail
        })
      });

      if (response.ok) {
        setUserVote(optionId);
        fetchActivePoll(); // Refresh to get updated vote counts
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Poll */}
      {activePoll && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>📊</span>
                Community Poll
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{activePoll.question}</p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          <div className="space-y-2">
            {activePoll.options && activePoll.options.map((option) => {
              const totalVotes = activePoll.total_votes || 0;
              const optionVotes = option.votes || 0;
              const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
              const isUserVote = userVote === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => !userVote && handleVote(option.id)}
                  disabled={!!userVote}
                  className={`w-full p-3 rounded-lg border transition-all relative overflow-hidden ${
                    isUserVote
                      ? 'border-primary bg-primary/10'
                      : userVote
                      ? 'border-border bg-foreground/5 cursor-not-allowed'
                      : 'border-border hover:border-primary/50 hover:bg-foreground/5'
                  }`}
                >
                  {/* Vote percentage background */}
                  {userVote && (
                    <div
                      className="absolute inset-0 bg-primary/10 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  )}

                  <div className="relative flex items-center justify-between">
                    <span className="font-medium">{option.text}</span>
                    {userVote && (
                      <span className="text-sm text-muted-foreground">
                        {percentage}% ({optionVotes})
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {userVote && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Thanks for voting! {activePoll.total_votes || 0} total votes
            </p>
          )}
        </motion.div>
      )}

      {/* Weekly Challenges */}
      {challenges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🎯</span>
            Community Challenges
          </h3>

          <div className="space-y-3">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      <span>{challenge.icon || '⭐'}</span>
                      {challenge.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {challenge.description}
                    </p>
                    {challenge.reward && (
                      <Badge variant="secondary" className="mt-2">
                        Reward: {challenge.reward}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline">
                    Join
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder for when there are no challenges */}
      {!activePoll && challenges.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active polls or challenges right now. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
