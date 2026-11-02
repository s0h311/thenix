# Sign-in is by emailed code, not by magic link

An athlete signs in by typing a 6-digit code from an email into the app. The magic link is
gone, on the server and the client.

The link cannot work in the installed app. It opens in Safari, and on iOS a home-screen web
app keeps its own cookies apart from Safari's, so the session it creates lands in the wrong
place and the installed app stays signed out. A code is typed where it is needed, so it works
the same in Safari, in Chrome and inside the installed iOS app.

Someone will eventually want the link back as the one-tap option. Do not, without re-reading
this: it would work in every browser you test it in and fail only on the installed iPhone.

## Considered Options

Keeping the link alongside codes was rejected. It offers a path that strands exactly the
athletes this change is for, and it leaves two ways in to keep working.

A password was rejected because email alone has always been enough, and sign-up stays one step.

## Consequences

better-auth's own `emailOTP` plugin does the work, so there is no schema change: codes live in
the existing verification table, and existing sessions are untouched. Codes are stored hashed,
so a resend can only ever issue a new code, and only the newest one works. An unknown email
still creates the user on the first successful sign-in.

A code lasts 10 minutes rather than the plugin's default of 5, because mail can be slow on a
weak signal. It allows the plugin's default of 3 wrong tries.

The mail is sent without being awaited, so response time does not reveal anything about the
send. The plugin also swallows a rejected send when it does await one. Either way a mail that
fails is only logged and the page still moves to the code step. The athlete recovers with
"Send a new code", and the page's "could not be sent" alert covers only a request that fails.
