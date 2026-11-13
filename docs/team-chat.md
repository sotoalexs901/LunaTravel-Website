# Team chat rollout

`messages.html` uses authenticated Netlify requests. Active `staff` and `super_admin` accounts automatically join the general team conversation. Any team member can open a private conversation; only admins create named groups. Administrators cannot read private conversations unless they participate. Disabled accounts lose access. Customer accounts cannot access chat.

Messages refresh while the page is visible (5-second polling), and on focus or incoming push. The latest 50 messages load initially, with older history available. Message bodies and participant names render as text, never HTML. No private messages are stored in browser storage. Notifications show generic text; opening one authenticates access to the conversation.

## Required before production activation

Review the **existing deployed Firestore rules**, preserving current portal rules. All direct client reads and writes to these new collections must be denied; the authenticated Netlify function uses Firebase Admin SDK:

```text
match /teamChats/{document=**} {
  allow read, write: if false;
}
match /teamChatLimits/{document=**} {
  allow read, write: if false;
}
```

Firestore allow rules are additive: these denies do not override an existing broad allow. If existing rules grant authenticated users access to all collections, narrow those grants to the intended collections before enabling chat. The repository does not contain the deployed rules, so they have not been verified or modified by this change. Existing `users/*/notifications`, `notificationOutbox`, and `pushDevices` protection remains necessary.

After rules are verified, set `TEAM_CHAT_ENABLED=true` in Netlify (Functions scope) and redeploy. Without that variable the chat endpoint returns a setup-pending response and never accesses chat data. Existing assignment alerts keep working.

Existing `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_WEB_PUSH_PUBLIC_KEY` are reused. Admins enable alerts on each device just like staff. On iPhone/iPad use the installed FreshBorn home-screen app and allow notifications. Delivery remains subject to device settings and connectivity. Failed provider sends remain in the existing retry outbox.

## Validation

Run `node --test tests/team-chat.test.cjs`. Before production, use two active staff accounts, an admin, and a client to verify direct-message isolation, general/group access, disabled-user rejection, mobile notifications, and links opening the selected room. Test a real assigned address using Google Maps on iPhone/Android. No real messages or notifications were sent during automated tests.

Current limits: 150 active user documents considered by the roster, 50 members per custom group, 100 conversations listed per member, 2,000 characters per message, one new message per second per sender. For a larger team, add roster pagination and a fan-out worker before raising limits. Group membership is fixed on creation; inactive accounts cannot participate.
