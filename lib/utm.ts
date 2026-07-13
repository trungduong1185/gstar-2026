export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id"] as const;

export type UtmData = Partial<Record<(typeof UTM_KEYS)[number], string>>;

export type Attribution = {
  firstTouch: UtmData;
  lastTouch: UtmData;
  landingPage: string;
  referrer: string;
};

export function readUtm(search: string): UtmData {
  const params = new URLSearchParams(search);
  return UTM_KEYS.reduce<UtmData>((result, key) => {
    const value = params.get(key)?.trim().toLowerCase();
    if (value) result[key] = value;
    return result;
  }, {});
}
