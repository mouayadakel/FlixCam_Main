# Fix: "Failed to send OTP" – Twilio FROM Number

## The Error

If you see **"Failed to send OTP"** and logs show:

```
'From' +966508020033 is not a Twilio phone number or Short Code country mismatch
```

The **recipient number** (e.g. 058 243 3739) is fine. The problem is the **FROM** number in `TWILIO_PHONE_NUMBER`.

## Root Cause

`TWILIO_PHONE_NUMBER` must be a phone number **you own in your Twilio account**. You cannot use an arbitrary Saudi number.

- **Trial accounts**: Twilio gives you a US number (e.g. +1 234 567 8901). Use that.
- **Production**: Buy a Saudi number from Twilio Console if you need to send to Saudi numbers.

## Fix Steps

1. **Log in to Twilio Console** → [Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)

2. **Find your number** – Copy the number you own (format: +1234567890 or +966XXXXXXXX)

3. **Update `.env`** on the server:

   ```env
   TWILIO_PHONE_NUMBER="+1234567890"
   ```

   Use the **exact** value from Twilio (including country code).

4. **Restart the app**:

   ```bash
   pm2 restart all
   ```

## Trial Account Restrictions

- Trial accounts can only send to **verified** numbers (add them in Twilio Console → Phone Numbers → Verified Caller IDs).
- To send to any Saudi number, upgrade your Twilio account and purchase a Saudi number.

## Verify It Works

- Try registering again with the same phone number.
- Check `pm2 logs` – you should see `[AUTH][register] Response sent { status: 200 }` instead of `[AUTH][SMS] Failed to send OTP`.

## Forgot Password (Phone Recovery)

Forgot-password-by-phone uses the same SMS/WhatsApp pipeline. Ensure:

- `ENABLE_SMS="true"` in `.env` (required for SMS; without it, no SMS is attempted)
- `TWILIO_*` credentials and `TWILIO_PHONE_NUMBER` are set correctly

**Development/testing:** When SMS is not configured, the reset link is logged to the server console. Run `pm2 logs` and look for `[AUTH][forgot-password]` to find the reset URL for testing.
