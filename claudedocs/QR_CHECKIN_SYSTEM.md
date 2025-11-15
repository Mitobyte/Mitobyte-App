# QR Code Check-In System

## Overview

A complete QR code-based event check-in system has been implemented. When an event is created, a unique QR code is automatically generated. Attendees can scan this QR code with their phone camera to check in to the event. Admins can view real-time check-in data through the admin dashboard.

## Architecture

### Database Schema

**New Table: `checkins`**
- `id`: Primary key
- `event_id`: Foreign key to events table
- `user_wallet_hash`: User's wallet identifier
- `checked_in_at`: Timestamp of check-in
- `check_in_method`: Either 'qr_code' or 'manual'
- `device_info`: JSON string with device information
- Unique constraint on (event_id, user_wallet_hash) - prevents duplicate check-ins

**Updated Table: `events`**
- Added `check_in_code`: Unique code for QR code generation (format: EVT-{eventId}-{randomString})

### Backend API Endpoints

#### 1. Event Creation with QR Code
**Endpoint**: `POST /api/events`
- Automatically generates a unique check-in code when creating an event
- Returns `checkInCode` in the response
- Also generates check-in codes for all recurring event instances

#### 2. Check-In API
**Endpoint**: `POST /api/checkin`
```json
{
  "checkInCode": "EVT-123-abc123def456",
  "userWalletHash": "0x1234...",
  "deviceInfo": "{...}"
}
```
- Validates check-in code format
- Verifies event exists
- Prevents duplicate check-ins
- Enforces capacity limits
- Records check-in with timestamp

**Endpoint**: `GET /api/checkin?code={checkInCode}`
- Returns event details for preview before check-in
- Shows current check-in count and remaining spots

#### 3. Admin Check-In Management
**Endpoint**: `GET /api/admin/checkins?eventId={id}&userWalletHash={hash}`
- Requires admin role
- Returns event details, all check-ins, and statistics
- Includes:
  - Total check-ins
  - Capacity usage
  - Percentage filled
  - List of all attendees with timestamps

**Endpoint**: `DELETE /api/admin/checkins/{checkInId}`
- Removes a check-in (admin only)
- Useful for fixing errors or duplicate entries

**Endpoint**: `POST /api/admin/checkins/manual`
- Manually check in a user (admin only)
- For situations where QR code scanning isn't possible

### Frontend Components

#### 1. EventQRCode Component
**Location**: `src/components/EventQRCode.jsx`
**Features**:
- Displays QR code for an event
- Download QR code as PNG image
- Print-friendly QR code with event details
- Shows check-in code for reference

**Usage**:
```jsx
import EventQRCode from './components/EventQRCode';

<EventQRCode event={event} />
```

#### 2. CheckInConfirmation Component
**Location**: `src/components/CheckInConfirmation.jsx`
**Features**:
- Loads when user scans QR code
- Shows event details
- Confirms check-in with user
- Success animation after check-in
- Handles errors (already checked in, at capacity, etc.)

**URL Pattern**: `/checkin?code=EVT-123-abc123def456`

**Usage**:
```jsx
import CheckInConfirmation from './components/CheckInConfirmation';

<CheckInConfirmation
  checkInCode={code}
  userWalletHash={user.walletHash}
/>
```

#### 3. EventCheckIns Component (Admin)
**Location**: `src/components/admin/EventCheckIns.jsx`
**Features**:
- View all check-ins for an event
- Real-time statistics (total, capacity, percentage)
- Export check-ins as CSV
- Remove individual check-ins
- Refresh data
- Shows user details (username, email, wallet hash)
- Displays check-in timestamps

**Usage**:
```jsx
import EventCheckIns from './components/admin/EventCheckIns';

<EventCheckIns
  eventId={eventId}
  userWalletHash={adminWalletHash}
/>
```

## User Flow

### For Event Organizers:
1. Create an event via admin dashboard
2. System automatically generates QR code
3. Display QR code component on event details page
4. Download or print QR code for venue
5. Display QR code at event entrance
6. Monitor check-ins in real-time via admin dashboard

