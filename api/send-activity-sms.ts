// api/send-activity-sms.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn("Twilio env vars are missing");
}

const client = accountSid && authToken ? Twilio(accountSid, authToken) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { to, petName, activityName } = req.body as {
      to?: string;
      petName?: string;
      activityName?: string;
    };

    if (!client || !fromNumber) {
      res.status(500).json({ error: "Twilio not configured" });
      return;
    }

    if (!to || !activityName) {
      res.status(400).json({ error: "Missing 'to' or 'activityName'" });
      return;
    }

    const messageBody =
      petName
        ? `Pawsitive update: "${activityName}" has been completed for ${petName}.`
        : `Pawsitive update: "${activityName}" has been completed.`;

    // NOTE: On a Twilio trial, "to" must be a verified number in your Twilio console
    await client.messages.create({
      from: fromNumber,
      to,
      body: messageBody,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error sending SMS:", err);
    res.status(500).json({ error: "Failed to send SMS" });
  }
}
