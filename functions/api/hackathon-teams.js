/**
 * Cloudflare Pages Function: /api/hackathon-teams
 * Manage hackathon teams - create, join, leave, and list teams
 */

import { hashWallet } from '../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/hackathon-teams?eventId={id} - Get all teams for a hackathon
 * GET /api/hackathon-teams?eventId={id}&walletAddress={addr} - Get user's team for a hackathon
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const eventId = url.searchParams.get('eventId');
    const walletAddress = url.searchParams.get('walletAddress');

    if (!eventId) {
      return jsonResponse({ error: 'Missing eventId parameter' }, 400);
    }

    let walletHash = null;
    if (walletAddress) {
      walletHash = await hashWallet(walletAddress);
    }

    // Get all teams for the hackathon with member counts
    const { results: teams } = await context.env.DB.prepare(
      `SELECT
        t.id,
        t.team_name,
        t.description,
        t.max_members,
        t.created_by,
        t.created_at,
        COUNT(tm.id) as member_count
       FROM hackathon_teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE t.event_id = ?
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    )
      .bind(eventId)
      .all();

    // If walletAddress provided, get members for each team and identify user's team
    let userTeam = null;
    const teamsWithMembers = await Promise.all(teams.map(async (team) => {
      const { results: members } = await context.env.DB.prepare(
        `SELECT
          tm.id,
          tm.role,
          tm.joined_at,
          u.display_name,
          u.email
         FROM team_members tm
         LEFT JOIN users u ON tm.user_wallet_hash = u.wallet_hash
         WHERE tm.team_id = ?
         ORDER BY tm.role DESC, tm.joined_at ASC`
      )
        .bind(team.id)
        .all();

      const teamData = {
        id: team.id,
        teamName: team.team_name,
        description: team.description,
        maxMembers: team.max_members,
        memberCount: team.member_count,
        createdBy: team.created_by,
        createdAt: team.created_at,
        members: members.map(m => ({
          id: m.id,
          role: m.role,
          displayName: m.display_name || 'Anonymous',
          email: m.email,
          joinedAt: m.joined_at
        })),
        isFull: team.member_count >= team.max_members
      };

      // Check if user is in this team
      if (walletHash) {
        const userInTeam = await context.env.DB.prepare(
          `SELECT id FROM team_members WHERE team_id = ? AND user_wallet_hash = ?`
        )
          .bind(team.id, walletHash)
          .first();

        if (userInTeam) {
          userTeam = teamData;
        }
      }

      return teamData;
    }));

    return jsonResponse({
      teams: teamsWithMembers,
      userTeam
    });
  } catch (error) {
    console.error('Get hackathon teams error:', error);
    return jsonResponse({ error: 'Failed to fetch teams' }, 500);
  }
}

/**
 * POST /api/hackathon-teams - Create a new team
 */
export async function onRequestPost(context) {
  try {
    const { eventId, walletAddress, teamName, description, maxMembers } = await context.request.json();

    if (!eventId || !walletAddress || !teamName) {
      return jsonResponse({
        error: 'Required fields: eventId, walletAddress, teamName'
      }, 400);
    }

    const walletHash = await hashWallet(walletAddress);

    // Check if user has RSVP'd to the hackathon
    const rsvp = await context.env.DB.prepare(
      `SELECT id, rsvp_status FROM rsvps WHERE event_id = ? AND user_wallet_hash = ?`
    )
      .bind(eventId, walletHash)
      .first();

    if (!rsvp || rsvp.rsvp_status !== 'going') {
      return jsonResponse({
        error: 'You must RSVP as "Going" to this hackathon before creating a team'
      }, 403);
    }

    // Check if user is already in a team for this hackathon
    const existingTeamMembership = await context.env.DB.prepare(
      `SELECT tm.id
       FROM team_members tm
       JOIN hackathon_teams t ON tm.team_id = t.id
       WHERE t.event_id = ? AND tm.user_wallet_hash = ?`
    )
      .bind(eventId, walletHash)
      .first();

    if (existingTeamMembership) {
      return jsonResponse({
        error: 'You are already in a team for this hackathon'
      }, 409);
    }

    // Get user display name
    const user = await context.env.DB.prepare(
      `SELECT display_name FROM users WHERE wallet_hash = ?`
    )
      .bind(walletHash)
      .first();

    // Create the team
    const teamResult = await context.env.DB.prepare(
      `INSERT INTO hackathon_teams
       (event_id, team_name, description, max_members, created_by)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        eventId,
        teamName,
        description || null,
        maxMembers || 5,
        user?.display_name || 'Anonymous'
      )
      .run();

    const teamId = teamResult.meta.last_row_id;

    // Add creator as team leader
    await context.env.DB.prepare(
      `INSERT INTO team_members (team_id, user_wallet_hash, role) VALUES (?, ?, 'leader')`
    )
      .bind(teamId, walletHash)
      .run();

    return jsonResponse({
      success: true,
      teamId,
      message: 'Team created successfully'
    }, 201);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return jsonResponse({ error: 'A team with this name already exists for this hackathon' }, 409);
    }
    console.error('Create hackathon team error:', error);
    return jsonResponse({ error: 'Failed to create team' }, 500);
  }
}