### For Attendees:
1. Open phone camera
2. Scan QR code at event venue
3. Phone opens check-in URL in browser
4. Review event details
5. Click "Check In Now" button
6. See success confirmation
7. Enjoy the event!

## Integration Guide

### 1. QR Code in Admin Dashboard (Already Integrated!)

The QR code display has been integrated into the admin dashboard's Event Stats tab:

**Location**: `src/components/admin/EventStatsView.jsx`

Each event in the admin dashboard now has a "Show Check-In QR Code" button that:
- Displays the event's QR code
- Allows downloading as PNG
- Provides print functionality
- Shows the check-in code for reference

**How to access**:
1. Login as admin
2. Navigate to Admin Dashboard
3. Click "Event Stats" tab
4. Click "Show Check-In QR Code" button on any event
5. Download or print the QR code for promotional use

### 2. Add Check-In Route

In your router configuration:

```jsx
import CheckInConfirmation from './components/CheckInConfirmation';

// Add this route
{
  path: '/checkin',
  element: <CheckInConfirmation
    checkInCode={searchParams.get('code')}
    userWalletHash={user?.walletHash}
  />
}
```

### 3. Optional: Add Admin Check-Ins View (Separate Page)

If you want a dedicated page to view and manage check-ins:

```jsx
import EventCheckIns from './components/admin/EventCheckIns';

function AdminCheckInsPage({ event, user }) {
  return (
    <EventCheckIns
      eventId={event.id}
      userWalletHash={user.walletHash}
    />
  );
}
```

**Note**: The QR code display is already integrated into the Event Stats tab in the admin dashboard. The EventCheckIns component is optional for viewing detailed check-in analytics on a separate page.

## Database Migration

### Local Development
```bash
wrangler d1 execute mitobyte-users --local --file=./migrations/0007_create_checkins.sql
```

### Production
```bash
wrangler d1 execute mitobyte-users --remote --file=./migrations/0007_create_checkins.sql
```

## Security Features

1. **Unique Check-In Codes**: Each event has a unique code, preventing unauthorized check-ins
2. **Duplicate Prevention**: Database constraint prevents users from checking in multiple times
3. **Admin Authentication**: Check-in management endpoints require admin role
4. **Capacity Enforcement**: System enforces event capacity limits
5. **Audit Trail**: All check-ins are timestamped with device info

## CSV Export Format

The admin can export check-ins as CSV with the following columns:
- Username
- Wallet Hash
- Email
- Check-in Time
- Check-in Method (qr_code or manual)
- Device Info

## Error Handling

### Common Error Scenarios:

1. **Invalid QR Code**
   - User scans wrong/expired code
   - Shows: "Event not found or check-in code is invalid"

2. **Already Checked In**
   - User tries to check in twice
   - Shows: "You have already checked in to this event"

3. **Event at Capacity**
   - No more spots available
   - Shows: "Event has reached maximum capacity"

4. **Not Connected**
   - User hasn't connected wallet
   - Shows: "Please connect your wallet to check in"

5. **Admin Access Denied**
   - Non-admin tries to access admin endpoints
   - Returns 403 Forbidden

## Testing Checklist

- [ ] Create event and verify check-in code is generated
- [ ] Display QR code on event page
- [ ] Scan QR code with phone camera
- [ ] Complete check-in process
- [ ] Verify check-in appears in admin dashboard
- [ ] Test duplicate check-in prevention
- [ ] Test capacity enforcement
- [ ] Export check-ins as CSV
- [ ] Test manual check-in (admin)
- [ ] Test removing check-in (admin)

## Future Enhancements

Potential improvements:
- Real-time check-in notifications (WebSocket)
- QR code expiration for security
- Batch QR code generation for multiple events
- Check-in analytics and trends
- Mobile app integration
- NFC check-in support
- Geolocation verification
- Waitlist management when at capacity
