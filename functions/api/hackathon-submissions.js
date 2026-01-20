/**
 * Cloudflare Pages Function: /api/hackathon-submissions
 * Manage hackathon project submissions
 */

import { hashWallet } from '../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/hackathon-submissions?eventId={id} - Get all submissions for a hackathon
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const eventId = url.searchParams.get('eventId');

    if (!eventId) {
      return jsonResponse({ error: 'Missing eventId parameter' }, 400);
    }

    // Verify event exists and is a hackathon
    const event = await context.env.DB.prepare(
      `SELECT id, title, event_type FROM events WHERE id = ?`
    )
      .bind(eventId)
      .first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    if (event.event_type !== 'hackathon') {
      return jsonResponse({ error: 'Event is not a hackathon' }, 400);
    }

    // Get all submissions for the hackathon
    const { results: submissions } = await context.env.DB.prepare(
      `SELECT
        s.id,
        s.project_title,
        s.project_description,
        s.project_url,
        s.demo_video_url,
        s.github_url,
        s.submitted_by,
        s.submitted_at,
        s.team_id,
        t.team_name,
        s.user_wallet_hash
       FROM hackathon_submissions s
       LEFT JOIN hackathon_teams t ON s.team_id = t.id
       WHERE s.event_id = ?
       ORDER BY s.submitted_at DESC`
    )
      .bind(eventId)
      .all();

    // Get team members for team submissions
    const submissionsWithDetails = await Promise.all(submissions.map(async (sub) => {
      let teamMembers = [];
      if (sub.team_id) {
        const { results: members } = await context.env.DB.prepare(
          `SELECT
            tm.id,
            u.display_name,
            u.email
           FROM team_members tm
           LEFT JOIN users u ON tm.user_wallet_hash = u.wallet_hash
           WHERE tm.team_id = ?`
        )
          .bind(sub.team_id)
          .all();

        teamMembers = members.map(m => ({
          displayName: m.display_name || 'Anonymous',
          email: m.email
        }));
      }

      return {
        id: sub.id,
        projectTitle: sub.project_title,
        projectDescription: sub.project_description,
        projectUrl: sub.project_url,
        demoVideoUrl: sub.demo_video_url,
        githubUrl: sub.github_url,
        submittedBy: sub.submitted_by,
        submittedAt: sub.submitted_at,
        teamId: sub.team_id,
        teamName: sub.team_name,
        teamMembers,
        isTeamSubmission: !!sub.team_id
      };
    }));

    return jsonResponse({
      event: {
        id: event.id,
        title: event.title
      },
      submissions: submissionsWithDetails
    });
  } catch (error) {
    console.error('Get hackathon submissions error:', error);
    return jsonResponse({ error: 'Failed to fetch submissions' }, 500);
  }
}

/**
 * POST /api/hackathon-submissions - Submit a project
 */
