export const CIRCLE_APP_ID = "503a5268-fde6-54e8-a797-dc4326d050f6";
export const GOOGLE_CLIENT_ID = "12931803157-318qbgo8ijiqionm6hd22ofm4qvsl41l.apps.googleusercontent.com";

export function socialTokenBody(deviceId: string, idempotencyKey: string) {
  return { deviceId, idempotencyKey };
}

export function circleReady(apiKey?: string, appId?: string) {
  return Boolean(apiKey && appId);
}
