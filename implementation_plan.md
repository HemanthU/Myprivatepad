# Goal
Implement true step-by-step interactive code execution using the JDoodle WebSocket API. The user provided valid JDoodle API credentials, so we can replace the static "batch" execution engine with a live, two-way terminal.

## Proposed Changes

### 1. Dependencies
#### [NEW] Dependencies
- Install `sockjs-client` and `@stomp/stompjs` to handle JDoodle's STOMP over SockJS protocol.
- Install `xterm` and `@xterm/addon-fit` to provide a true interactive console UI in the browser that can capture keystrokes and stream text natively.

### 2. Backend Token Route
#### [NEW] `app/api/jdoodle/route.ts`
- Create a backend route to securely fetch the JDoodle authentication token. We will store the `clientId` and `clientSecret` securely in this route so they are never exposed to the client browser.
- This route will POST to `https://api.jdoodle.com/v1/auth-token` and return the ephemeral STOMP token.

### 3. Interactive Terminal UI
#### [MODIFY] `app/[slug]/page.tsx`
- Replace the static "Console Output" and "Standard Input" dual-pane boxes with a single, full-width `xterm.js` instance.
- **Execution Flow**:
  1. User clicks "Run".
  2. Frontend fetches the STOMP token from `/api/jdoodle`.
  3. Frontend initializes `SockJS` and `@stomp/stompjs`.
  4. Frontend subscribes to `/user/queue/execute-i`.
  5. Frontend sends the code payload to `/app/execute-ws-api-token`.
  6. Any keystrokes typed into the `xterm` terminal are sent via STOMP to JDoodle as standard input.
  7. Any standard output received from JDoodle is written directly to the `xterm` terminal.

## User Review Required
> [!IMPORTANT]
> Since this replaces the old "Standard Input" box with a live terminal (just like VS Code or IntelliJ), you will be able to type your inputs interactively *as the program asks for them*. Does this sound perfect? Let me know and I will begin the implementation!
