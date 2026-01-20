/**
 * Documentation API
 * Serves onboarding and technical documentation for platform users
 */

const DOCS = {
  host: {
    title: "Host Guide: Getting Started",
    description: "Complete guide to hosting events on the platform",
    sections: [
      {
        id: "introduction",
        title: "Introduction to Host Role",
        content: `As a **Host**, you have special privileges to create and manage events for your community. Hosts can create Hackathons, Workshops, and Meetups, manage attendees, track analytics, and much more.

**What Hosts Can Do:**
- Create and manage events (Hackathons, Workshops, Meetups)
- Generate QR codes for check-ins and feedback
- View detailed event analytics
- Create custom form templates
- Import events via CSV
- Use AI to create events`
      },
      {
        id: "creating-events",
        title: "Creating Events",
        content: `There are three ways to create events:

**1. Manual Event Creation**
- Navigate to the Host Dashboard
- Click on the "Create Event" tab
- Fill in event details (title, description, date, time, location)
- Choose event type: Hackathon, Workshop, or Meetup
- Set capacity (optional)
- Add thumbnail URL (optional)
- Assign check-in and feedback forms

**2. Import Events via CSV**
- Click on the "Import CSV" tab
- Download the CSV template
- Fill in your event data
- Upload the CSV file
- Review and confirm the import

**3. Create with AI**
- Click on the "Create with AI" tab
- Describe your event idea in natural language
- AI will generate event details for you
- Review and customize as needed
- Submit to create the event`
      },
      {
        id: "event-types",
        title: "Event Types",
        content: `**Hackathon** 💻
Perfect for coding competitions and collaborative building sessions. Hackathons typically span multiple hours or days where participants work on projects.

**Workshop** 🎓
Educational sessions where participants learn new skills or technologies. Workshops are instructor-led and hands-on.

**Meetup** 🤝
Casual gatherings for networking, discussions, and community building. Meetups can be social events, tech talks, or casual coding sessions.`
      },
      {
        id: "recurring-events",
        title: "Recurring Events",
        content: `Create event series that repeat on a schedule:

**How to Create Recurring Events:**
1. When creating an event, enable "Recurring Event"
2. Choose frequency: Weekly, Bi-weekly, or Monthly
3. Set the number of occurrences
4. The system will automatically generate all instances

**Managing Recurring Events:**
- Edit single occurrence: Changes only that specific event
- Edit entire series: Updates all future events in the series
- Delete single occurrence: Removes only that event
- Delete entire series: Removes all events in the series

**Series Indicators:**
- 🔁 Series badge: Parent event that generates instances
- 🔁 Instance badge: Individual occurrence in a series`
      },
      {
        id: "qr-codes",
        title: "QR Codes for Check-in & Feedback",
        content: `Generate QR codes to streamline attendee check-ins and collect feedback:

**Check-in QR Codes:**
1. Assign a check-in form to your event
2. Click "Check-in QR" button on your event
3. Display or print the QR code at your venue
4. Attendees scan to check in

**Feedback QR Codes:**
1. Assign a feedback form to your event
2. Click "Feedback QR" button on your event
3. Share the QR code at the end of your event
4. Attendees scan to submit feedback

**Tips:**
- Display QR codes prominently at the venue entrance
- Include QR codes in event announcements
- Use both check-in and feedback forms for complete tracking`
      },
      {
        id: "analytics",
        title: "Event Analytics",
        content: `Track your event performance with detailed analytics:

**Available Metrics:**
- Total RSVPs and attendance
- Check-in statistics
- Attendee demographics
- Engagement metrics
- Feedback responses

**How to Access Analytics:**
1. Navigate to your Host Dashboard
2. Find your event in the event list
3. Click the "Analytics" (📊) button
4. View detailed charts and metrics

**Using Analytics:**
- Identify peak attendance times
- Understand your audience demographics
- Measure event success
- Improve future events based on feedback
- Track attendee engagement patterns`
      },
      {
        id: "form-templates",
        title: "Form Templates",
        content: `Create reusable form templates for check-ins and feedback:

**System Templates:**
The platform provides pre-built templates:
- Basic Check-in Form
- Detailed Check-in Form
- Event Feedback Form
- Workshop Evaluation Form

**Creating Custom Templates:**
1. Go to the "Form Templates" tab
2. Click "Create New Template"
3. Add form fields (text, email, select, textarea, etc.)
4. Configure field validation
5. Save and reuse across events

**Template Types:**
- **Check-in Forms:** Collect attendee information on arrival
- **Feedback Forms:** Gather post-event feedback and ratings

**Best Practices:**
- Keep check-in forms short (name, email, company)
- Make feedback forms detailed but not overwhelming
- Use consistent templates for similar events
- Include required fields for essential data`
      },
      {
        id: "event-management",
        title: "Managing Your Events",
        content: `**Viewing Events:**
- Card View: Visual cards with event details
- Table View: Compact table format for quick scanning
- Search: Find events by title, description, or location
- Filter by Type: Code & Coffee, Code & Brews, Hackathon, Workshop, Meetup
- Filter by Time: Upcoming, Past Events, All Time

**Editing Events:**
1. Click the "Edit" (✏️) button on any event
2. Update event details
3. For recurring events, choose:
   - Update only this occurrence
   - Update entire series
4. Save changes

**Deleting Events:**
1. Click the "Delete" (🗑️) button
2. Confirm deletion
3. For recurring events, choose:
   - Delete only this occurrence
   - Delete entire series

**Event Actions:**
- ✏️ Edit: Modify event details
- 📊 Analytics: View event metrics
- 📱 Check-in QR: Generate check-in QR code
- 📝 Feedback QR: Generate feedback QR code
- 🗑️ Delete: Remove the event`
      },
      {
        id: "best-practices",
        title: "Best Practices for Hosts",
        content: `**Before the Event:**
- Create events at least 1-2 weeks in advance
- Write clear, engaging descriptions
- Set realistic capacity limits
- Test QR codes before the event
- Promote your event through announcements

**During the Event:**
- Display check-in QR code prominently
- Monitor attendance through analytics
- Engage with attendees
- Take photos for future promotion

**After the Event:**
- Share feedback QR code
- Review analytics and feedback
- Thank attendees via announcements
- Plan improvements for next event
- Archive or delete past events regularly

**Creating Great Events:**
- Choose descriptive, engaging titles
- Provide detailed descriptions with agenda
- Include accurate location information
- Add attractive thumbnail images
- Set appropriate event types
- Use recurring events for regular meetups`
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & FAQ",
        content: `**Common Issues:**

**Q: I can't see my event in the list**
A: Make sure you're viewing the correct time filter (Upcoming/Past/All). Use the search function to find specific events.

**Q: QR code isn't working**
A: Ensure you've assigned a check-in or feedback form to the event. Check that the QR code links to the correct URL.

**Q: How do I edit a recurring event?**
A: When editing, you'll see an option to update only the current occurrence or the entire series. Choose based on your needs.

**Q: Can I restore a deleted event?**
A: No, deletions are permanent. Be careful when deleting events, especially recurring series.

**Q: What's the difference between Host and Admin?**
A: Hosts can only see and manage their own events. Admins have full access to all events and additional platform settings.

**Q: How do I get attendee contact information?**
A: View event analytics to access check-in data with attendee details.

**Need Help?**
Contact platform administrators for assistance with:
- Role upgrades or permissions
- Technical issues
- Feature requests
- Platform bugs`
      }
    ]
  },
  admin: {
    title: "Admin Guide: Platform Management",
    description: "Complete guide for platform administrators",
    sections: [
      {
        id: "introduction",
        title: "Admin Overview",
        content: "Comprehensive platform management guide coming soon."
      }
    ]
  },
  sponsor: {
    title: "Sponsor Guide: Sponsorship Management",
    description: "Guide for event sponsors",
    sections: [
      {
        id: "introduction",
        title: "Sponsor Overview",
        content: "Sponsor features and analytics guide coming soon."
      }
    ]
  }
};

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const role = url.searchParams.get('role') || 'host';
    const format = url.searchParams.get('format') || 'json';

    const doc = DOCS[role];

    if (!doc) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Documentation not found for role: ${role}`,
          availableRoles: Object.keys(DOCS)
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (format === 'markdown') {
      // Return as markdown
      let markdown = `# ${doc.title}\n\n${doc.description}\n\n`;
      doc.sections.forEach(section => {
        markdown += `## ${section.title}\n\n${section.content}\n\n`;
      });

      return new Response(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // Return as JSON
    return new Response(
      JSON.stringify({
        success: true,
        documentation: doc,
        role
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching documentation:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
