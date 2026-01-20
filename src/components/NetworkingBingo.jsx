import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import UnifiedQRScanner from './UnifiedQRScanner';

export default function NetworkingBingo({ walletAddress }) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [stats, setStats] = useState({
    totalSquares: 25,
    completedSquares: 0,
    totalPoints: 0,
    bingosCompleted: 0
  });

  useEffect(() => {
    if (walletAddress) {
      fetchOrCreateBoard();
      fetchRewards();
    }
  }, [walletAddress]);

  const fetchOrCreateBoard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bingo/board?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      if (data.success) {
        setBoard(data.board);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching bingo board:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      const response = await fetch(`/api/bingo/rewards?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();

      if (data.success) {
        setRewards(data.rewards);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const handleSquareClick = (square, position) => {
    if (square.is_completed) return; // Already completed
    setSelectedSquare({ ...square, position });
    setShowScanner(true);
  };

  const handleScanComplete = async (scannedData) => {
    if (!selectedSquare) return;

    try {
      const response = await fetch('/api/bingo/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          squareId: selectedSquare.id,
          position: selectedSquare.position,
          scannedWalletAddress: scannedData.walletAddress,
          scannedProfile: scannedData.profile
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update board with new completion
        await fetchOrCreateBoard();
        await fetchRewards();
        setShowScanner(false);
        setSelectedSquare(null);

        // Show celebration if earned rewards
        if (data.rewards && data.rewards.length > 0) {
          // TODO: Show celebration modal
          alert(`🎉 ${data.message}\n\nRewards earned:\n${data.rewards.map(r => `• ${r.reward_name}`).join('\n')}`);
        }
      } else {
        alert(`❌ ${data.error || 'Failed to claim square'}`);
      }
    } catch (error) {
      console.error('Error claiming square:', error);
      alert('Failed to claim square. Please try again.');
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-500/10 text-green-600 border-green-500/20',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      hard: 'bg-red-500/10 text-red-600 border-red-500/20'
    };
    return colors[difficulty] || colors.medium;
  };

  const getCompletionPercentage = () => {
    if (!board || !board.squares) return 0;
    const completed = board.squares.filter(s => s.is_completed).length;
    return Math.round((completed / 25) * 100);
  };

  const checkBingos = () => {
    if (!board || !board.squares) return [];
    const bingos = [];

    // Check rows
    for (let row = 0; row < 5; row++) {
      const rowSquares = board.squares.slice(row * 5, (row + 1) * 5);
      if (rowSquares.every(s => s.is_completed)) {
        bingos.push({ type: 'row', index: row });
      }
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      const colSquares = board.squares.filter((_, i) => i % 5 === col);
      if (colSquares.every(s => s.is_completed)) {
        bingos.push({ type: 'col', index: col });
      }
    }

    // Check diagonals
    const diagonal1 = [0, 6, 12, 18, 24].map(i => board.squares[i]);
    if (diagonal1.every(s => s.is_completed)) {
      bingos.push({ type: 'diagonal', index: 0 });
    }

    const diagonal2 = [4, 8, 12, 16, 20].map(i => board.squares[i]);
    if (diagonal2.every(s => s.is_completed)) {
      bingos.push({ type: 'diagonal', index: 1 });
    }

    return bingos;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-bold mb-2">Start Your Networking Bingo!</h3>
          <p className="text-muted-foreground mb-4">
            Connect with people, complete your board, and earn rewards
          </p>
          <Button onClick={fetchOrCreateBoard}>
            Create My Bingo Board
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bingos = checkBingos();
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Networking Bingo</h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-4">
          Scan QR codes to connect and complete your board!
        </p>

        {/* Progress Bar */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {stats.completedSquares} / {stats.totalSquares} squares
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span className="font-medium">{stats.totalPoints} points</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span className="font-medium">{bingos.length} BINGO{bingos.length !== 1 ? 'S' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bingo Board - 5x5 Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 max-w-3xl mx-auto">
        {board.squares.map((square, index) => {
          const row = Math.floor(index / 5);
          const col = index % 5;
          const isInWinningRow = bingos.some(b => b.type === 'row' && b.index === row);
          const isInWinningCol = bingos.some(b => b.type === 'col' && b.index === col);
          const isInWinningDiag = bingos.some(b =>
            b.type === 'diagonal' && (
              (b.index === 0 && row === col) ||
              (b.index === 1 && row + col === 4)
            )
          );
          const isInBingo = isInWinningRow || isInWinningCol || isInWinningDiag;

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              whileHover={!square.is_completed ? { scale: 1.05 } : {}}
              whileTap={!square.is_completed ? { scale: 0.95 } : {}}
              onClick={() => handleSquareClick(square, index)}
              disabled={square.is_completed}
              className={`
                aspect-square p-1.5 sm:p-2 md:p-3 rounded-md sm:rounded-lg border-2 transition-all
                flex flex-col items-center justify-center min-h-[60px] sm:min-h-[70px]
                ${square.is_completed
                  ? `bg-green-500/20 border-green-500 ${isInBingo ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`
                  : 'bg-card border-border hover:border-primary/50 active:bg-primary/5'}
                ${!square.is_completed ? 'cursor-pointer touch-manipulation' : 'cursor-default'}
              `}
            >
              {square.is_completed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-10"
                >
                  <span className="text-3xl sm:text-4xl md:text-5xl drop-shadow-md">✓</span>
                </motion.div>
              )}
              <div className={`text-center w-full ${square.is_completed ? 'opacity-50' : ''}`}>
                <p className="text-[11px] xs:text-xs sm:text-sm font-medium leading-tight line-clamp-3 px-0.5">
                  {square.goal_text}
                </p>
                <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-1">
                  <span className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground font-semibold">
                    {square.points}pts
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Rewards Section */}
      {rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🏆</span>
              <span>Your Rewards</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {rewards.map((reward, index) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20"
                >
                  <div className="text-2xl mb-2">
                    {reward.reward_type === 'badge' && '🏅'}
                    {reward.reward_type === 'raffle_entry' && '🎟️'}
                    {reward.reward_type === 'shout_out' && '📢'}
                    {reward.reward_type === 'bonus_points' && '⭐'}
                  </div>
                  <h4 className="font-medium text-sm mb-1">{reward.reward_name}</h4>
                  {reward.reward_description && (
                    <p className="text-xs text-muted-foreground">{reward.reward_description}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">How to Play</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex gap-3">
            <span className="text-xl sm:text-2xl shrink-0">1️⃣</span>
            <div>
              <p className="font-medium text-sm sm:text-base">Tap a square to start</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Choose a connection goal you want to complete</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl sm:text-2xl shrink-0">2️⃣</span>
            <div>
              <p className="font-medium text-sm sm:text-base">Scan someone's QR code</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Find someone who matches the requirement and scan their profile</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl sm:text-2xl shrink-0">3️⃣</span>
            <div>
              <p className="font-medium text-sm sm:text-base">AI verifies the match</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Our AI checks if they meet the square's criteria</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl sm:text-2xl shrink-0">4️⃣</span>
            <div>
              <p className="font-medium text-sm sm:text-base">Complete rows and earn rewards!</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Get BINGO and unlock badges, raffle entries, and more</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unified QR Scanner */}
      <UnifiedQRScanner
        isOpen={showScanner && !!selectedSquare}
        onClose={() => {
          setShowScanner(false);
          setSelectedSquare(null);
        }}
        onScan={handleScanComplete}
        mode="profile"
        config={{
          title: 'Scan to Claim Square',
          description: selectedSquare ? selectedSquare.goal_text : 'Scan a profile to claim this bingo square'
        }}
      />
    </div>
  );
}
