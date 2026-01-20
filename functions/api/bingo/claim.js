/**
 * Cloudflare Pages Function: /api/bingo/claim
 * Claim a bingo square by scanning another user's QR code with AI verification
 */

import { hashWallet } from '../../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * AI-powered verification of bingo square match
 */
async function verifySquareMatch(ai, square, scannedProfile) {
  const { requirement_type, requirement_value, goal_text } = square;

  // Build prompt for AI verification
  const prompt = `You are verifying if a person's profile matches a networking bingo square requirement.

Square Goal: "${goal_text}"
Requirement Type: ${requirement_type}
Requirement Value: ${requirement_value}

Scanned Person's Profile:
- Display Name: ${scannedProfile.displayName || 'Not provided'}
- Bio: ${scannedProfile.bio || 'Not provided'}
- School: ${scannedProfile.school || 'Not provided'}
- Skills/Tags: ${scannedProfile.tags?.join(', ') || 'Not provided'}
- Company: ${scannedProfile.company || 'Not provided'}
- Role/Title: ${scannedProfile.role || 'Not provided'}

Based on the profile information, does this person match the bingo square requirement?

Verification Rules:
- For "profession" or "tag" type: Check if their tags, role, or bio mentions the required profession
- For "school" type: Check if their school matches
- For "skill" type: Check if their tags or bio mentions the skill
- For "company_size" type: Infer from company name or bio
- For "free" type: Always matches
- For "special" type: Check exact match on email/identifier
- Be reasonably flexible with matching (e.g., "Frontend Dev" matches "Frontend Developer")
- Consider synonyms and related terms

Respond ONLY with a JSON object in this exact format:
{
  "matches": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation of why it matches or doesn't match"
}`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a verification assistant. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const responseText = response.response?.trim() || '';

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText;
    if (responseText.includes('```json')) {
      jsonText = responseText.split('```json')[1].split('```')[0].trim();
    } else if (responseText.includes('```')) {
      jsonText = responseText.split('```')[1].split('```')[0].trim();
    }

    const verification = JSON.parse(jsonText);

    return {
      matches: verification.matches === true,
      confidence: Math.min(Math.max(verification.confidence || 0.5, 0), 1),
      reason: verification.reason || 'AI verification completed'
    };
  } catch (error) {
    console.error('AI verification error:', error);

    // Fallback to rule-based verification
    return ruleBasedVerification(square, scannedProfile);
  }
}

/**
 * Fallback rule-based verification if AI fails
 */
function ruleBasedVerification(square, scannedProfile) {
  const { requirement_type, requirement_value } = square;

  // Free space always matches
  if (requirement_type === 'free') {
    return { matches: true, confidence: 1.0, reason: 'Free space' };
  }

  // Simple keyword matching for fallback
  const profileText = [
    scannedProfile.displayName,
    scannedProfile.bio,
    scannedProfile.school,
    scannedProfile.company,
    scannedProfile.role,
    ...(scannedProfile.tags || [])
  ].filter(Boolean).join(' ').toLowerCase();

  const requirementLower = requirement_value.toLowerCase();
  const matches = profileText.includes(requirementLower);

  return {
    matches,
    confidence: matches ? 0.7 : 0.3,
    reason: matches ? 'Keyword match found' : 'No keyword match'
  };
}

/**
 * Check for and award bingo rewards
 */
