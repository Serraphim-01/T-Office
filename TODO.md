# TODO: Chat Modifications

## Backend Changes
- [x] Add endpoint to clear all chat messages from DB (admin only)
- [x] Add table/endpoint for chat pause status
- [x] Modify POST /api/chat/messages to check pause status and moderator access
- [x] Add endpoint to toggle chat pause (moderator only)

## Frontend Changes
- [x] Remove "Clear Chat" button from chat page
- [x] Add pause toggle button for moderators
- [x] Update message sending logic to handle paused state
- [x] Display paused status in UI
- [x] Update guidelines to mention pause functionality

## Database Changes
- [x] Create chat_settings table for pause status
- [x] Run migration to clear existing messages
