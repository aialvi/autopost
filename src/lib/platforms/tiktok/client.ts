export interface TikTokConfig { appId: string; appSecret: string; accessToken: string }
export interface TikTokAdAccount { advertiser_id: string; name: string; timezone: string; currency: string }
export interface TikTokCampaign { campaign_id: string; advertiser_id: string; campaign_name: string; status: string; objective: string; budget: number; budget_mode?: string }
export interface TikTokAd { ad_id: string; adgroup_id: string; campaign_id: string; name: string; status: string; creative?: { image_url?: string } }
export interface TikTokStats { impressions: number; clicks: number; spend: number; conversions: number; revenue: number }
type Params = Record<string, string | number | unknown[]>;
export class TikTokClient {
  constructor(private config: TikTokConfig) {}
  private async request<T>(endpoint: string, params: Params): Promise<T> {
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? JSON.stringify(value) : String(value)]));
    const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3${endpoint}?${query}`, { signal: AbortSignal.timeout(20000), headers: { "Access-Token": this.config.accessToken } });
    const result = await response.json();
    if (!response.ok || Number(result.code) !== 0) throw new Error(`TikTok request failed (${result.code ?? response.status}): ${result.message ?? "Check your advertiser access"}`);
    return result.data as T;
  }
  private async list<T>(endpoint: string, params: Params): Promise<T[]> {
    const rows: T[] = [];
    let page = 1;
    let total = 1;
    do { const result = await this.request<{ list?: T[]; page_info?: { total_page: number } }>(endpoint, { ...params, page, page_size: 100 }); rows.push(...(result.list ?? [])); total = result.page_info?.total_page ?? 1; page++; } while (page <= total);
    return rows;
  }
  async getAdAccounts(): Promise<TikTokAdAccount[]> {
    const data = await this.request<{ list?: TikTokAdAccount[] }>("/oauth2/advertiser/get/", { app_id: this.config.appId, secret: this.config.appSecret });
    return data.list ?? [];
  }
  async getCampaigns(advertiserId: string | number): Promise<TikTokCampaign[]> {
    const rows = await this.list<TikTokCampaign & { operation_status?: string; objective_type?: string }>("/campaign/get/", { advertiser_id: String(advertiserId) });
    return rows.map((row) => ({ ...row, campaign_id: String(row.campaign_id), advertiser_id: String(advertiserId), status: row.operation_status ?? row.status ?? "UNKNOWN", objective: row.objective_type ?? row.objective ?? "", budget: Number(row.budget ?? 0) }));
  }
  async getAds(advertiserId: string | number): Promise<TikTokAd[]> { return this.list("/ad/get/", { advertiser_id: String(advertiserId) }); }
  async getStats(advertiserId: string | number, level: "CAMPAIGN" | "ADGROUP" | "AD", ids: (string | number)[], dateStart: string, dateEnd: string): Promise<TikTokStats[]> {
    const idField = `${level.toLowerCase()}_id`;
    const rows = await this.list<{ metrics: Record<string, string | number> }>("/report/integrated/get/", { advertiser_id: String(advertiserId), report_type: "BASIC", data_level: `AUCTION_${level}`, dimensions: [idField], metrics: ["impressions", "clicks", "spend", "complete_payment", "total_purchase_value"], start_date: dateStart, end_date: dateEnd, filtering: [{ field_name: `${level.toLowerCase()}_ids`, filter_type: "IN", filter_value: JSON.stringify(ids.map(String)) }] });
    return rows.map(({ metrics }) => ({ impressions: Number(metrics.impressions ?? 0), clicks: Number(metrics.clicks ?? 0), spend: Number(metrics.spend ?? 0), conversions: Number(metrics.complete_payment ?? 0), revenue: Number(metrics.total_purchase_value ?? 0) }));
  }
}
