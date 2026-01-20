/**
 * Sponsor Analytics API
 * Provides anonymous event analytics data for sponsors
 * No personal user information is exposed
 */

import { hashWallet } from '../utils/encryption.js';

export async function onRequestGet({ request, env }) {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const authValue = authHeader.substring(7)
    let user;

    // Check if authentication is email-based or wallet-based
    if (authValue.startsWith('email:')) {
      const email = authValue.substring(6)
      user = await env.DB.prepare(
        `SELECT id, email, is_sponsor FROM users WHERE email = ?`
      ).bind(email).first()
    } else if (authValue.includes('@')) {
      user = await env.DB.prepare(
        `SELECT id, email, is_sponsor FROM users WHERE email = ?`
      ).bind(authValue).first()
    } else {
      const walletHash = await hashWallet(authValue)
      user = await env.DB.prepare(
        `SELECT id, email, is_sponsor FROM users WHERE wallet_hash = ?`
      ).bind(walletHash).first()
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (user.is_sponsor !== 1) {
      return new Response(JSON.stringify({
        error: 'Access denied. Sponsor role required.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const analytics = await getSponsorAnalytics(env)

    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching sponsor analytics:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch analytics',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function getSponsorAnalytics(env) {
  // Get event statistics
  const events = await env.DB.prepare(`
    SELECT
      e.id,
      e.title,
      e.description,
      e.event_type,
      e.date,
      e.location,
      e.capacity,
      e.check_in_form_id,
      e.feedback_form_id,
      e.created_at,
      COUNT(DISTINCT r.id) as rsvp_count,
      COUNT(DISTINCT c.id) as check_in_count,
      COUNT(DISTINCT f.id) as feedback_count
    FROM events e
    LEFT JOIN rsvps r ON e.id = r.event_id
    LEFT JOIN checkins c ON e.id = c.event_id
    LEFT JOIN event_feedback f ON e.id = f.event_id
    GROUP BY e.id
    ORDER BY e.date DESC
  `).all()

  // Get form data for each event
  const formDataByEvent = {}
  for (const event of events.results) {
    console.log(`\n=== Processing Event ID ${event.id}: ${event.title} ===`)
    console.log(`Check-in Form ID: ${event.check_in_form_id}`)
    console.log(`Feedback Form ID: ${event.feedback_form_id}`)

    const formData = {
      checkIn: null,
      feedback: null
    }

    // Get check-in form data
    if (event.check_in_form_id) {
      console.log(`Fetching check-in form data for form ID ${event.check_in_form_id}...`)
      formData.checkIn = await getFormData(env, event.id, event.check_in_form_id, 'check-in')
      console.log(`Check-in form data result:`, formData.checkIn ? `${formData.checkIn.totalResponses} responses, ${formData.checkIn.fields?.length} fields` : 'NULL')
    }

    // Get feedback form data
    if (event.feedback_form_id) {
      console.log(`Fetching feedback form data for form ID ${event.feedback_form_id}...`)
      formData.feedback = await getFormData(env, event.id, event.feedback_form_id, 'feedback')
      console.log(`Feedback form data result:`, formData.feedback ? `${formData.feedback.totalResponses} responses, ${formData.feedback.fields?.length} fields` : 'NULL')
    }

    formDataByEvent[event.id] = formData
    console.log(`Event ${event.id} form data:`, JSON.stringify(formData, null, 2))
  }

  // Calculate overall statistics
  const totalEvents = events.results.length
  const totalRSVPs = events.results.reduce((sum, e) => sum + (e.rsvp_count || 0), 0)
  const totalCheckIns = events.results.reduce((sum, e) => sum + (e.check_in_count || 0), 0)

  const upcomingEvents = events.results.filter(e => new Date(e.date) >= new Date()).length
  const pastEvents = events.results.filter(e => new Date(e.date) < new Date()).length

  // Event type distribution
  const eventTypeStats = events.results.reduce((acc, event) => {
    const type = event.event_type || 'other'
    if (!acc[type]) {
      acc[type] = { count: 0, rsvps: 0, checkIns: 0 }
    }
    acc[type].count++
    acc[type].rsvps += event.rsvp_count || 0
    acc[type].checkIns += event.check_in_count || 0
    return acc
  }, {})

  // Monthly activity trends
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const monthlyActivity = events.results
    .filter(e => new Date(e.date) >= sixMonthsAgo)
    .reduce((acc, event) => {
      const month = new Date(event.date).toISOString().substring(0, 7)
      if (!acc[month]) {
        acc[month] = { events: 0, rsvps: 0, checkIns: 0 }
      }
      acc[month].events++
      acc[month].rsvps += event.rsvp_count || 0
      acc[month].checkIns += event.check_in_count || 0
      return acc
    }, {})

  const avgRSVPsPerEvent = totalEvents > 0 ? Math.round(totalRSVPs / totalEvents) : 0
  const avgCheckInsPerEvent = totalEvents > 0 ? Math.round(totalCheckIns / totalEvents) : 0
  const avgAttendanceRate = totalRSVPs > 0 ? Math.round((totalCheckIns / totalRSVPs) * 100) : 0

  console.log('\n📊 SUMMARY STATISTICS:')
  console.log(`Total Events: ${totalEvents}`)
  console.log(`Total RSVPs: ${totalRSVPs}`)
  console.log(`Total Check-ins: ${totalCheckIns}`)
  console.log(`Avg RSVPs per Event: ${avgRSVPsPerEvent}`)
  console.log(`Avg Check-ins per Event: ${avgCheckInsPerEvent}`)
  console.log(`Attendance Rate Calculation: (${totalCheckIns} / ${totalRSVPs}) * 100 = ${avgAttendanceRate}%`)

  // Debug individual event attendance rates
  console.log('\n📋 Individual Event Stats:')
  events.results.forEach(e => {
    const rate = e.rsvp_count > 0 ? Math.round((e.check_in_count / e.rsvp_count) * 100) : 0
    console.log(`  Event ${e.id}: ${e.check_in_count} check-ins / ${e.rsvp_count} RSVPs = ${rate}%`)
  })

  return {
    summary: {
      totalEvents,
      upcomingEvents,
      pastEvents,
      totalRSVPs,
      totalCheckIns,
      avgRSVPsPerEvent,
      avgCheckInsPerEvent,
      avgAttendanceRate
    },
    eventTypeStats,
    monthlyActivity,
    events: events.results.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventType: e.event_type,
      date: e.date,
      location: e.location,
      capacity: e.capacity,
      rsvpCount: e.rsvp_count || 0,
      checkInCount: e.check_in_count || 0,
      feedbackCount: e.feedback_count || 0,
      attendanceRate: e.rsvp_count > 0 ? Math.round((e.check_in_count / e.rsvp_count) * 100) : 0,
      capacityUtilization: e.capacity > 0 ? Math.round((e.rsvp_count / e.capacity) * 100) : 0,
      formData: formDataByEvent[e.id] || { checkIn: null, feedback: null }
    }))
  }
}

async function getFormData(env, eventId, formId, formType) {
  console.log(`  → getFormData(eventId=${eventId}, formId=${formId}, formType=${formType})`)

  // Get form definition from form_templates (not event_forms)
  const form = await env.DB.prepare(`
    SELECT questions FROM form_templates WHERE id = ?
  `).bind(formId).first()

  if (!form) {
    console.log(`  ❌ No form template found for ID ${formId}`)
    return null
  }

  console.log(`  ✓ Found form template ID ${formId}`)

  let questions
  try {
    questions = JSON.parse(form.questions)
    console.log(`  ✓ Parsed ${questions.length} questions from form template`)
    console.log(`  Questions:`, questions.map(q => `${q.id}:${q.label} (${q.type})`).join(', '))
  } catch (err) {
    console.error('  ❌ Error parsing form questions:', err)
    return null
  }

  // Get responses based on form type
  let responses
  if (formType === 'check-in') {
    console.log(`  Querying check-in responses for event ${eventId}, form ${formId}...`)
    // Check-in responses from form_responses table
    responses = await env.DB.prepare(`
      SELECT fr.responses
      FROM form_responses fr
      INNER JOIN checkins c ON fr.check_in_id = c.id
      WHERE c.event_id = ? AND fr.form_id = ?
    `).bind(eventId, formId).all()
  } else {
    console.log(`  Querying feedback responses for event ${eventId}...`)
    // Feedback responses from event_feedback table
    responses = await env.DB.prepare(`
      SELECT form_responses as responses
      FROM event_feedback
      WHERE event_id = ?
    `).bind(eventId).all()
  }

  console.log(`  Query returned ${responses.results?.length || 0} response rows`)

  if (!responses.results || responses.results.length === 0) {
    console.log(`  ⚠️ No responses found - returning empty fields`)
    const emptyResult = {
      formType,
      totalResponses: 0,
      fields: questions.map(q => ({
        id: q.id,
        label: q.label,
        type: q.type,
        totalResponses: 0
      }))
    }
    console.log(`  Returning:`, JSON.stringify(emptyResult, null, 2))
    return emptyResult
  }

  console.log(`  ✓ Found ${responses.results.length} responses - aggregating...`)

  // Aggregate responses by field
  const aggregated = aggregateFormResponses(questions, responses.results, formType)
  console.log(`  ✓ Aggregation complete:`, JSON.stringify(aggregated, null, 2))
  return aggregated
}

function aggregateFormResponses(questions, responseRows, formType) {
  const fieldStats = {}
  let totalResponses = 0

  // Initialize field stats
  questions.forEach(q => {
    fieldStats[q.id] = {
      id: q.id,
      label: q.label,
      type: q.type,
      options: q.options || null,
      values: [],
      valueCounts: {},
      totalResponses: 0
    }
  })

  console.log(`  Aggregating ${responseRows.length} response rows for ${questions.length} questions`)

  // Process each response
  for (const row of responseRows) {
    try {
      const responses = JSON.parse(row.responses)
      totalResponses++

      console.log(`  Response #${totalResponses}:`, responses)

      for (const [questionId, answer] of Object.entries(responses)) {
        if (!fieldStats[questionId]) {
          console.log(`  ⚠️ Unknown question ID: ${questionId}`)
          continue
        }

        fieldStats[questionId].totalResponses++

        console.log(`  Processing Q${questionId} (${fieldStats[questionId].type}): answer =`, answer, typeof answer)

        // Handle different field types
        // Check if it's a number OR a string that can be parsed as a number (for rating fields)
        const numValue = Number(answer)
        if (!isNaN(numValue) && answer !== '' && answer !== null) {
          // It's numeric (rating or number field)
          fieldStats[questionId].values.push(numValue)
          console.log(`  → Added numeric value: ${numValue}`)
        } else if (Array.isArray(answer)) {
          // Multi-select (checkbox)
          console.log(`  → Processing array with ${answer.length} items`)
          answer.forEach(val => {
            if (!fieldStats[questionId].valueCounts[val]) {
              fieldStats[questionId].valueCounts[val] = 0
            }
            fieldStats[questionId].valueCounts[val]++
          })
        } else if (answer) {
          // Text, select, radio
          const val = String(answer)
          console.log(`  → Counting text value: "${val}"`)
          if (!fieldStats[questionId].valueCounts[val]) {
            fieldStats[questionId].valueCounts[val] = 0
          }
          fieldStats[questionId].valueCounts[val]++
        }
      }
    } catch (err) {
      console.error('Error parsing response:', err)
    }
  }

  // Calculate statistics for each field
  const fields = Object.values(fieldStats).map(field => {
    console.log(`  Calculating stats for field ${field.id} (${field.type}):`, {
      totalResponses: field.totalResponses,
      numericValues: field.values,
      textCounts: field.valueCounts
    })

    const result = {
      id: field.id,
      label: field.label,
      type: field.type,
      totalResponses: field.totalResponses
    }

    if (field.type === 'number' || field.type === 'rating') {
      // Numeric fields
      console.log(`  → Numeric field with ${field.values.length} values:`, field.values)
      if (field.values.length > 0) {
        const sorted = [...field.values].sort((a, b) => a - b)
        const sum = field.values.reduce((a, b) => a + b, 0)

        result.average = Math.round((sum / field.values.length) * 10) / 10
        result.min = sorted[0]
        result.max = sorted[sorted.length - 1]
        result.median = sorted[Math.floor(sorted.length / 2)]

        // Distribution
        result.distribution = {}
        field.values.forEach(val => {
          if (!result.distribution[val]) result.distribution[val] = 0
          result.distribution[val]++
        })
        console.log(`  → Distribution:`, result.distribution)
      } else {
        console.log(`  ⚠️ No numeric values found for rating field`)
      }
    } else if (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') {
      // Choice fields - show all options with counts
      console.log(`  → Choice field with ${Object.keys(field.valueCounts).length} unique values`)
      result.options = field.options || []
      result.responses = Object.entries(field.valueCounts)
        .map(([value, count]) => ({
          value,
          count,
          percentage: field.totalResponses > 0 ? Math.round((count / field.totalResponses) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
    } else {
      // Text fields - show top responses
      console.log(`  → Text field with ${Object.keys(field.valueCounts).length} unique values`)
      result.topResponses = Object.entries(field.valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({
          value,
          count,
          percentage: field.totalResponses > 0 ? Math.round((count / field.totalResponses) * 100) : 0
        }))
    }

    return result
  })

  console.log(`  Final aggregated fields:`, fields)

  return {
    formType,
    totalResponses,
    fields
  }
}
