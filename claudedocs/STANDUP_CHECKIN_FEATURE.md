# Stand-up Check-in Feature

## Overview

When users scan QR codes for **Code and Coffee** or **Code and Brews** events, they must answer two stand-up questions before checking in:
1. **What are you working on today?**
2. **What can you help with?**

After submitting, their responses appear in the **Community Feed** for other attendees to see.

## How It Works

### For Attendees:

1. **Scan QR Code** at Code and Coffee or Code and Brews event
2. **See Event Details** with check-in form
3. **Answer Two Questions**:
   - What are you working on today? (e.g., "Building a React app")
   - What can you help with? (e.g., "TypeScript, debugging, code review")
4. **Submit Check-in**
5. **See Success Confirmation**
6. **Check-in Appears** in Community Feed

### For Hackathon Events:

Hackathon events do NOT require stand-up responses. Users can check in directly without answering questions.

## Database Schema

### Updated `checkins` Table:

```sql
- working_on TEXT (nullable)
- can_help_with TEXT (nullable)
```

Only populated for Code and Coffee and Code and Brews events.

## Backend Implementation

### Check-in API (`/api/checkin`)

**Updated Logic**:
- Detects if event type requires stand-up (`code_and_coffee` or `code_and_brews`)
- Validates stand-up responses are provided for these event types
- Stores responses in `working_on` and `can_help_with` columns
- Returns error if required fields are missing

**Request Body**:
```json
{
  "checkInCode": "EVT-123-abc...",
  "userWalletHash": "0x...",
  "deviceInfo": "{...}",
  "workingOn": "Building a React app with TypeScript",
  "canHelpWith": "React hooks, TypeScript patterns, debugging"
}
```

### Community Check-ins API (`/api/community-checkins`)

**New Endpoint**: `GET /api/community-checkins`

**Query Parameters**:
- `limit` - Number of check-ins to return (default 20, max 100)
- `offset` - Pagination offset (default 0)

**Response**:
```json
{
  "checkins": [
    {
      "id": 1,
      "eventId": 5,
      "eventTitle": "Weekly Code and Coffee",
      "eventType": "code_and_coffee",
      "eventDate": "2025-10-28",
      "eventTime": "10:00:00",
      "username": "JohnDoe",
      "workingOn": "Building a React app...",
      "canHelpWith": "React, TypeScript...",
      "checkedInAt": "2025-10-28T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Features**:
- Returns only check-ins with stand-up data (NOT NULL)
- Ordered by most recent first
- Includes user and event information
- Supports pagination

## Frontend Components

### 1. CheckInConfirmation Component

**Location**: `src/components/CheckInConfirmation.jsx`

**Enhanced Features**:
- Detects event type automatically
- Shows stand-up form only for `code_and_coffee` and `code_and_brews`
- Two text areas with character limits (500 each)
- Validates responses before submission
- Clean, user-friendly design

**Stand-up Form UI**:
- Highlighted section with border
- Clear labels and placeholders
- Character counters
- Required field indicators
- Disabled during submission

### 2. CommunityCheckInsFeed Component

**Location**: `src/components/CommunityCheckInsFeed.jsx`

**Features**:
- Displays recent check-ins with stand-up responses
- Shows username, event info, and timestamps
- Event type badges with icons
- Two sections: "Working on" and "Can help with"
- Relative timestamps (e.g., "2h ago")
- Load more pagination
- Refresh button
- Empty state handling
- Error handling with retry

**Card Layout**:
```
┌─────────────────────────────────────┐
│ Username           [Code & Coffee]  │
│ 2h ago                              │
├─────────────────────────────────────┤
│ 📅 Event Name • Oct 28, 10:00 AM   │
│                                     │
│ 💻 Working on:                      │
│    Building a React app...          │
│                                     │
│ 🤝 Can help with:                   │
│    React hooks, debugging...        │
└─────────────────────────────────────┘
```

## Integration Guide

### Add Community Feed to Community Page

In your `CommunityHub` or community page component:

```jsx
import CommunityCheckInsFeed from './CommunityCheckInsFeed';

function CommunityPage() {
  return (
    <div>
      {/* Other community content */}

      <CommunityCheckInsFeed />
    </div>
  );
}
```

### Add Check-in Route

Make sure your router has a `/checkin` route:

```jsx
import CheckInConfirmation from './components/CheckInConfirmation';

{
  path: '/checkin',
  element: <CheckInConfirmation
    checkInCode={new URLSearchParams(location.search).get('code')}
    userWalletHash={user?.walletHash}
  />
}
```

## User Experience Flow

### Code and Coffee Check-in:

1. User scans QR code → Opens `/checkin?code=EVT-5-abc123`
2. Page loads event details
3. User sees highlighted "Share Your Stand-up" section
4. User fills in two text areas:
   - "What are you working on today?"
   - "What can you help with?"
5. User clicks "Check In Now"
6. Success confirmation shown
7. Check-in appears in Community Feed

### Hackathon Check-in:

1. User scans QR code → Opens `/checkin?code=EVT-10-xyz789`
2. Page loads event details
3. NO stand-up form shown (direct check-in)
4. User clicks "Check In Now"
5. Success confirmation shown
6. Check-in NOT shown in feed (no stand-up data)

## Validation Rules

**Frontend Validation**:
- Both fields required for Code and Coffee / Code and Brews
- Max 500 characters per field
- Trimmed whitespace validation
- Clear error messages

**Backend Validation**:
- Event type check
- Required field validation for applicable events
- 400 error returned if validation fails
- Prevents check-in without responses

## Security & Privacy

**User Information**:
- Username displayed (or "Anonymous" if not set)
- Email NOT displayed publicly
- Wallet hash abbreviated for privacy
- Stand-up responses are public to community

**Data Storage**:
- Stand-up fields nullable in database
- Only populated for specific event types
- Tied to check-in records with foreign keys
- Cascade deletes with parent check-in

## Event Types Summary

| Event Type | Stand-up Required | Appears in Feed |
|------------|------------------|-----------------|
| Code and Coffee | ✅ Yes | ✅ Yes |
| Code and Brews | ✅ Yes | ✅ Yes |
| Hackathon | ❌ No | ❌ No |

## Testing Checklist

- [ ] Create Code and Coffee event
- [ ] Generate and display QR code
- [ ] Scan QR code with phone
- [ ] Verify stand-up form appears
- [ ] Test validation (empty fields)
- [ ] Submit with valid responses
- [ ] Check success confirmation
- [ ] Verify check-in in Community Feed
- [ ] Test Load More pagination
- [ ] Test Refresh button
- [ ] Create Hackathon event
- [ ] Verify NO stand-up form for hackathon
- [ ] Check direct check-in works
- [ ] Verify hackathon check-in NOT in feed

## Deployed Features

✅ **Database Migration**: Stand-up fields added to checkins table (production)
✅ **Check-in API**: Validates and stores stand-up responses
✅ **Community API**: Fetches check-ins with stand-up data
✅ **Check-in Form**: Conditional stand-up UI for specific events
✅ **Community Feed**: Displays stand-up responses in cards
✅ **Deployment**: Live at https://5df471e3.mitobyte-voting.pages.dev

## Future Enhancements

Potential improvements:
- Search/filter check-ins by keyword
- Tag people with @ mentions
- React to check-ins (likes, helpful)
- Filter by event type
- Show trending topics from stand-ups
- Notifications when someone can help with your topic
- Archive old check-ins after event ends