async function checkAndAwardRewards(db, boardId, userWalletHash) {
  const rewards = [];

  // Get all completions for this board
  const { results: completions } = await db.prepare(
    `SELECT position FROM bingo_completions WHERE board_id = ?`
  ).bind(boardId).all();

  const completedPositions = new Set(completions.map(c => c.position));

  // Check for bingos (rows, columns, diagonals)
  const bingoPatterns = [
    // Rows
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    // Columns
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
    // Diagonals
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
  ];

  const bingoNames = [
    'Top Row', 'Second Row', 'Third Row', 'Fourth Row', 'Bottom Row',
    'First Column', 'Second Column', 'Third Column', 'Fourth Column', 'Fifth Column',
    'Diagonal \\', 'Diagonal /'
  ];

  for (let i = 0; i < bingoPatterns.length; i++) {
    const pattern = bingoPatterns[i];
    if (pattern.every(pos => completedPositions.has(pos))) {
      // Check if this bingo was already rewarded
      const existing = await db.prepare(
        `SELECT id FROM bingo_rewards WHERE user_wallet_hash = ? AND reward_name = ?`
      ).bind(userWalletHash, `BINGO: ${bingoNames[i]}`).first();

      if (!existing) {
        // Award bingo reward
        await db.prepare(
          `INSERT INTO bingo_rewards (user_wallet_hash, reward_type, reward_name, reward_description, points_awarded)
           VALUES (?, 'badge', ?, ?, ?)`
        ).bind(
          userWalletHash,
          `BINGO: ${bingoNames[i]}`,
          `Completed a full ${bingoNames[i].toLowerCase()}!`,
          50
        ).run();

        rewards.push({
          type: 'badge',
          name: `BINGO: ${bingoNames[i]}`,
          points: 50
        });
      }
    }
  }

  // Milestone rewards
  const milestones = [
    { count: 5, name: 'Getting Started', description: 'Completed 5 squares', points: 25 },
    { count: 10, name: 'Networker', description: 'Completed 10 squares', points: 50 },
    { count: 15, name: 'Social Butterfly', description: 'Completed 15 squares', points: 75 },
    { count: 20, name: 'Connection Master', description: 'Completed 20 squares', points: 100 },
    { count: 25, name: 'BLACKOUT!', description: 'Completed entire board!', points: 200 }
  ];

  for (const milestone of milestones) {
    if (completedPositions.size === milestone.count) {
      const existing = await db.prepare(
        `SELECT id FROM bingo_rewards WHERE user_wallet_hash = ? AND reward_name = ?`
      ).bind(userWalletHash, milestone.name).first();

      if (!existing) {
        await db.prepare(
          `INSERT INTO bingo_rewards (user_wallet_hash, reward_type, reward_name, reward_description, points_awarded)
           VALUES (?, 'badge', ?, ?, ?)`
        ).bind(userWalletHash, milestone.name, milestone.description, milestone.points).run();

        rewards.push({
          type: 'badge',
          name: milestone.name,
          points: milestone.points
        });

        // Extra raffle entry for blackout
        if (milestone.count === 25) {
          await db.prepare(
            `INSERT INTO bingo_rewards (user_wallet_hash, reward_type, reward_name, reward_description, points_awarded)
             VALUES (?, 'raffle_entry', 'Grand Prize Entry', 'Earned for completing entire bingo board', 0)`
          ).bind(userWalletHash).run();

          rewards.push({
            type: 'raffle_entry',
            name: 'Grand Prize Entry'
          });
        }
      }
    }
  }

  return rewards;
}

/**
 * POST /api/bingo/claim - Claim a bingo square with AI verification
 */
export async function onRequestPost(context) {
  try {
    const {
      boardId,
      squareId,
      position,
      scannedWalletAddress,
      scannedProfile
    } = await context.request.json();

    if (!boardId || !squareId || position === undefined || !scannedWalletAddress || !scannedProfile) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    // Hash the scanned wallet address
    const scannedWalletHash = await hashWallet(scannedWalletAddress);

    // Get board details
    const board = await context.env.DB.prepare(
      `SELECT user_wallet_hash FROM bingo_boards WHERE id = ?`
    ).bind(boardId).first();

    if (!board) {
      return jsonResponse({ error: 'Board not found' }, 404);
    }

    // Check if square already completed
    const existingCompletion = await context.env.DB.prepare(
      `SELECT id FROM bingo_completions WHERE board_id = ? AND position = ?`
    ).bind(boardId, position).first();

    if (existingCompletion) {
      return jsonResponse({ error: 'This square is already completed' }, 409);
    }

    // Get square details
    const square = await context.env.DB.prepare(
      `SELECT * FROM bingo_squares WHERE id = ?`
    ).bind(squareId).first();

    if (!square) {
      return jsonResponse({ error: 'Square not found' }, 404);
    }

    // AI Verification
    const verification = await verifySquareMatch(context.env.AI, square, scannedProfile);

    if (!verification.matches) {
      return jsonResponse({
        error: 'Profile does not match square requirement',
        reason: verification.reason,
        confidence: verification.confidence
      }, 400);
    }

    // Create completion record
    await context.env.DB.prepare(
      `INSERT INTO bingo_completions (
        board_id, square_id, matched_user_wallet_hash, position,
        verification_confidence, verification_metadata
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        boardId,
        squareId,
        scannedWalletHash,
        position,
        verification.confidence,
        JSON.stringify({ reason: verification.reason, profile: scannedProfile.displayName })
      )
      .run();

    // Check for and award rewards
    const rewards = await checkAndAwardRewards(context.env.DB, boardId, board.user_wallet_hash);

    return jsonResponse({
      success: true,
      message: `Square claimed! ${verification.reason}`,
      verification,
      rewards
    });
  } catch (error) {
    console.error('Bingo claim error:', error);
    return jsonResponse({ error: 'Failed to claim square' }, 500);
  }
}
