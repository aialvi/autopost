export interface SnapchatConfig { clientId: string; clientSecret: string; accessToken: string; refreshToken?: string }
export interface SnapchatAdAccount { id: string; name: string; currency: string; timezone: string }
export interface SnapchatCampaign { id: string; name: string; status: string; objective: string; daily_budget_micro?: number }
export interface SnapchatAd { id: string; name: string; status: string; preview_url?: string }
export interface SnapchatStats { impressions: number; swipes: number; spend: number; conversions: number; revenue: number }
export class SnapchatClient {
  constructor(private config: SnapchatConfig) {}
  private async request<T>(path: string, retry = true): Promise<T> {
    const response = await fetch(`https://adsapi.snapchat.com/v1${path}`, { signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${this.config.accessToken}` } });
    if (response.status === 401 && retry && this.config.refreshToken) { await this.refreshAccessToken(); return this.request(path, false); }
    const result = await response.json();
    if (!response.ok || result.request_status?.toUpperCase() === "ERROR") throw new Error(`Snapchat request failed (${response.status}). Check account access.`);
    return result as T;
  }
  async getAdAccount(accountId: string): Promise<SnapchatAdAccount> {
    const result = await this.request<{ adaccounts: { adaccount: SnapchatAdAccount }[] }>(`/adaccounts/${encodeURIComponent(accountId)}`);
    if (!result.adaccounts?.[0]?.adaccount) throw new Error("Snapchat ad account not found");
    return result.adaccounts[0].adaccount;
  }
  async getAdAccounts(): Promise<SnapchatAdAccount[]> {
    const result = await this.request<{ organizations: { organization: { id: string } }[] }>("/me/organizations");
    const accounts = await Promise.all((result.organizations ?? []).map(({ organization }) => this.request<{ adaccounts: { adaccount: SnapchatAdAccount }[] }>(`/organizations/${organization.id}/adaccounts`)));
    return accounts.flatMap((row) => row.adaccounts.map(({ adaccount }) => adaccount));
  }
  async getCampaigns(accountId: string): Promise<SnapchatCampaign[]> {
    const rows: SnapchatCampaign[] = [];
    let path: string | undefined = `/adaccounts/${encodeURIComponent(accountId)}/campaigns`;
    while (path) {
      const result: { campaigns?: { campaign: SnapchatCampaign }[]; paging?: { next_link?: string } } = await this.request(path);
      rows.push(...(result.campaigns ?? []).map(({ campaign }) => campaign));
      const next = result.paging?.next_link;
      if (next && new URL(next).hostname !== "adsapi.snapchat.com") throw new Error("Invalid Snapchat pagination URL");
      path = next ? new URL(next).pathname.replace(/^\/v1/, "") + new URL(next).search : undefined;
    }
    return rows;
  }
  async getAds(campaignId: string): Promise<SnapchatAd[]> {
    const squads = await this.request<{ adsquads: { adsquad: { id: string } }[] }>(`/campaigns/${encodeURIComponent(campaignId)}/adsquads`);
    const result = await Promise.all((squads.adsquads ?? []).map(({ adsquad }) => this.request<{ ads: { ad: SnapchatAd }[] }>(`/adsquads/${adsquad.id}/ads`)));
    return result.flatMap((row) => (row.ads ?? []).map(({ ad }) => ad));
  }
  async getStats(level: "campaign" | "ad", id: string, dateStart: string, dateEnd: string): Promise<SnapchatStats> {
    const end = new Date(`${dateEnd}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
    const params = new URLSearchParams({ start_time: `${dateStart}T00:00:00Z`, end_time: end.toISOString(), granularity: "DAY", fields: "impressions,swipes,spend,conversion_purchases,conversion_purchases_value" });
    const result = await this.request<{ timeseries_stats?: { timeseries_stat: { timeseries: { stats: Record<string, number> }[] } }[] }>(`/${level}s/${encodeURIComponent(id)}/stats?${params}`);
    return (result.timeseries_stats ?? []).flatMap((row) => row.timeseries_stat.timeseries ?? []).reduce((sum, { stats }) => ({ impressions: sum.impressions + Number(stats.impressions ?? 0), swipes: sum.swipes + Number(stats.swipes ?? 0), spend: sum.spend + Number(stats.spend ?? 0) / 1e6, conversions: sum.conversions + Number(stats.conversion_purchases ?? 0), revenue: sum.revenue + Number(stats.conversion_purchases_value ?? 0) / 1e6 }), { impressions: 0, swipes: 0, spend: 0, conversions: 0, revenue: 0 });
  }
  async refreshAccessToken(): Promise<string> {
    const response = await fetch("https://accounts.snapchat.com/login/oauth2/access_token", { method: "POST", signal: AbortSignal.timeout(20000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: this.config.refreshToken ?? "", client_id: this.config.clientId, client_secret: this.config.clientSecret }) });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error("Snapchat token refresh failed");
    this.config.accessToken = data.access_token;
    this.config.refreshToken = data.refresh_token ?? this.config.refreshToken;
    return data.access_token;
  }
}
