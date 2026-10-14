export interface GoogleAdsConfig { developerToken: string; clientId: string; clientSecret: string; refreshToken: string; customerId: string; loginCustomerId?: string }
export interface GoogleAdsCampaign { id: string; name: string; status: string; serving_status: string; advertising_channel_type: string; campaign_budget: string }
export interface GoogleAdsAdGroup { id: string; name: string; status: string; campaign: string }
export interface GoogleAdsAd { id: string; name: string; status: string; type: string; ad_group: string }
export interface GoogleAdsMetrics { campaign_id: string; impressions: number; clicks: number; cost_micros: number; conversions: number; conversions_value: number }
type Row = { campaign?: Record<string, string>; adGroup?: Record<string, string>; adGroupAd?: { status?: string; ad?: Record<string, string> }; metrics?: Record<string, string | number> };

export class GoogleAdsClient {
  private token = "";
  private expiresAt = 0;
  constructor(private config: GoogleAdsConfig) { this.config.customerId = config.customerId.replace(/-/g, ""); if (!/^\d+$/.test(this.config.customerId)) throw new Error("Invalid Google Ads customer ID"); }
  private async refreshAccessToken() {
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", signal: AbortSignal.timeout(20000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: this.config.refreshToken, client_id: this.config.clientId, client_secret: this.config.clientSecret }) });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error("Google Ads token refresh failed. Reconnect your account.");
    this.token = data.access_token;
    this.expiresAt = Date.now() + Number(data.expires_in ?? 3600) * 1000 - 60000;
  }
  private async query(query: string): Promise<Row[]> {
    if (!this.token || Date.now() >= this.expiresAt) await this.refreshAccessToken();
    const rows: Row[] = [];
    let pageToken: string | undefined;
    do {
      const response = await fetch(`https://googleads.googleapis.com/${process.env.GOOGLE_ADS_API_VERSION || "v25"}/customers/${this.config.customerId}/googleAds:search`, { method: "POST", signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json", "developer-token": this.config.developerToken, ...(this.config.loginCustomerId ? { "login-customer-id": this.config.loginCustomerId.replace(/-/g, "") } : {}) }, body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }) });
      if (!response.ok) throw new Error(`Google Ads request failed (${response.status}). Check account access and developer token.`);
      const result = await response.json();
      rows.push(...(result.results ?? []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    return rows;
  }
  async getCampaigns(): Promise<GoogleAdsCampaign[]> {
    return (await this.query("SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status, campaign.advertising_channel_type, campaign.campaign_budget FROM campaign")).map((row) => ({ id: String(row.campaign?.id), name: row.campaign?.name ?? "Campaign", status: row.campaign?.status ?? "UNKNOWN", serving_status: row.campaign?.servingStatus ?? "", advertising_channel_type: row.campaign?.advertisingChannelType ?? "", campaign_budget: row.campaign?.campaignBudget ?? "" }));
  }
  async getAdGroups(): Promise<GoogleAdsAdGroup[]> {
    return (await this.query("SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign FROM ad_group")).map((row) => ({ id: String(row.adGroup?.id), name: row.adGroup?.name ?? "Ad group", status: row.adGroup?.status ?? "UNKNOWN", campaign: row.adGroup?.campaign ?? "" }));
  }
  async getAds(): Promise<GoogleAdsAd[]> {
    return (await this.query("SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group_ad.ad.type, ad_group.resource_name FROM ad_group_ad")).map((row) => ({ id: String(row.adGroupAd?.ad?.id), name: row.adGroupAd?.ad?.name ?? `Ad ${row.adGroupAd?.ad?.id}`, status: row.adGroupAd?.status ?? "UNKNOWN", type: row.adGroupAd?.ad?.type ?? "", ad_group: row.adGroup?.resourceName ?? "" }));
  }
  async getStats(level: "campaign" | "ad_group" | "ad_group_ad", dateStart: string, dateEnd: string, campaignId?: string): Promise<GoogleAdsMetrics[]> {
    if (![dateStart, dateEnd].every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)) || (campaignId && !/^\d+$/.test(campaignId))) throw new Error("Invalid Google Ads report filter");
    return (await this.query(`SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ${level} WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'${campaignId ? ` AND campaign.id = ${campaignId}` : ""}`)).map((row) => ({ campaign_id: String(row.campaign?.id), impressions: Number(row.metrics?.impressions ?? 0), clicks: Number(row.metrics?.clicks ?? 0), cost_micros: Number(row.metrics?.costMicros ?? 0), conversions: Number(row.metrics?.conversions ?? 0), conversions_value: Number(row.metrics?.conversionsValue ?? 0) }));
  }
  static microsToDollars(micros: number) { return micros / 1_000_000; }
}
