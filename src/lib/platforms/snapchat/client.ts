// Snapchat Marketing API Client
export interface SnapchatConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
}

export interface SnapchatAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
}

export interface SnapchatCampaign {
  id: string;
  name: string;
  status: { description: string };
  objective: { description: string };
  daily_budget_micro: number;
  lifetime_budget_micro: number;
  created_at: string;
  updated_at: string;
}

export interface SnapchatAd {
  id: string;
  campaign_id: string;
  ad_squad_id: string;
  name: string;
  status: { description: string };
  created_at: string;
  updated_at: string;
  preview_url: string;
}

export interface SnapchatStats {
  impressions: number;
  swipes: number;
  spend: number;
  conversions: number;
}

export class SnapchatClient {
  private config: SnapchatConfig;
  private baseUrl = "https://adsapi.snapchat.com/v1";

  constructor(config: SnapchatConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Snapchat API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json();
  }

  async getAdAccounts(): Promise<SnapchatAdAccount[]> {
    const response = await this.request<{ request_status: string }>(
      "/me/adaccounts",
      { method: "GET" }
    );
    // Snapchat API returns adaccounts differently
    return response.request_status === "SUCCESS" ? [] : [];
  }

  async getCampaigns(): Promise<SnapchatCampaign[]> {
    const response = await this.request<any>(
      "/adaccounts/me/campaigns",
      { method: "GET" }
    );
    return response.campaigns || [];
  }

  async getAds(campaignId: string): Promise<SnapchatAd[]> {
    const response = await this.request<any>(
      `/campaigns/${campaignId}/ads`,
      { method: "GET" }
    );
    return response.ads || [];
  }

  async getStats(
    level: "campaign" | "ad",
    id: string,
    dateStart: string,
    dateEnd: string
  ): Promise<SnapchatStats> {
    const response = await this.request<any>(
      `/${level}s/${id}/stats`,
      {
        method: "POST",
        body: JSON.stringify({
          start_time: `${dateStart}T00:00:00Z`,
          end_time: `${dateEnd}T23:59:59Z`,
          granularity: "DAY",
          fields: ["impressions", "swipes", "spend", "conversions"],
        }),
      }
    );
    return response.stats || {};
  }

  async refreshAccessToken(): Promise<string> {
    const response = await this.request<{
      access_token: string;
      refresh_token: string;
    }>("https://accounts.snapchat.com/login/oauth2/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.config.refreshToken || "",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    return response.access_token;
  }
}
