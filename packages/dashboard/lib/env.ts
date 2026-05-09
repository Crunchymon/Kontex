function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  MCP_SERVER_URL: () => required("MCP_SERVER_URL"),
  DATABASE_URL: () => required("DATABASE_URL"),
  API_KEY_HMAC_SECRET: () => required("API_KEY_HMAC_SECRET")
};
