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
        console.log(`Fetched HTML length: ${html.length}`);

        // Extract JSON-LD - updated regex to capture multiline content more reliably
        // Try to match standard script tag first
        let jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let matches = [...html.matchAll(jsonLdRegex)];

        // Fallback: If no matches, try less strict regex (sometimes attributes are different)
        if (matches.length === 0) {
            jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
            matches = [...html.matchAll(jsonLdRegex)];
        }

        console.log(`Found ${matches.length} JSON-LD blocks`);

        let eventsToSync = [];

        for (const match of matches) {
            try {
                // Clean up any potential HTML entity encoding in the script content
                const cleanJson = match[1].replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>');

                const data = JSON.parse(cleanJson);

                if (Array.isArray(data)) {
                    console.log(`Found array of ${data.length} items`);
                    const eventList = data.filter(item => item['@type'] === 'Event');
                    console.log(`Found ${eventList.length} events in array`);
                    eventsToSync = eventsToSync.concat(eventList);
                } else if (data['@type'] === 'Event') {
                    console.log('Found single Event object');
                    eventsToSync.push(data);
                } else if (data['@graph']) {
                    console.log('Found @graph object');
                    const eventList = data['@graph'].filter(item => item['@type'] === 'Event');
                    console.log(`Found ${eventList.length} events in graph`);
                    eventsToSync = eventsToSync.concat(eventList);
                } else {
                    console.log('JSON-LD item did not match expected structure:', JSON.stringify(data).substring(0, 200));
                }
            } catch (e) {
                console.error("Error parsing JSON-LD", e);
            }
        }

        if (eventsToSync.length === 0) {
            console.log("No events found in JSON-LD, trying __NEXT_DATA__ extraction");

            try {
                const nextDataRegex = /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/;
                const nextDataMatch = html.match(nextDataRegex);

                if (nextDataMatch) {
                    const nextData = JSON.parse(nextDataMatch[1]);

                    // Attempt to locate the Apollo cache or normalized store
                    let apolloState = null;
                    if (nextData.props && nextData.props.pageProps && nextData.props.pageProps.__APOLLO_STATE__) {
                        apolloState = nextData.props.pageProps.__APOLLO_STATE__;
                    } else if (nextData.props && nextData.props.pageProps && nextData.props.pageProps.initialState) {
                        // Some setups use initialState
                        apolloState = nextData.props.pageProps.initialState;
                    }

                    // Helper to resolve references
                    const resolveRef = (ref) => {
                        if (!ref || !apolloState) return null;
                        return apolloState[ref];
                    };

                    // Helper to recursively find objects with @type = Event
                    const findEvents = (obj, eventsFound = []) => {
                        if (!obj || typeof obj !== 'object') return eventsFound;

                        if (obj['@type'] === 'Event' || (obj.__typename === 'Event' && obj.title)) {
                            // Map internal structure to schema.org structure if needed
                            if (obj.__typename === 'Event') {
                                // Resolve photo reference if needed
                                let photoObj = obj.featuredEventPhoto;
                                if (photoObj && photoObj.__ref) {
                                    photoObj = resolveRef(photoObj.__ref);
                                }

                                // This matches the structure seen in your provided curl output
                                // Priority: 
                                // 1. featuredEventPhoto.highResUrl
                                // 2. featuredEventPhoto.baseUrl + id
                                // 3. image object/string (from other schemas)
                                const eventImage =
                                    (photoObj && photoObj.highResUrl) ? photoObj.highResUrl :
                                        (photoObj && photoObj.baseUrl && photoObj.id) ? `${photoObj.baseUrl}${photoObj.id}.jpeg` :
                                            (obj.image && typeof obj.image === 'string') ? obj.image :
                                                (obj.image && obj.image.url) ? obj.image.url : null;

                                eventsFound.push({
                                    '@type': 'Event',
                                    name: obj.title,
                                    description: obj.description,
                                    startDate: obj.dateTime,
                                    url: obj.eventUrl,
                                    location: obj.venue ? {
                                        '@type': 'Place',
                                        name: obj.venue.name,
                                        address: {
                                            streetAddress: obj.venue.address,
                                            addressLocality: obj.venue.city,
                                            addressRegion: obj.venue.state,
                                            addressCountry: obj.venue.country
                                        }
                                    } : (obj.eventType === 'ONLINE' ? { '@type': 'VirtualLocation' } : null),
                                    image: eventImage
                                });
                            } else {
                                eventsFound.push(obj);
                            }
                        }

                        for (const key in obj) {
                            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                                findEvents(obj[key], eventsFound);
                            }
                        }
                        return eventsFound;
                    };

                    // If we have apolloState, the events might be inside ROOT_QUERY or just scattered in the store.
                    // We should search the 'apolloState' if it exists, otherwise search 'nextData'
                    const searchRoot = apolloState || nextData;
                    const extractedEvents = findEvents(searchRoot);
                    console.log(`Found ${extractedEvents.length} events in __NEXT_DATA__`);
                    eventsToSync = extractedEvents;
                } else {
                    console.log("No __NEXT_DATA__ script found");
                }
            } catch (e) {
                console.error("Error parsing __NEXT_DATA__", e);
            }
        }

        if (eventsToSync.length === 0) {
            console.log("No events found in JSON-LD or __NEXT_DATA__");
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

            // Handle date and time
            const startTime = new Date(event.startDate);
            // Use date string YYYY-MM-DD
            const date = startTime.toISOString().split('T')[0];
            // Extract time HH:MM (ensure leading zeros if needed, though toTimeString usually handles it)
            // Note: date.toTimeString() uses local system time of the worker. 
            // Better to strip time from the ISO string if possible, OR if specific timezone needed, allow passing it.
            // However, JS Date parsing of ISO string usually converts to UTC or local.
            // Let's stick to simple HH:MM extraction from the ISO string to avoid timezone shifts if the string has offset.
            // If event.startDate is like "2026-02-07T09:00:00-06:00", simply taking the T split is safest 
            // to preserve the "intended" local time if we treat the string as truth.

            // Improved time extraction from ISO string (e.g. 2026-02-07T09:00:00-06:00)
            // This grabs "09:00" regardless of the timezone offset suffix
            const time = event.startDate.split('T')[1].substring(0, 5);

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

            // Extract thumbnail URL robustly (handles JSON-LD arrays/objects and pre-processed strings)
            let thumbnailUrl = null;
            if (event.image) {
                if (Array.isArray(event.image)) {
                    thumbnailUrl = event.image[0];
                } else if (typeof event.image === 'string') {
                    thumbnailUrl = event.image;
                } else if (typeof event.image === 'object' && event.image.url) {
                    thumbnailUrl = event.image.url;
                }
            }

            // Check if event exists
            const existingEvent = await context.env.DB.prepare(
                "SELECT id FROM events WHERE external_url = ?"
            ).bind(externalUrl).first();

            if (existingEvent) {
                // Update ALL fields to match source of truth
                await context.env.DB.prepare(
                    `UPDATE events SET 
                    title = ?, 
                    description = ?, 
                    date = ?, 
                    time = ?, 
                    location = ?,
                    thumbnail_url = ?,
                    event_type = ?,
                    updated_at = datetime('now')
                WHERE id = ?`
                ).bind(title, description, date, time, location, thumbnailUrl, eventType, existingEvent.id).run();
                console.log(`Updated event: ${title}`);
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
                console.log(`Inserted event: ${title}`);
            }
        }

        return jsonResponse({
            success: true,
            count: eventsToSync.length,
            message: `Processed ${eventsToSync.length} events`,
            debug_first_event: eventsToSync.length > 0 ? {
                title: eventsToSync[0].name,
                image_extracted: eventsToSync[0].image,
                raw_keys: Object.keys(eventsToSync[0])
            } : null
        });

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
