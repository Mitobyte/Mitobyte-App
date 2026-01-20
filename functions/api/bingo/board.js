/**
 * Cloudflare Pages Function: /api/bingo/board
 * Get or create a user's networking bingo board
 */

import { hashWallet } from '../../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * GET /api/bingo/board - Get user's active bingo board or create new one
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const walletAddress = url.searchParams.get('walletAddress');

    if (!walletAddress) {
      return jsonResponse({ error: 'Missing walletAddress parameter' }, 400);
    }

    const hashedWallet = await hashWallet(walletAddress);

    // Check if user has an active board
    const existingBoard = await context.env.DB.prepare(
      `SELECT id, board_layout, created_at, completed_at, is_active, board_name
       FROM bingo_boards
       WHERE user_wallet_hash = ? AND is_active = 1
       ORDER BY created_at DESC
       LIMIT 1`
    )
      .bind(hashedWallet)
      .first();

    let boardId;
    let boardLayout;

    if (existingBoard) {
      // Use existing board
      boardId = existingBoard.id;
      boardLayout = JSON.parse(existingBoard.board_layout);
    } else {
      // Create new board
      // Get all active squares
      const { results: allSquares } = await context.env.DB.prepare(
        `SELECT id FROM bingo_squares WHERE is_active = 1`
      ).all();

      if (allSquares.length < 25) {
        return jsonResponse({ error: 'Not enough active bingo squares to create a board' }, 500);
      }

      // Shuffle and take 25 squares
      const shuffledSquares = shuffleArray(allSquares);
      const selectedSquares = shuffledSquares.slice(0, 25);

      // Ensure center square (position 12) is the free space
      const freeSpaceSquare = await context.env.DB.prepare(
        `SELECT id FROM bingo_squares WHERE requirement_type = 'free' LIMIT 1`
      ).first();

      if (freeSpaceSquare) {
        // Swap the center position with free space
        const freeSpaceIndex = selectedSquares.findIndex(s => s.id === freeSpaceSquare.id);
        if (freeSpaceIndex !== -1 && freeSpaceIndex !== 12) {
          [selectedSquares[12], selectedSquares[freeSpaceIndex]] = [selectedSquares[freeSpaceIndex], selectedSquares[12]];
        }
      }

      boardLayout = selectedSquares.map(s => s.id);

      // Create board
      const result = await context.env.DB.prepare(
        `INSERT INTO bingo_boards (user_wallet_hash, board_layout, board_name)
         VALUES (?, ?, ?)`
      )
        .bind(hashedWallet, JSON.stringify(boardLayout), 'My Networking Board')
        .run();

      boardId = result.meta.last_row_id;

      // Auto-complete free space if it exists
      if (freeSpaceSquare) {
        await context.env.DB.prepare(
          `INSERT INTO bingo_completions (board_id, square_id, matched_user_wallet_hash, position, verification_confidence)
           VALUES (?, ?, ?, 12, 1.0)`
        )
          .bind(boardId, freeSpaceSquare.id, hashedWallet)
          .run();
      }
    }

    // Get full square details in board order
    const { results: completions } = await context.env.DB.prepare(
      `SELECT square_id, position, matched_user_wallet_hash, completed_at
       FROM bingo_completions
       WHERE board_id = ?`
    )
      .bind(boardId)
      .all();

    const completionMap = {};
    completions.forEach(c => {
      completionMap[c.position] = c;
    });

    // Build squares array with completion status
    const squares = [];
    for (let i = 0; i < boardLayout.length; i++) {
      const squareId = boardLayout[i];
      const square = await context.env.DB.prepare(
        `SELECT id, goal_text, requirement_type, requirement_value, category, difficulty, points
         FROM bingo_squares
         WHERE id = ?`
      )
        .bind(squareId)
        .first();

      if (square) {
        const completion = completionMap[i];
        squares.push({
          ...square,
          is_completed: !!completion,
          completed_at: completion?.completed_at || null,
          position: i
        });
      }
    }

    // Calculate stats
    const completedSquares = squares.filter(s => s.is_completed).length;
    const totalPoints = squares
      .filter(s => s.is_completed)
      .reduce((sum, s) => sum + s.points, 0);

    // Check for bingos
    let bingosCompleted = 0;

    // Check rows
    for (let row = 0; row < 5; row++) {
      const rowSquares = squares.slice(row * 5, (row + 1) * 5);
      if (rowSquares.every(s => s.is_completed)) bingosCompleted++;
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      const colSquares = squares.filter((_, i) => i % 5 === col);
      if (colSquares.every(s => s.is_completed)) bingosCompleted++;
    }

    // Check diagonals
    const diagonal1 = [0, 6, 12, 18, 24].map(i => squares[i]);
    if (diagonal1.every(s => s.is_completed)) bingosCompleted++;

    const diagonal2 = [4, 8, 12, 16, 20].map(i => squares[i]);
    if (diagonal2.every(s => s.is_completed)) bingosCompleted++;

    return jsonResponse({
      success: true,
      board: {
        id: boardId,
        squares,
        created_at: existingBoard?.created_at || new Date().toISOString()
      },
      stats: {
        totalSquares: 25,
        completedSquares,
        totalPoints,
        bingosCompleted
      }
    });
  } catch (error) {
    console.error('Bingo board error:', error);
    return jsonResponse({ error: 'Failed to load bingo board' }, 500);
  }
}
