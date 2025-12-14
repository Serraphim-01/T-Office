# T-Office Notification System

## Overview

The T-Office notification system provides real-time alerts to users about important events in the system. Notifications are delivered through both WebSocket connections (for online users) and stored in the database (for offline users).

## Notification Types

### User Lifecycle Events
- `user_onboarded`: Sent when a new user is created
- `user_offboarded`: Sent when a user is deactivated
- `support_assigned`: Sent when a support staff member is assigned to a user
- `support_removed`: Sent when a support staff member is removed from a user
- `support_reassigned`: Sent when a user's support staff is changed due to another user's offboarding

### Activity Tracking
- `clock_in`: Sent when a user clocks in
- `clock_out`: Sent when a user clocks out
- `lesson_completed`: Sent when a user completes a wiki lesson

### System Events
- `chat_message`: Sent when a new chat message is posted
- `chat_status`: Sent when chat status changes (paused/resumed)
- `location_created`: Sent when a new location is created
- `location_deleted`: Sent when a location is deleted
- `feature_update`: Sent for department-specific feature updates

## Notification Targeting Logic

### When a User is Onboarded
Users notified:
- All users with `hr/onboarding` or `hr/users` access
- All users in the same department as the onboarded user

### When a User is Offboarded
Users notified:
- All users with `hr/onboarding` or `hr/users` access
- All users in the same department as the offboarded user
- The support staff assigned to the offboarded user
- Users for whom the offboarded user was acting as support staff

### When a Support Staff is Assigned
Users notified:
- All users with `hr/users` access
- The assigned support staff member
- The user to whom the support staff was assigned

### When a Support Staff is Removed
Users notified:
- All users with `hr/users` access
- The removed support staff member
- The user from whom the support staff was removed

### When a Support Staff is Reassigned Due to Offboarding
When a support staff member is offboarded, any users they were supporting will have their support staff reassigned to the offboarded user's support staff. Notifications are sent to:
- All users with `hr/users` access
- The user whose support staff was reassigned
- The new support staff member

## Technical Implementation

### Backend Helpers
Located in [/Users/serraphim/Desktop/T-Office/backend/utils/helpers.js](file:///Users/serraphim/Desktop/T-Office/backend/utils/helpers.js):
- `getUsersWithPageAccess()`: Gets users with specific page access rights
- `getUsersInSameDepartment()`: Gets users in the same department
- `getSupportStaffForUser()`: Gets the support staff assigned to a user
- `getUsersSupportedByStaff()`: Gets users supported by a support staff member
- `getUsersToNotifyOnOnboarding()`: Calculates notification recipients for user onboarding
- `getUsersToNotifyOnOffboarding()`: Calculates notification recipients for user offboarding
- `getUsersToNotifyOnSupportAssignment()`: Calculates notification recipients for support assignment
- `getUsersToNotifyOnSupportRemoval()`: Calculates notification recipients for support removal

### Notification Sending
Located in [/Users/serraphim/Desktop/T-Office/backend/index.js](file:///Users/serraphim/Desktop/T-Office/backend/index.js):
- `sendNotification()`: Core function that sends notifications to users
- Saves notifications to database
- Sends real-time notifications via WebSocket if user is connected

### Database Schema
Notifications are stored in the `user_notifications` table with fields:
- `id`: Unique identifier
- `user_id`: Recipient user ID
- `type`: Notification type
- `title`: Notification title
- `message`: Notification message
- `timestamp`: Creation timestamp
- `read`: Read status
- `message_id`: Related message ID (for chat)
- `department`: Department (for feature updates)
- `user_name`: User name (for HR notifications)
- `lesson_name`: Lesson name (for lesson completions)
- `location`: Location name (for clock events)
- `target_user_id`: Target user ID (for navigation)
- `comment_text`: Comment text (for lesson completions with comments)
- `comment_commenter`: Commenter name (for lesson completions with comments)

### Frontend Components
- `NotificationContext`: Manages notification state and WebSocket connections
- `NotificationPanel`: Displays notifications in a dropdown panel
- Navigation logic handles directing users to appropriate pages based on notification type

## Notification Filtering

Notifications are filtered based on user access rights:
- Chat notifications require `chat/notifications` access
- Clock notifications require `clock/notifications` access
- HR notifications require `hr/users` access
- Feature updates are filtered by department

## Real-time Delivery

Notifications are delivered in real-time using Socket.IO:
- Users register with the server upon connection
- Current page is tracked to avoid redundant notifications
- Notifications are sent directly via WebSocket when users are online
- Offline notifications are retrieved from the database when users reconnect