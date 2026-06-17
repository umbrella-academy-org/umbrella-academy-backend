type ZoomTokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: ZoomTokenCache | null = null;

export class ZoomService {
  static isConfigured(): boolean {
    return Boolean(
      process.env.ZOOM_ACCOUNT_ID?.trim() &&
        process.env.ZOOM_CLIENT_ID?.trim() &&
        process.env.ZOOM_CLIENT_SECRET?.trim()
    );
  }

  private static getCredentials() {
    const accountId = process.env.ZOOM_ACCOUNT_ID?.trim();
    const clientId = process.env.ZOOM_CLIENT_ID?.trim();
    const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();

    if (!accountId || !clientId || !clientSecret) {
      throw new Error('Zoom is not configured');
    }

    return { accountId, clientId, clientSecret };
  }

  private static async getAccessToken(): Promise<string> {
    if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
      return tokenCache.token;
    }

    const { accountId, clientId, clientSecret } = this.getCredentials();
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Zoom authentication failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    return tokenCache.token;
  }

  static async createMeeting(params: {
    topic: string;
    startTime: Date;
    durationMinutes: number;
    agenda?: string;
  }): Promise<{ joinUrl: string; startUrl: string; meetingId: string }> {
    const token = await this.getAccessToken();

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2,
        start_time: params.startTime.toISOString(),
        duration: params.durationMinutes,
        timezone: 'UTC',
        agenda: params.agenda?.slice(0, 2000),
        settings: {
          join_before_host: true,
          waiting_room: true,
          approval_type: 2,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Zoom meeting creation failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as {
      id: number | string;
      join_url: string;
      start_url: string;
    };

    return {
      joinUrl: data.join_url,
      startUrl: data.start_url,
      meetingId: String(data.id),
    };
  }

  static async deleteMeeting(meetingId: string): Promise<void> {
    if (!this.isConfigured() || !meetingId) return;

    try {
      const token = await this.getAccessToken();
      await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.warn(`[zoom] Failed to delete meeting ${meetingId}:`, error);
    }
  }
}
