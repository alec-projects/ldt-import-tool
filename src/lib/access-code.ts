import { timingSafeEqual } from "crypto";

export function isAccessCodeValid(
  configured: string | null,
  provided: string | null,
) {
  const required = configured ?? "";
  if (!required) {
    return true;
  }
  if (!provided) {
    return false;
  }
  const requiredBuffer = Buffer.from(required);
  const providedBuffer = Buffer.from(provided);
  if (requiredBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(requiredBuffer, providedBuffer);
}
