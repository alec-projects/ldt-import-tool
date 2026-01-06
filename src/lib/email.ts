import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export function getResendClient() {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  return new Resend(resendApiKey);
}

export async function sendImportEmail(params: {
  to: string[];
  subject: string;
  text: string;
  filename: string;
  content: Buffer;
}) {
  const resend = getResendClient();

  return resend.emails.send({
    from: "Participant Import <onboarding@resend.dev>",
    to: params.to,
    subject: params.subject,
    text: params.text,
    attachments: [
      {
        filename: params.filename,
        content: params.content,
      },
    ],
  });
}
