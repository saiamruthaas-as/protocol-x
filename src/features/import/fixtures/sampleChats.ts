export const SAMPLE_WHATSAPP_CHAT = `
15/10/2024, 14:30 - Alice: Hey team, welcome to the project discussion!
15/10/2024, 14:32 - Bob: Thanks Alice. I will finish the API integration by Friday.
15/10/2024, 14:35 - Charlie: Great! Could we move our sync from 3pm to 4pm tomorrow instead?
15/10/2024, 14:36 - Alice: Yes, 4pm works for me.
15/10/2024, 14:40 - Bob: Someone needs to review the database migration script.
This is a multi-line continuation of Bob's message.
15/10/2024, 14:45 - Dave: I will handle the database review tomorrow morning.
`.trim();

export const SAMPLE_BRACKET_CHAT = `
[10/15/24, 09:00:15 AM] Sarah Connor: Team meeting starts in 10 minutes.
[10/15/24, 09:02:00 AM] John Smith: I am working on the security patch. Urgent release today!
[10/15/24, 09:05:30 AM] Alex: Does anyone have the credentials?
`.trim();

export const SAMPLE_MALFORMED_CHAT = `
System message: Group created by Admin
[15/10/24, 10:00] Alice: Valid message here
Some random unformatted log output from server
15/10/24, 10:05 - Bob: Another valid message
`.trim();

export const DEMO_PRODUCT_LAUNCH_CHAT = `
15/10/2024, 14:30 - Sarah Connor: Team, we are 3 days away from the v2.4 production launch. Let's align on outstanding deliverables and blockers.
15/10/2024, 14:32 - Bob Chen: I will finish the Stripe billing webhook integration by Friday 5 PM.
15/10/2024, 14:35 - Alice Martin: Charlie, can you review the database migration script before tomorrow 10 AM?
15/10/2024, 14:36 - Charlie Davis: Yes Alice, I will review the migration script tomorrow morning.
15/10/2024, 14:40 - Dave Miller: Urgent blocker: Staging environment cluster is throwing 502 gateway timeouts.
15/10/2024, 14:42 - Sarah Connor: Charlie, please prioritize unblocking Dave on the staging cluster immediately.
15/10/2024, 14:45 - Charlie Davis: On it right now. I will roll back the proxy deployment within 30 minutes.
15/10/2024, 14:50 - Alice Martin: Decision made: we will push the QA sign-off window from 3 PM to 5 PM today.
15/10/2024, 14:55 - Bob Chen: Dave, what is the status of the end-to-end regression test suite?
15/10/2024, 14:58 - Dave Miller: Running now. I will post the test report by tomorrow afternoon.
15/10/2024, 15:02 - Sarah Connor: Excellent. Please ensure all pull requests are merged by 18/10/2024.
`.trim();