/**
 * PUT /api/hackathon-teams - Join or leave a team
 */
export async function onRequestPut(context) {
  try {
    const { teamId, walletAddress, action } = await context.request.json();

    if (!teamId || !walletAddress || !action) {
      return jsonResponse({
        error: 'Required fields: teamId, walletAddress, action (join|leave)'
      }, 400);
    }

    if (!['join', 'leave'].includes(action)) {
      return jsonResponse({
        error: 'Action must be "join" or "leave"'
      }, 400);
    }

    const walletHash = await hashWallet(walletAddress);

    // Get team and verify it exists
    const team = await context.env.DB.prepare(
      `SELECT
        t.id,
        t.event_id,
        t.max_members,
        COUNT(tm.id) as member_count
       FROM hackathon_teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE t.id = ?
       GROUP BY t.id`
    )
      .bind(teamId)
      .first();

    if (!team) {
      return jsonResponse({ error: 'Team not found' }, 404);
    }

    // Check if user has RSVP'd to the hackathon
    const rsvp = await context.env.DB.prepare(
      `SELECT id, rsvp_status FROM rsvps WHERE event_id = ? AND user_wallet_hash = ?`
    )
      .bind(team.event_id, walletHash)
      .first();

    if (!rsvp || rsvp.rsvp_status !== 'going') {
      return jsonResponse({
        error: 'You must RSVP as "Going" to this hackathon before joining a team'
      }, 403);
    }

    if (action === 'join') {
      // Check if team is full
      if (team.member_count >= team.max_members) {
        return jsonResponse({ error: 'Team is full' }, 409);
      }

      // Check if user is already in another team for this hackathon
      const existingTeamMembership = await context.env.DB.prepare(
        `SELECT tm.id, t.team_name
         FROM team_members tm
         JOIN hackathon_teams t ON tm.team_id = t.id
         WHERE t.event_id = ? AND tm.user_wallet_hash = ?`
      )
        .bind(team.event_id, walletHash)
        .first();

      if (existingTeamMembership) {
        return jsonResponse({
          error: `You are already in team "${existingTeamMembership.team_name}" for this hackathon`
        }, 409);
      }

      // Add user to team
      await context.env.DB.prepare(
        `INSERT INTO team_members (team_id, user_wallet_hash, role) VALUES (?, ?, 'member')`
      )
        .bind(teamId, walletHash)
        .run();

      return jsonResponse({
        success: true,
        message: 'Joined team successfully'
      });
    } else if (action === 'leave') {
      // Check if user is in the team
      const membership = await context.env.DB.prepare(
        `SELECT id, role FROM team_members WHERE team_id = ? AND user_wallet_hash = ?`
      )
        .bind(teamId, walletHash)
        .first();

      if (!membership) {
        return jsonResponse({ error: 'You are not in this team' }, 404);
      }

      // If user is the leader and there are other members, prevent leaving
      if (membership.role === 'leader' && team.member_count > 1) {
        return jsonResponse({
          error: 'Team leaders cannot leave while there are other members. Transfer leadership or disband the team first.'
        }, 409);
      }

      // Remove user from team
      await context.env.DB.prepare(
        `DELETE FROM team_members WHERE team_id = ? AND user_wallet_hash = ?`
      )
        .bind(teamId, walletHash)
        .run();

      // If that was the last member, delete the team
      if (team.member_count <= 1) {
        await context.env.DB.prepare(
          `DELETE FROM hackathon_teams WHERE id = ?`
        )
          .bind(teamId)
          .run();
      }

      return jsonResponse({
        success: true,
        message: 'Left team successfully'
      });
    }
  } catch (error) {
    console.error('Team action error:', error);
    return jsonResponse({ error: 'Failed to perform action' }, 500);
  }
}

/**
 * DELETE /api/hackathon-teams?teamId={id}&walletAddress={addr} - Delete a team (leader only)
 */
export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const teamId = url.searchParams.get('teamId');
    const walletAddress = url.searchParams.get('walletAddress');

    if (!teamId || !walletAddress) {
      return jsonResponse({
        error: 'Missing teamId or walletAddress parameter'
      }, 400);
    }

    const walletHash = await hashWallet(walletAddress);

    // Verify user is the team leader
    const membership = await context.env.DB.prepare(
      `SELECT id, role FROM team_members WHERE team_id = ? AND user_wallet_hash = ?`
    )
      .bind(teamId, walletHash)
      .first();

    if (!membership) {
      return jsonResponse({ error: 'You are not in this team' }, 404);
    }

    if (membership.role !== 'leader') {
      return jsonResponse({ error: 'Only team leaders can delete teams' }, 403);
    }

    // Delete the team (cascade will delete team members)
    await context.env.DB.prepare(
      `DELETE FROM hackathon_teams WHERE id = ?`
    )
      .bind(teamId)
      .run();

    return jsonResponse({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    return jsonResponse({ error: 'Failed to delete team' }, 500);
  }
}
