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
  creative?: {
    thumbnail_url?: string;
    image_url?: string;
    body?: string;
    effective_object_story_id?: string;
    instagram_permalink_url?: string;
    object_url?: string;
    object_story_spec?: {
      link_data?: { link?: string; message?: string };
      template_data?: { link?: string; message?: string };
      video_data?: { message?: string; call_to_action?: { value?: { link?: string } } };
    };
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
  actions: Array<{ action_type: string; value: string | number }>;
  action_values?: Array<{ action_type: string; value: string | number }>;
}

export class MetaClient {
  private config: MetaConfig;
  private apiVersion: string;

  constructor(config: MetaConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || process.env.META_API_VERSION || "v24.0";
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const searchParams = new URLSearchParams(params);
    const url = `https://graph.facebook.com/${this.apiVersion}${endpoint}?${searchParams.toString()}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
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

  private async list<T>(endpoint: string, params: Record<string, string>): Promise<T[]> {
    const rows: T[] = [];
    let after: string | undefined;
    do {
      const result: { data: T[]; paging?: { next?: string; cursors?: { after?: string } } } = await this.request(endpoint, { ...params, limit: "100", ...(after ? { after } : {}) });
      rows.push(...result.data);
      const next = result.paging?.next ? result.paging.cursors?.after : undefined;
      if (next && next === after) throw new Error("Meta returned a repeated pagination cursor");
      after = next;
    } while (after);
    return rows;
  }

  async getAdAccounts(): Promise<MetaAdAccount[]> {
    return this.list<MetaAdAccount>(
      "/me/adaccounts",
      { fields: "account_id,name,account_status" }
    );
  }

  async getCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    return this.list<MetaCampaign>(
      `/act_${adAccountId}/campaigns`,
      {
        fields:
          "id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time",
      }
    );
  }

  async getAdSets(campaignId: string): Promise<MetaAdSet[]> {
    return this.list<MetaAdSet>(
      `/${campaignId}/adsets`,
      {
        fields: "id,account_id,campaign_id,name,status,created_time,updated_time",
      }
    );
  }

  async getAds(adSetId: string): Promise<MetaAd[]> {
    return this.list<MetaAd>(
      `/${adSetId}/ads`,
      {
        fields:
          "id,account_id,adset_id,name,status,creative{thumbnail_url,image_url,body,effective_object_story_id,instagram_permalink_url,object_url,object_story_spec},created_time,updated_time",
      }
    );
  }

  async getInsights(
    level: "account" | "campaign" | "adset" | "ad",
    id: string,
    dateStart: string,
    dateEnd: string
  ): Promise<MetaInsights[]> {
    return this.list<MetaInsights>(
      `/${id}/insights`,
      {
        fields:
          "account_id,campaign_id,adset_id,ad_id,date_start,date_stop,spend,impressions,clicks,actions,action_values",
        time_range: JSON.stringify({ since: dateStart, until: dateEnd }),
        time_increment: "1",
        level,
        action_attribution_windows: JSON.stringify(["7d_click"]),
        default_summary: "true",
      }
    );
  }

  // Convert Meta actions to conversions
  static getConversionCount(insights: MetaInsights): number {
    // Action type for purchases
    const purchaseAction = insights.actions?.find(
      (a) => a.action_type === "offsite_conversion.fb_pixel_purchase"
    ) ?? insights.actions?.find((action) => action.action_type === "purchase");
    return Number(purchaseAction?.value || 0);
  }

  static getConversionValue(insights: MetaInsights): number {
    return Number(insights.action_values?.find((action) => action.action_type === "offsite_conversion.fb_pixel_purchase")?.value ?? insights.action_values?.find((action) => action.action_type === "purchase")?.value ?? 0);
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
