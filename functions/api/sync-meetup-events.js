/**
 * Cloudflare Pages Function: /api/sync-meetup-events
 * Fetches events from Meetup and syncs them to the database
 */

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function generateCheckInCode(eventId) {
    const randomPart = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    return `EVT-${eventId}-${randomPart}`;
}

export async function onRequestPost(context) {
    try {
        const MEETUP_URL = "https://www.meetup.com/mitobyte/events/";

        // Headers from user request
        const myHeaders = new Headers();
        myHeaders.append("User-Agent", "-2");
        myHeaders.append("Cookie", "MEETUP_BROWSER_ID=id=044eec10-aec3-4e1b-bae9-8ddabce730fa; MEETUP_TRACK=id=65241a40-ab08-457b-b919-9c39b2379506; SIFT_SESSION_ID=de21cba9-65a2-4a68-8e3b-5111ee7bd0ba");

        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        console.log(`fetching events from ${MEETUP_URL}`);
        const response = await fetch(MEETUP_URL, requestOptions);

        if (!response.ok) {
            console.error(`Failed to fetch Meetup events: ${response.status} ${response.statusText}`);
            return jsonResponse({ error: "Failed to fetch Meetup events" }, 500);
        }

        const html = await response.text();

        // Extract JSON-LD
        const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        const matches = [...html.matchAll(jsonLdRegex)];

        let eventsToSync = [];

        for (const match of matches) {
            try {
                const data = JSON.parse(match[1]);

                if (Array.isArray(data)) {
                    const eventList = data.filter(item => item['@type'] === 'Event');
                    eventsToSync = eventsToSync.concat(eventList);
                } else if (data['@type'] === 'Event') {
                    eventsToSync.push(data);
                } else if (data['@graph']) {
                    const eventList = data['@graph'].filter(item => item['@type'] === 'Event');
                    eventsToSync = eventsToSync.concat(eventList);
                }
            } catch (e) {
                console.error("Error parsing JSON-LD", e);
            }
        }

        if (eventsToSync.length === 0) {
            console.log("No events found in JSON-LD");
            return jsonResponse({ message: "No events found to sync", count: 0 });
        }

        // Get blacklisted URLs
        const { results: blacklist } = await context.env.DB.prepare(
            "SELECT external_url FROM deleted_external_events"
        ).all();

        const blacklistedUrls = new Set(blacklist.map(row => row.external_url));

        let syncedCount = 0;

        for (const event of eventsToSync) {
            const externalUrl = event.url;

            if (!externalUrl) continue;

            if (blacklistedUrls.has(externalUrl)) {
                console.log(`Skipping deleted event: ${externalUrl}`);
                continue;
            }

            // Normalize data
            const title = event.name;
            const description = event.description || "";
            const startTime = new Date(event.startDate);
            const date = startTime.toISOString().split('T')[0];
            const time = startTime.toTimeString().split(' ')[0].substring(0, 5);

            let location = "TBD";
            if (event.location) {
                if (event.location['@type'] === 'Place' && event.location.address) {
                    const addr = event.location.address;
                    location = `${event.location.name || ''} ${addr.streetAddress || ''}, ${addr.addressLocality || ''}`.trim();
                } else if (event.location['@type'] === 'VirtualLocation') {
                    location = "Virtual Event";
                } else if (typeof event.location === 'string') {
                    location = event.location;
                } else if (event.location.name) {
                    location = event.location.name;
                }
            }

            const eventType = determineEventType(title, description);
            const thumbnailUrl = event.image ? (Array.isArray(event.image) ? event.image[0] : event.image) : null;


            // Upsert event
            // We check if it exists by external_url. If it does, we update it. If not, insert.
            // Actually, for simplicity and to avoid overwriting user edits, we might only want to INSERT if not exists, 
            // OR only update specific fields. 
            // Let's go with: Check if exists by external_url. If yes, update safely. If no, insert.

            const existingEvent = await context.env.DB.prepare(
                "SELECT id FROM events WHERE external_url = ?"
            ).bind(externalUrl).first();

            if (existingEvent) {
                // Update logic (optional, maybe we accept upstream changes to time/location)
                await context.env.DB.prepare(
                    `UPDATE events SET 
                    title = ?, 
                    description = ?, 
                    date = ?, 
                    time = ?, 
                    location = ?,
                    thumbnail_url = COALESCE(?, thumbnail_url),
                    updated_at = datetime('now')
                WHERE id = ?`
                ).bind(title, description, date, time, location, thumbnailUrl, existingEvent.id).run();
            } else {
                const result = await context.env.DB.prepare(
                    `INSERT INTO events (
                    title, description, event_type, date, time, location, 
                    external_url, thumbnail_url, is_recurring
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
                ).bind(title, description, eventType, date, time, location, externalUrl, thumbnailUrl).run();

                // Add check-in code
                const newEventId = result.meta.last_row_id;
                const checkInCode = generateCheckInCode(newEventId);
                await context.env.DB.prepare(
                    "UPDATE events SET check_in_code = ? WHERE id = ?"
                ).bind(checkInCode, newEventId).run();

                syncedCount++;
            }
        }

        return jsonResponse({ success: true, count: syncedCount, message: `Synced ${syncedCount} new events` });

    } catch (error) {
        console.error("Sync error:", error);
        return jsonResponse({ error: "Sync failed", details: error.message }, 500);
    }
}

function determineEventType(title, description) {
    const t = (title || "").toLowerCase();
    const d = (description || "").toLowerCase();

    if (t.includes('hackathon') || d.includes('hackathon')) return 'hackathon';
    if (t.includes('workshop') || d.includes('workshop')) return 'workshop';
    if ((t.includes('code') && t.includes('coffee')) || (d.includes('code') && d.includes('coffee'))) return 'code_and_coffee';
    if ((t.includes('code') && t.includes('brew')) || (d.includes('code') && d.includes('brew'))) return 'code_and_brews';

    return 'meetup';
}