export async function onRequestPost(context) {
  try {
    const {
      eventId,
      walletAddress,
      teamId,
      projectTitle,
      projectDescription,
      projectUrl,
      demoVideoUrl,
      githubUrl
    } = await context.request.json();

    // Validate required fields
    if (!eventId || !walletAddress || !projectTitle || !projectDescription) {
      return jsonResponse({
        error: 'Required fields: eventId, walletAddress, projectTitle, projectDescription'
      }, 400);
    }

    const walletHash = await hashWallet(walletAddress);

    // Verify event exists and is a hackathon
    const event = await context.env.DB.prepare(
      `SELECT id, title, event_type FROM events WHERE id = ?`
    )
      .bind(eventId)
      .first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    if (event.event_type !== 'hackathon') {
      return jsonResponse({ error: 'Event is not a hackathon' }, 400);
    }

    // Check if user has RSVP'd for the hackathon
    const rsvp = await context.env.DB.prepare(
      `SELECT id, rsvp_status FROM rsvps WHERE event_id = ? AND user_wallet_hash = ?`
    )
      .bind(eventId, walletHash)
      .first();

    if (!rsvp || rsvp.rsvp_status !== 'going') {
      return jsonResponse({
        error: 'You must RSVP as "Going" to this hackathon before submitting a project'
      }, 403);
    }

    // Get user display name
    const user = await context.env.DB.prepare(
      `SELECT display_name FROM users WHERE wallet_hash = ?`
    )
      .bind(walletHash)
      .first();

    const submittedBy = user?.display_name || 'Anonymous';

    // If teamId provided, verify user is in the team
    if (teamId) {
      const teamMembership = await context.env.DB.prepare(
        `SELECT tm.id, tm.role, t.event_id
         FROM team_members tm
         JOIN hackathon_teams t ON tm.team_id = t.id
         WHERE tm.team_id = ? AND tm.user_wallet_hash = ?`
      )
        .bind(teamId, walletHash)
        .first();

      if (!teamMembership) {
        return jsonResponse({
          error: 'You are not a member of this team'
        }, 403);
      }

      if (teamMembership.event_id !== eventId) {
        return jsonResponse({
          error: 'Team does not belong to this hackathon'
        }, 400);
      }

      // Check if team already submitted
      const existingSubmission = await context.env.DB.prepare(
        `SELECT id FROM hackathon_submissions WHERE event_id = ? AND team_id = ?`
      )
        .bind(eventId, teamId)
        .first();

      if (existingSubmission) {
        return jsonResponse({
          error: 'Your team has already submitted a project'
        }, 409);
      }
    } else {
      // Check if individual user already submitted
      const existingSubmission = await context.env.DB.prepare(
        `SELECT id FROM hackathon_submissions WHERE event_id = ? AND user_wallet_hash = ? AND team_id IS NULL`
      )
        .bind(eventId, walletHash)
        .first();

      if (existingSubmission) {
        return jsonResponse({
          error: 'You have already submitted a project'
        }, 409);
      }
    }

    // Create the submission
    const result = await context.env.DB.prepare(
      `INSERT INTO hackathon_submissions
       (event_id, team_id, user_wallet_hash, project_title, project_description, project_url, demo_video_url, github_url, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        eventId,
        teamId || null,
        teamId ? null : walletHash,
        projectTitle,
        projectDescription,
        projectUrl || null,
        demoVideoUrl || null,
        githubUrl || null,
        submittedBy
      )
      .run();

    return jsonResponse({
      success: true,
      submissionId: result.meta.last_row_id,
      message: 'Project submitted successfully'
    }, 201);
  } catch (error) {
    console.error('Submit project error:', error);
    return jsonResponse({ error: 'Failed to submit project' }, 500);
  }
}

/**
 * PUT /api/hackathon-submissions - Update a submission
 */
export async function onRequestPut(context) {
  try {
    const {
      submissionId,
      walletAddress,
      projectTitle,
      projectDescription,
      projectUrl,
      demoVideoUrl,
      githubUrl
    } = await context.request.json();

    if (!submissionId || !walletAddress) {
      return jsonResponse({
        error: 'Required fields: submissionId, walletAddress'
      }, 400);
    }

    const walletHash = await hashWallet(walletAddress);

    // Get the submission
    const submission = await context.env.DB.prepare(
      `SELECT s.id, s.team_id, s.user_wallet_hash, t.event_id
       FROM hackathon_submissions s
       LEFT JOIN hackathon_teams t ON s.team_id = t.id
       WHERE s.id = ?`
    )
      .bind(submissionId)
      .first();

    if (!submission) {
      return jsonResponse({ error: 'Submission not found' }, 404);
    }

    // Verify user has permission to update
    if (submission.team_id) {
      // Check if user is a member of the team
      const teamMembership = await context.env.DB.prepare(
        `SELECT id FROM team_members WHERE team_id = ? AND user_wallet_hash = ?`
      )
        .bind(submission.team_id, walletHash)
        .first();

      if (!teamMembership) {
        return jsonResponse({
          error: 'You do not have permission to update this submission'
        }, 403);
      }
    } else {
      // Check if user owns the submission
      if (submission.user_wallet_hash !== walletHash) {
        return jsonResponse({
          error: 'You do not have permission to update this submission'
        }, 403);
      }
    }

    // Update the submission
    await context.env.DB.prepare(
      `UPDATE hackathon_submissions
       SET project_title = ?,
           project_description = ?,
           project_url = ?,
           demo_video_url = ?,
           github_url = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        projectTitle,
        projectDescription,
        projectUrl || null,
        demoVideoUrl || null,
        githubUrl || null,
        submissionId
      )
      .run();

    return jsonResponse({
      success: true,
      message: 'Submission updated successfully'
    });
  } catch (error) {
    console.error('Update submission error:', error);
    return jsonResponse({ error: 'Failed to update submission' }, 500);
  }
}

/**
 * DELETE /api/hackathon-submissions?submissionId={id}&walletAddress={addr} - Delete a submission
 */
export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const submissionId = url.searchParams.get('submissionId');
    const walletAddress = url.searchParams.get('walletAddress');

    if (!submissionId || !walletAddress) {
      return jsonResponse({
        error: 'Missing submissionId or walletAddress parameter'
      }, 400);
    }

    const walletHash = await hashWallet(walletAddress);

    // Get the submission
    const submission = await context.env.DB.prepare(
      `SELECT id, team_id, user_wallet_hash FROM hackathon_submissions WHERE id = ?`
    )
      .bind(submissionId)
      .first();

    if (!submission) {
      return jsonResponse({ error: 'Submission not found' }, 404);
    }

    // Verify user has permission to delete
    if (submission.team_id) {
      // Check if user is team leader
      const teamMembership = await context.env.DB.prepare(
        `SELECT id, role FROM team_members WHERE team_id = ? AND user_wallet_hash = ?`
      )
        .bind(submission.team_id, walletHash)
        .first();

      if (!teamMembership || teamMembership.role !== 'leader') {
        return jsonResponse({
          error: 'Only team leaders can delete team submissions'
        }, 403);
      }
    } else {
      // Check if user owns the submission
      if (submission.user_wallet_hash !== walletHash) {
        return jsonResponse({
          error: 'You do not have permission to delete this submission'
        }, 403);
      }
    }

    // Delete the submission
    await context.env.DB.prepare(
      `DELETE FROM hackathon_submissions WHERE id = ?`
    )
      .bind(submissionId)
      .run();

    return jsonResponse({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete submission error:', error);
    return jsonResponse({ error: 'Failed to delete submission' }, 500);
  }
}
