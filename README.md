# AP23110010013-SHAIK-JASMIN-

## Afford Frontend Test Submission

This repository is arranged as required for the Frontend track:

- `Logging Middleware` contains the reusable `Log(stack, level, package, message)` function.
- `Frontend Test Submission` contains the React + TypeScript frontend.

## Run

```bash
npm install --prefix "Frontend Test Submission"
npm run dev
```

Open the local URL shown by Vite. The app implements the frontend URL shortener flow with short-link creation, custom shortcode validation, expiry handling, redirects, click tracking, and a statistics view. Enter the bearer token from the Afford auth API in the app before testing logs.

## Auth Flow

Register once:

```bash
curl -X POST http://20.244.56.144/evaluation-service/register \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","name":"YOUR_NAME","mobileNo":"YOUR_MOBILE","githubUsername":"YOUR_GITHUB","rollNo":"YOUR_ROLL_NO","accessCode":"QkbpxH"}'
```

Authenticate:

```bash
curl -X POST http://20.244.56.144/evaluation-service/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","name":"YOUR_NAME","rollNo":"YOUR_ROLL_NO","clientID":"CLIENT_ID","clientSecret":"CLIENT_SECRET"}'
```

Use the returned `access_token` in the app.
