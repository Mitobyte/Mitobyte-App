/**
 * Email Reminder System for Cloudflare Workers
 * Implements email notifications for voting app using Cloudflare Email Workers
 * Requires Email Routing configured in Cloudflare Dashboard
 *
 * NOTE: Email functionality is optional. If email bindings are not configured,
 * these functions will gracefully fail and log warnings.
 */

// Conditional import - will be undefined if cloudflare:email is not available
// import { EmailMessage } from "cloudflare:email";
// import { createMimeMessage } from "mimetext";

/**
 * Email template configurations
 */
const EMAIL_TEMPLATES = {
  voteDeadline: {
    subject: (eventName) => `Reminder: Vote deadline approaching for ${eventName}`,
    getContent: (data) => ({
      text: `
Hi ${data.userName},

This is a reminder that the voting deadline for "${data.eventName}" is approaching.

Deadline: ${data.deadline}
Time Remaining: ${data.timeRemaining}

Don't miss your chance to vote! Visit the Mitobyte voting app to cast your vote.

${data.eventUrl ? `Event Link: ${data.eventUrl}` : ''}

Best regards,
Mitobyte Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .deadline { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Vote Deadline Reminder</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${data.userName}</strong>,</p>
      <p>This is a reminder that the voting deadline for <strong>"${data.eventName}"</strong> is approaching.</p>

      <div class="deadline">
        <p style="margin: 0;"><strong>Deadline:</strong> ${data.deadline}</p>
        <p style="margin: 10px 0 0 0;"><strong>Time Remaining:</strong> ${data.timeRemaining}</p>
      </div>

      <p>Don't miss your chance to vote! Cast your vote now.</p>
      ${data.eventUrl ? `<a href="${data.eventUrl}" class="button">Vote Now</a>` : ''}

      <p style="margin-top: 30px;">Best regards,<br>Mitobyte Team</p>
    </div>
    <div class="footer">
      <p>You're receiving this because you registered for Mitobyte events.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    })
  },

  dailyDigest: {
    subject: (date) => `Your Daily Mitobyte Digest - ${date}`,
    getContent: (data) => ({
      text: `
Hi ${data.userName},

Here's your daily digest for ${data.date}:

ACTIVE VOTES:
${data.activeVotes.map(v => `- ${v.name} (ends ${v.deadline})`).join('\n')}

YOUR RECENT ACTIVITY:
${data.recentActivity.map(a => `- ${a.action} - ${a.timestamp}`).join('\n')}

UPCOMING EVENTS:
${data.upcomingEvents.map(e => `- ${e.name} - ${e.date}`).join('\n')}

Visit the app to stay updated!

Best regards,
Mitobyte Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { color: #667eea; margin-top: 0; }
    .list-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    .list-item:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Daily Digest</h1>
      <p style="margin: 0; opacity: 0.9;">${data.date}</p>
    </div>
    <div class="content">
      <p>Hi <strong>${data.userName}</strong>,</p>

      <div class="section">
        <h2>🗳️ Active Votes</h2>
        ${data.activeVotes.map(v => `
          <div class="list-item">
            <strong>${v.name}</strong><br>
            <small>Ends: ${v.deadline}</small>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>⚡ Your Recent Activity</h2>
        ${data.recentActivity.map(a => `
          <div class="list-item">
            ${a.action}<br>
            <small>${a.timestamp}</small>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>📅 Upcoming Events</h2>
        ${data.upcomingEvents.map(e => `
          <div class="list-item">
            <strong>${e.name}</strong><br>
            <small>${e.date}</small>
          </div>
        `).join('')}
      </div>

      <p style="margin-top: 30px;">Best regards,<br>Mitobyte Team</p>
    </div>
    <div class="footer">
      <p>You're receiving this daily digest based on your notification preferences.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    })
  },

  weeklyDigest: {
    subject: (weekRange) => `Your Weekly Mitobyte Summary - ${weekRange}`,
    getContent: (data) => ({
      text: `
Hi ${data.userName},

Here's your weekly summary for ${data.weekRange}:

STATISTICS:
- Total Votes Cast: ${data.stats.totalVotes}
- Events Participated: ${data.stats.eventsParticipated}
- Check-ins: ${data.stats.checkIns}

TOP VOTED IDEAS:
${data.topIdeas.map((idea, i) => `${i + 1}. ${idea.name} (${idea.votes} votes)`).join('\n')}

COMPLETED EVENTS:
${data.completedEvents.map(e => `- ${e.name} - ${e.date}`).join('\n')}

UPCOMING THIS WEEK:
${data.upcomingThisWeek.map(e => `- ${e.name} - ${e.date}`).join('\n')}

Keep participating in the Mitobyte community!

Best regards,
Mitobyte Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 5px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-number { font-size: 32px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
    .section { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { color: #667eea; margin-top: 0; }
    .list-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    .list-item:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Your Weekly Summary</h1>
      <p style="margin: 0; opacity: 0.9;">${data.weekRange}</p>
    </div>
    <div class="content">
      <p>Hi <strong>${data.userName}</strong>,</p>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${data.stats.totalVotes}</div>
          <div class="stat-label">Total Votes</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.stats.eventsParticipated}</div>
          <div class="stat-label">Events</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${data.stats.checkIns}</div>
          <div class="stat-label">Check-ins</div>
        </div>
      </div>

      <div class="section">
        <h2>🏆 Top Voted Ideas</h2>
        ${data.topIdeas.map((idea, i) => `
          <div class="list-item">
            <strong>${i + 1}. ${idea.name}</strong><br>
            <small>${idea.votes} votes</small>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>✅ Completed Events</h2>
        ${data.completedEvents.map(e => `
          <div class="list-item">
            <strong>${e.name}</strong><br>
            <small>${e.date}</small>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>📅 Upcoming This Week</h2>
        ${data.upcomingThisWeek.map(e => `
          <div class="list-item">
            <strong>${e.name}</strong><br>
            <small>${e.date}</small>
          </div>
        `).join('')}
      </div>

      <p style="margin-top: 30px;">Keep participating in the Mitobyte community!<br><br>Best regards,<br>Mitobyte Team</p>
    </div>
    <div class="footer">
      <p>You're receiving this weekly summary based on your notification preferences.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    })
  },

  eventTriggered: {
    subject: (eventType, eventName) => {
      const subjects = {
        newVote: `New vote available: ${eventName}`,
        voteResults: `Voting results are in for ${eventName}`,
        eventCreated: `New event: ${eventName}`,
        announcementCreated: `New announcement: ${eventName}`,
        ideaCreated: `New hackathon idea submitted: ${eventName}`
      };
      return subjects[eventType] || `Mitobyte Update: ${eventName}`;
    },
    getContent: (data) => ({
      text: `
Hi ${data.userName},

${data.message}

${data.details ? `Details:\n${data.details}` : ''}

${data.actionUrl ? `Take Action: ${data.actionUrl}` : ''}

Best regards,
Mitobyte Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #667eea; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 ${data.eventTypeLabel || 'Notification'}</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${data.userName}</strong>,</p>

      <div class="message-box">
        <p>${data.message}</p>
        ${data.details ? `<p style="margin-top: 15px;"><strong>Details:</strong><br>${data.details}</p>` : ''}
      </div>

      ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">${data.actionLabel || 'View Details'}</a>` : ''}

      <p style="margin-top: 30px;">Best regards,<br>Mitobyte Team</p>
    </div>
    <div class="footer">
      <p>You're receiving this because you're subscribed to Mitobyte notifications.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    })
  }
};

/**
 * Create and send an email using Cloudflare Email Workers
 * @param {Object} emailBinding - The email binding from env (e.g., env.EMAIL_SENDER)
 * @param {string} from - Sender email address (must be verified in Email Routing)
 * @param {string} fromName - Sender name
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} textContent - Plain text content
 * @param {string} htmlContent - HTML content (optional)
 * @returns {Promise<Object>} Send result with success status
 */
export async function sendEmail(emailBinding, from, fromName, to, subject, textContent, htmlContent = null) {
  try {
    // Check if email functionality is available
    if (!emailBinding) {
      console.warn('Email binding not configured - email not sent');
      return {
        success: false,
        error: 'Email binding not configured',
        to,
        subject
      };
    }

    // Dynamically import email modules only when needed
    const { EmailMessage } = await import("cloudflare:email");
    const { createMimeMessage } = await import("mimetext");

    // Create MIME message
    const msg = createMimeMessage();
    msg.setSender({ name: fromName, addr: from });
    msg.setRecipient(to);
    msg.setSubject(subject);

    // Add plain text content
    msg.addMessage({
      contentType: "text/plain",
      data: textContent
    });

    // Add HTML content if provided
    if (htmlContent) {
      msg.addMessage({
        contentType: "text/html",
        data: htmlContent
      });
    }

    // Create email message
    const message = new EmailMessage(from, to, msg.asRaw());

    // Send email using the binding
    await emailBinding.send(message);

    return {
      success: true,
      to,
      subject,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      to,
      subject
    };
  }
}

/**
 * Send a vote deadline reminder email
 */
export async function sendVoteDeadlineReminder(emailBinding, config, userData, eventData) {
  const template = EMAIL_TEMPLATES.voteDeadline;
  const { text, html } = template.getContent({
    userName: userData.name || userData.wallet,
    eventName: eventData.name,
    deadline: new Date(eventData.deadline).toLocaleString(),
    timeRemaining: eventData.timeRemaining,
    eventUrl: eventData.url
  });

  return await sendEmail(
    emailBinding,
    config.senderEmail,
    config.senderName || 'Mitobyte',
    userData.email,
    template.subject(eventData.name),
    text,
    html
  );
}

/**
 * Send a daily digest email
 */
export async function sendDailyDigest(emailBinding, config, userData, digestData) {
  const template = EMAIL_TEMPLATES.dailyDigest;
  const { text, html } = template.getContent({
    userName: userData.name || userData.wallet,
    date: digestData.date,
    activeVotes: digestData.activeVotes || [],
    recentActivity: digestData.recentActivity || [],
    upcomingEvents: digestData.upcomingEvents || []
  });

  return await sendEmail(
    emailBinding,
    config.senderEmail,
    config.senderName || 'Mitobyte',
    userData.email,
    template.subject(digestData.date),
    text,
    html
  );
}

/**
 * Send a weekly digest email
 */
export async function sendWeeklyDigest(emailBinding, config, userData, digestData) {
  const template = EMAIL_TEMPLATES.weeklyDigest;
  const { text, html } = template.getContent({
    userName: userData.name || userData.wallet,
    weekRange: digestData.weekRange,
    stats: digestData.stats || { totalVotes: 0, eventsParticipated: 0, checkIns: 0 },
    topIdeas: digestData.topIdeas || [],
    completedEvents: digestData.completedEvents || [],
    upcomingThisWeek: digestData.upcomingThisWeek || []
  });

  return await sendEmail(
    emailBinding,
    config.senderEmail,
    config.senderName || 'Mitobyte',
    userData.email,
    template.subject(digestData.weekRange),
    text,
    html
  );
}

/**
 * Send an event-triggered email
 */
export async function sendEventTriggeredEmail(emailBinding, config, userData, eventData) {
  const template = EMAIL_TEMPLATES.eventTriggered;
  const { text, html } = template.getContent({
    userName: userData.name || userData.wallet,
    message: eventData.message,
    details: eventData.details,
    actionUrl: eventData.actionUrl,
    actionLabel: eventData.actionLabel,
    eventTypeLabel: eventData.eventTypeLabel
  });

  return await sendEmail(
    emailBinding,
    config.senderEmail,
    config.senderName || 'Mitobyte',
    userData.email,
    template.subject(eventData.eventType, eventData.eventName),
    text,
    html
  );
}

/**
 * Batch send emails to multiple recipients
 * @param {Object} emailBinding - The email binding from env
 * @param {Object} config - Email configuration
 * @param {Array} recipients - Array of recipient objects with { email, data }
 * @param {Function} emailFunction - Email sending function to use
 * @returns {Promise<Array>} Array of send results
 */
export async function batchSendEmails(emailBinding, config, recipients, emailFunction) {
  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await emailFunction(
        emailBinding,
        config,
        recipient.userData,
        recipient.eventData
      );
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to send email to ${recipient.userData.email}:`, error);
      results.push({
        success: false,
        error: error.message,
        email: recipient.userData.email
      });
    }
  }

  return results;
}

/**
 * Calculate time remaining until deadline
 */
export function calculateTimeRemaining(deadline) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate - now;

  if (diff <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${(hours % 24) > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}
