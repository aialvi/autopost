// TikTok Marketing API Client
export interface TikTokConfig {
  appId: string;
  appSecret: string;
  accessToken: string;
}

export interface TikTokAdAccount {
  advertiser_id: string;
  name: string;
  timezone: string;
  currency: string;
}

export interface TikTokCampaign {
  campaign_id: number;
  advertiser_id: number;
  campaign_name: string;
  status: string;
  objective: string;
  budget: number;
  budget_mode: string;
  created_time: number;
}

export interface TikTokAd {
  ad_id: number;
  adgroup_id: number;
  campaign_id: number;
  name: string;
  status: string;
  creative: {
    creative_id: number;
    image_url: string;
  };
  created_time: number;
}

export interface TikTokStats {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export class TikTokClient {
  private config: TikTokConfig;
  private baseUrl = "https://business-api.tiktok.com/open_api/v1.3";

  constructor(config: TikTokConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method: "GET",
      headers: {
        "Access-Token": this.config.accessToken,
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.method = "POST";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `TikTok API error: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return response.json();
  }

  async getAdAccounts(): Promise<TikTokAdAccount[]> {
    const response = await this.request<{
      data: { list: TikTokAdAccount[] };
    }>("/advertiser/info/", {
      advertiser_ids: [],
    });

    return (response as any).data?.data?.list || [];
  }

  async getCampaigns(advertiserId: number): Promise<TikTokCampaign[]> {
    const response = await this.request<{
      data: { list: TikTokCampaign[] };
    }>(`/campaign/get/${advertiserId}/`, {
      filtering: [],
      page: 1,
      page_size: 100,
    });

    return (response as any).data?.data?.list || [];
  }

  async getAds(advertiserId: number): Promise<TikTokAd[]> {
    const response = await this.request<{
      data: { list: TikTokAd[] };
    }>(`/ad/get/${advertiserId}/`, {
      page: 1,
      page_size: 100,
    });

    return (response as any).data?.data?.list || [];
  }

  async getStats(
    advertiserId: number,
    level: "CAMPAIGN" | "ADGROUP" | "AD",
    ids: number[],
    dateStart: string,
    dateEnd: string
  ): Promise<TikTokStats[]> {
    const response = await this.request<any>(
      `/reporting/get/${advertiserId}/`,
      {
        service_type: "auction",
        report_type: "BASIC",
        dimensions: [level],
        metrics: ["impressions", "clicks", "spend", "conversion"],
        start_date: dateStart.replace(/-/g, ""),
        end_date: dateEnd.replace(/-/g, ""),
        aggregation_level: level,
        data_level: `${level.toLowerCase()}_advertisement`,
        filtering: [],
        dimension_filters: [
          {
            dimension: `advertiser_id`,
            operator: "IN",
            values: [advertiserId],
          },
        ],
      }
    );

    return response.data?.data || [];
  }
}
