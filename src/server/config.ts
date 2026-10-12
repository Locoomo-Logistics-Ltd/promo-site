export const MAX_EMAIL_ATTEMPTS = 3;

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new ConfigError(`Missing environment variable ${name}`);
  return v;
}

export class ConfigError extends Error {}

export const isMock = () => process.env.MOCK_SERVICES === "1" && process.env.NODE_ENV !== "production";
export const ipPolicy = (): "flag" | "block" => (process.env.IP_POLICY === "block" ? "block" : "flag");
