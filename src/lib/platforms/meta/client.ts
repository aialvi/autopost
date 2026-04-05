// Meta (Facebook/Instagram) Marketing API Client
export interface MetaConfig {
  accessToken: string;
  apiVersion?: string;
}

export interface MetaAdAccount {
  account_id: string;
  account_status: number;
  name: string;
}

export interface MetaCampaign {
  id: string;
  account_id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget: string | null;
  lifetime_budget: string | null;
  created_time: string;
  updated_time: string;
}

export interface MetaAdSet {
  id: string;
  account_id: string;
  campaign_id: string;
  name: string;
  status: string;
  created_time: string;
  updated_time: string;
}

export interface MetaAd {
  id: string;
  account_id: string;
  adset_id: string;
  name: string;
  status: string;
  creative: {
    thumbnail_url: string;
  };
  created_time: string;
  updated_time: string;
}

export interface MetaInsights {
  account_id: string;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  date_start: string;
  date_stop: string;
  spend: number;
  impressions: number;
  clicks: number;
  actions: Array<Record<string, any>>;
}

export class MetaClient {
  private config: MetaConfig;
  private apiVersion: string;

  constructor(config: MetaConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || "v19.0";
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const searchParams = new URLSearchParams(params);
    const url = `https://graph.facebook.com/${this.apiVersion}${endpoint}?${searchParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Meta API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json();
  }

  async getAdAccounts(): Promise<MetaAdAccount[]> {
    const response = await this.request<{ data: MetaAdAccount[] }>(
      "/me/adaccounts",
      { fields: "account_id,name,account_status" }
    );
    return response.data;
  }

  async getCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    const response = await this.request<{ data: MetaCampaign[] }>(
      `/act_${adAccountId}/campaigns`,
      {
        fields:
          "id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time",
      }
    );
    return response.data;
  }

  async getAdSets(campaignId: string): Promise<MetaAdSet[]> {
    const response = await this.request<{ data: MetaAdSet[] }>(
      `/${campaignId}/adsets`,
      {
        fields: "id,account_id,campaign_id,name,status,created_time,updated_time",
      }
    );
    return response.data;
  }

  async getAds(adSetId: string): Promise<MetaAd[]> {
    const response = await this.request<{ data: MetaAd[] }>(
      `/${adSetId}/ads`,
      {
        fields:
          "id,account_id,adset_id,name,status,creative{thumbnail_url},created_time,updated_time",
      }
    );
    return response.data;
  }

  async getInsights(
    level: "account" | "campaign" | "adset" | "ad",
    id: string,
    dateStart: string,
    dateEnd: string
  ): Promise<MetaInsights[]> {
    const response = await this.request<{ data: MetaInsights[] }>(
      `/${id}/insights`,
      {
        fields:
          "account_id,campaign_id,adset_id,ad_id,date_start,date_stop,spend,impressions,clicks,actions",
        time_range: `since_${dateStart}_until_${dateEnd}`,
        time_increment: "1",
        level,
        attribution_windows: "7d_click",
        default_summary: "true",
      }
    );
    return response.data;
  }

  // Convert Meta actions to conversions
  static getConversionCount(insights: MetaInsights): number {
    // Action type for purchases
    const purchaseAction = insights.actions?.find(
      (a) => a.action_type === "offsite_conversion.fb_pixel_purchase"
    );
    return purchaseAction?.value || 0;
  }

  static calculateCTR(insights: MetaInsights): number {
    if (!insights.impressions) return 0;
    return (insights.clicks / insights.impressions) * 100;
  }

  static calculateCPC(insights: MetaInsights): number {
    if (!insights.clicks) return 0;
    return insights.spend / insights.clicks;
  }

  static calculateCPM(insights: MetaInsights): number {
    if (!insights.impressions) return 0;
    return (insights.spend / insights.impressions) * 1000;
  }
}
