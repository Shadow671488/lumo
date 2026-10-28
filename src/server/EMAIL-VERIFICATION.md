# Email verification setup

Lumo sends a six-digit verification code using SMTP settings loaded from the application root `.env` file. The server reads these values at startup; keep the file private and do not commit it.

Required settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Port 587 uses STARTTLS; port 465 uses implicit TLS. Registration sends a code that expires after ten minutes. Resend requests have a cooldown.

The API binds to `127.0.0.1`, so accounts are stored on this computer. For shared accounts across devices, deploy the API on a server with HTTPS, keep SMTP credentials there, and use a shared database plus server-side login sessions.

