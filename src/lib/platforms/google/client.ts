// Google Ads API Client
export interface GoogleAdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  serving_status: string;
  advertising_channel_type: string;
  campaign_budget: string;
}

export interface GoogleAdsAdGroup {
  id: string;
  name: string;
  status: string;
  campaign: string;
}

export interface GoogleAdsAd {
  id: string;
  name: string;
  status: string;
  type: string;
  ad_group: string;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
}

export class GoogleAdsClient {
  private config: GoogleAdsConfig;
  private token: string;
  private baseUrl = "https://googleads.googleapis.com/v17";

  constructor(config: GoogleAdsConfig) {
    this.config = config;
    this.token = ""; // Will be set via refresh token
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const data = await response.json();
    this.token = data.access_token;
  }

  private async request<T>(
    body: any
  ): Promise<T> {
    if (!this.token) {
      await this.refreshAccessToken();
    }

    const response = await fetch(
      `${this.baseUrl}/customers/${this.config.customerId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          "developer-token": this.config.developerToken,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Google Ads API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json();
  }

  async getCampaigns(): Promise<GoogleAdsCampaign[]> {
    const response = await this.request<{
      results?: GoogleAdsCampaign[];
    }>({
      query: `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.serving_status,
          campaign.advertising_channel_type,
          campaign.campaign_budget
        FROM campaign
        ORDER BY campaign.name
      `,
    });

    return response.results || [];
  }

  async getAdGroups(): Promise<GoogleAdsAdGroup[]> {
    const response = await this.request<{ results?: GoogleAdsAdGroup[] }>({
      query: `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.campaign
        FROM ad_group
        ORDER BY ad_group.name
      `,
    });

    return response.results || [];
  }

  async getAds(): Promise<GoogleAdsAd[]> {
    const response = await this.request<{ results?: GoogleAdsAd[] }>({
      query: `
        SELECT
          ad_group_ad.id,
          ad_group_ad.name,
          ad_group_ad.status,
          ad_group_ad.type,
          ad_group_ad.ad_group
        FROM ad_group_ad
        ORDER BY ad_group_ad.name
      `,
    });

    return response.results || [];
  }

  async getStats(
    level: "campaign" | "ad_group" | "ad_group_ad",
    dateStart: string,
    dateEnd: string
  ): Promise<GoogleAdsMetrics[]> {
    const response = await this.request<{ results?: any[] }>({
      query: `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM ${level}
        WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
      `,
    });

    return response.results || [];
  }

  static microsToDollars(micros: number): number {
    return micros / 1_000_000;
  }
}
