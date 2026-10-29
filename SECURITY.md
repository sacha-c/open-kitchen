# Security and Privacy

OpenKitchen is a volunteer-run, open-source project. This page explains, in plain language, what you are trusting us with, how your data is stored, how to remove it, and how to report a security problem.

## You are giving us your Cecotec password

To sync recipes, OpenKitchen logs in to Cecotec **as you**. Cecotec has no "log in with" option for third-party apps, so there is no way around this: **when you link your Cecotec account, you give the OpenKitchen server your Cecotec email and password.**

Please understand what that means before you do it:

- The server can log in to your Cecotec account whenever it needs to (when you press Sync, upload an image, or browse the catalog).
- Whoever **runs** the server, and has access to both its database and its configuration, can in principle decrypt your Cecotec password. That is true of the hosted app at open-kitchen.vercel.app (run by the maintainers) and of any other copy someone hosts.
- Use a Cecotec password you don't use anywhere else. If you stop trusting OpenKitchen, change your Cecotec password.
- If you'd rather not trust anyone else with it, **host OpenKitchen yourself**. It's open source and the [README](README.md) explains how.

## How your credentials are stored

| What | How it is stored |
|---|---|
| **OpenKitchen account password** | Only a salted one-way hash (scrypt, via [better-auth](https://www.better-auth.com)). The plain password is never stored and cannot be recovered. |
| **Cecotec password** | Encrypted with **AES-256-GCM**, using a fresh random IV for every encryption, and stored as `iv:authTag:ciphertext`. See [`src/lib/server/crypto.ts`](src/lib/server/crypto.ts). |
| **The encryption key** | A 32-byte key in the server's `CECOTEC_ENCRYPTION_KEY` environment variable. It is **not** in the database or in the repository. |
| **Cecotec email** | Stored in plain text next to the encrypted password, so we can show "Connected as …". |
| **Cecotec login tokens** | **Not stored.** Each time the server needs to talk to Cecotec, it decrypts your password, logs in, uses the resulting token for that one operation, and discards it. |

What this protects you from: someone who obtains only a copy of the database (a leaked backup, for example) sees ciphertext they cannot read without the key.

What it does **not** protect you from: someone who obtains both the database and the key, such as the server operator. The password has to be recoverable, because the server must send it to Cecotec to log in on your behalf. This is a deliberate trade-off, not a bug, and it is why we recommend a unique Cecotec password.

When the server sends your password to Cecotec, it is encrypted with Cecotec's own public key and sent over HTTPS, the same way the official app does it.

## What data we keep

| Data | Where | Notes |
|---|---|---|
| Name and email of your OpenKitchen account | Database | Needed to sign you in. |
| Password hash | Database | See above. |
| Login sessions | Database | A session token, expiry, and the IP address and browser (user agent) of each login. |
| Cecotec email and encrypted password | Database | Only if you link an account. |
| Your Cecotec user ID and device model | Database | Fetched when you link, to build recipes for your model. |
| Recipes, steps and ingredients | Database | Stored as plain text, since they are just your recipes. |
| Recipe photos | Cecotec's servers | Photos are uploaded straight to Cecotec's CDN. OpenKitchen only stores the image URL. |

We don't run analytics, advertising or tracking scripts, and we don't sell or share your data. The only third party that receives your data as part of using the app is **Cecotec**, when you sync. The hosted app runs on Vercel, with a Postgres database on Neon, which therefore process and store this data on our behalf.

## How to wipe your data

### On the hosted app

Do these steps in order. Each one is immediate and permanent.

1. **Unlink Cecotec.** Go to **Profile**, then **Disconnect Cecotec Account**. This deletes your encrypted Cecotec password and email from our database right away.
2. **Delete your recipes.** Open each recipe and press the trash icon.
   - ⚠️ This only deletes the copy in OpenKitchen. **Recipes already synced to your Cecotec account stay there.** Delete those in the official Cecotec app, if you want them gone.
3. **Delete your account.** There is currently **no self-service "delete account" button**. To have your account removed, send a request through the project's private reporting form: go to the repository's **Security** tab, choose **Report a vulnerability**, and write "Account deletion request" along with the email of your OpenKitchen account. We will delete your user, sessions and any remaining data. Please do **not** post your email or any password in a public issue.
4. **If you want to be thorough**, change your Cecotec password afterwards. Database backups kept by our hosting provider may retain old copies for a limited period, and changing the password makes any such copy useless.

### If you host it yourself

You control the data, so you can wipe it directly. To delete one user and everything that belongs to them, run this against your database (replace the email):

```sql
-- Removes the user and, through foreign keys, their sessions, accounts,
-- Cecotec credentials, recipes, steps and ingredients.
DELETE FROM "user" WHERE email = 'person@example.com';

-- Leftover verification tokens are not linked by a foreign key.
DELETE FROM "verification" WHERE identifier = 'person@example.com';
```

To remove the Cecotec password only, and keep the account:

```sql
DELETE FROM "cecotec_credentials"
WHERE user_id = (SELECT id FROM "user" WHERE email = 'person@example.com');
```

To wipe everything, drop the database. If the encryption key may have been exposed, generate a new `CECOTEC_ENCRYPTION_KEY` and have users re-link their accounts. Existing ciphertexts won't decrypt with the new key, which also makes old leaked copies useless.

## Reporting a vulnerability

Please report security problems **privately**, not in public issues, pull requests or discussions.

1. Go to the repository's **Security** tab and click **Report a vulnerability** (GitHub's private vulnerability reporting).
2. Describe the problem, how to reproduce it, and what an attacker could achieve. A short proof of concept helps a lot.

What to expect: this is a volunteer project, so we can't promise response times, but we will acknowledge your report, keep you updated, tell you when it's fixed, and credit you if you want. There is no bug bounty.

Please act in good faith:

- Test only against your own account and your own data. Don't access, change or delete other people's accounts or recipes.
- Don't run denial-of-service, spam, or social-engineering attacks.
- Give us a reasonable time to fix the problem before you disclose it publicly.

If you do this, we won't take legal action against you for your research.

**Out of scope:** problems in Cecotec's own servers, apps or API. OpenKitchen only talks to them. Please report those to Cecotec.

Only the latest version on the `main` branch is supported with security fixes.

## For people who run their own copy

- Keep `.env` out of version control, and never reuse the example values from `.env.example`.
- Generate real secrets: `openssl rand -base64 32` for `BETTER_AUTH_SECRET` and `openssl rand -hex 32` for `CECOTEC_ENCRYPTION_KEY`.
- Back up `CECOTEC_ENCRYPTION_KEY` separately from the database. If you lose it, users need to re-link their Cecotec accounts.
- Serve the app over HTTPS only.
