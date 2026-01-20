/**
 * Cloudflare Pages Function: /api/events/[id]/analytics
 * Provides analytics data for event check-ins and feedback
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
  });
}

/**
 * GET /api/events/[id]/analytics
 * Returns analytics data for check-ins and feedback
 */
export async function onRequestGet(context) {
  try {
    const eventId = parseInt(context.params.id);

    if (!eventId || isNaN(eventId)) {
      return jsonResponse({ error: 'Invalid event ID' }, 400);
    }

    // Verify event exists
    const event = await context.env.DB.prepare(
      `SELECT id, title, capacity, created_by FROM events WHERE id = ?`
    ).bind(eventId).first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    // Get check-in analytics
    const checkInStats = await getCheckInAnalytics(context.env.DB, eventId);

    // Get feedback analytics
    const feedbackStats = await getFeedbackAnalytics(context.env.DB, eventId);

    return jsonResponse({
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity
      },
      checkIns: checkInStats,
      feedback: feedbackStats
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return jsonResponse({ error: 'Failed to fetch analytics' }, 500);
  }
}

/**
 * Get check-in analytics for an event
 */
async function getCheckInAnalytics(db, eventId) {
  // Total check-ins
  const totalResult = await db.prepare(
    `SELECT COUNT(*) as total FROM checkins WHERE event_id = ?`
  ).bind(eventId).first();

  // Check-ins by method
  const byMethodResult = await db.prepare(
    `SELECT
      check_in_method,
      COUNT(*) as count
    FROM checkins
    WHERE event_id = ?
    GROUP BY check_in_method`
  ).bind(eventId).all();

  // Check-ins by hour (for timeline)
  const timelineResult = await db.prepare(
    `SELECT
      strftime('%Y-%m-%d %H:00:00', checked_in_at) as hour,
      COUNT(*) as count
    FROM checkins
    WHERE event_id = ?
    GROUP BY hour
    ORDER BY hour ASC`
  ).bind(eventId).all();

  // Recent check-ins (last 10)
  const recentResult = await db.prepare(
    `SELECT
      c.id,
      c.checked_in_at,
      c.check_in_method,
      u.display_name,
      u.email
    FROM checkins c
    LEFT JOIN users u ON c.user_wallet_hash = u.wallet_hash
    WHERE c.event_id = ?
    ORDER BY c.checked_in_at DESC
    LIMIT 10`
  ).bind(eventId).all();

  // Check-ins by day (for multi-day events)
  const byDayResult = await db.prepare(
    `SELECT
      date(checked_in_at) as day,
      COUNT(*) as count
    FROM checkins
    WHERE event_id = ?
    GROUP BY day
    ORDER BY day ASC`
  ).bind(eventId).all();

  return {
    total: totalResult?.total || 0,
    byMethod: byMethodResult?.results || [],
    timeline: timelineResult?.results || [],
    byDay: byDayResult?.results || [],
    recent: recentResult?.results || []
  };
}

/**
 * Get feedback analytics for an event
 */
async function getFeedbackAnalytics(db, eventId) {
  // Get event feedback form info
  const event = await db.prepare(
    `SELECT e.feedback_form_id, ft.questions, ft.title as form_title
     FROM events e
     LEFT JOIN form_templates ft ON e.feedback_form_id = ft.id
     WHERE e.id = ?`
  ).bind(eventId).first();

  let formQuestions = [];
  if (event?.questions) {
    try {
      formQuestions = JSON.parse(event.questions);
    } catch (error) {
      console.error('Error parsing form questions:', error);
    }
  }

  // Total feedback submissions
  const totalResult = await db.prepare(
    `SELECT COUNT(*) as total FROM event_feedback WHERE event_id = ?`
  ).bind(eventId).first();

  // Get all feedback responses for analysis
  const responsesResult = await db.prepare(
    `SELECT
      id,
      form_responses,
      created_at
    FROM event_feedback
    WHERE event_id = ?
    ORDER BY created_at DESC`
  ).bind(eventId).all();

  // Feedback submissions by day
  const byDayResult = await db.prepare(
    `SELECT
      date(created_at) as day,
      COUNT(*) as count
    FROM event_feedback
    WHERE event_id = ?
    GROUP BY day
    ORDER BY day ASC`
  ).bind(eventId).all();

  // Process responses to match with questions
  const processedResponses = processResponseData(
    responsesResult?.results || [],
    formQuestions
  );

  return {
    total: totalResult?.total || 0,
    byDay: byDayResult?.results || [],
    formTitle: event?.form_title || 'Event Feedback',
    questions: formQuestions,
    responses: processedResponses
  };
}

/**
 * Process feedback responses to match with form questions
 */
function processResponseData(responses, formQuestions) {
  if (!responses || responses.length === 0 || !formQuestions || formQuestions.length === 0) {
    return {
      totalSubmissions: 0,
      submissions: [],
      questionAnalytics: []
    };
  }

  // Parse all responses and organize by submission
  const submissions = responses.map(response => {
    try {
      const answers = JSON.parse(response.form_responses);
      return {
        id: response.id,
        timestamp: response.created_at,
        answers: answers
      };
    } catch (error) {
      console.error('Error parsing response:', error);
      return null;
    }
  }).filter(Boolean);

  // Build question analytics
  const questionAnalytics = formQuestions.map(question => {
    const allAnswers = submissions
      .map(s => s.answers[question.id])
      .filter(a => a !== undefined && a !== null && a !== '');

    const analytics = {
      questionId: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      responseCount: allAnswers.length,
      responseRate: submissions.length > 0
        ? ((allAnswers.length / submissions.length) * 100).toFixed(1)
        : 0
    };

    // Type-specific analytics
    switch (question.type) {
      case 'rating':
        const numericAnswers = allAnswers.filter(a => typeof a === 'number');
        analytics.average = numericAnswers.length > 0
          ? (numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length).toFixed(2)
          : 0;
        analytics.distribution = {};
        numericAnswers.forEach(rating => {
          analytics.distribution[rating] = (analytics.distribution[rating] || 0) + 1;
        });
        break;

      case 'radio':
        analytics.distribution = {};
        allAnswers.forEach(answer => {
          const key = String(answer);
          analytics.distribution[key] = (analytics.distribution[key] || 0) + 1;
        });
        break;

      case 'textarea':
      case 'text':
      case 'email':
        // For text responses, just keep the raw answers (anonymized in submissions)
        analytics.sampleResponses = allAnswers.slice(0, 10); // First 10 for preview
        break;
    }

    return analytics;
  });

  return {
    totalSubmissions: submissions.length,
    submissions: submissions,
    questionAnalytics: questionAnalytics
  };
}
