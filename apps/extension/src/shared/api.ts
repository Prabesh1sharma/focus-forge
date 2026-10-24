import { ExtensionUser, SyncApiResponse } from "./types";

export interface PairResponse {
  token: string;
  user: ExtensionUser;
  expiresAt: string;
}

export async function pairWithCode(
  apiUrl: string,
  code: string,
  clientName: string = "FocusForge Chrome Extension"
): Promise<PairResponse> {
  const endpoint = `${apiUrl.replace(/\/+$/, "")}/api/extension/pair`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim().toUpperCase(), clientName }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Pairing failed with status ${res.status}`);
  }

  return data as PairResponse;
}

export async function syncSession(
  apiUrl: string,
  token: string
): Promise<SyncApiResponse> {
  const endpoint = `${apiUrl.replace(/\/+$/, "")}/api/extension/sync`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.error || "Extension token expired or revoked.");
    (err as unknown as { code: string }).code = "UNAUTHORIZED";
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Sync failed with status ${res.status}`);
  }

  return data as SyncApiResponse;
}

export async function revokeToken(apiUrl: string, token: string): Promise<void> {
  const endpoint = `${apiUrl.replace(/\/+$/, "")}/api/extension/revoke`;
  await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }).catch(() => {});
}
