
export interface Participant {
  participant_id: string;
  site_name: string;
  dose1_date?: string;
  dose2_date?: string;
  age_months?: number;
}

export interface DiarrhealEvent {
  participant_id: string;
  event_date: string;
  culture_positive: string;
  episode_id: string;
  shigella_strain?: string;
  pcr_result?: string;
  age_months?: number;
}

export interface SiteSummary {
  siteName: string;
  enrollment: number;
  totalDiarrhealEvents: number;

  after1stDoseEvents: number;
  after1stDoseCulturePositive: number;

  after2ndDoseEvents: number;
  after2ndDoseCulturePositive: number;

  after30Days2ndDoseEvents: number;
  after30Days2ndDoseCulturePositive: number;
}

export interface PcrSummary {
  siteName: string;
  totalTests: number;
  totalPositive: number;

  after1stDoseTests: number;
  after1stDosePositive: number;

  after2ndDoseTests: number;
  after2ndDosePositive: number;

  after30DaysTests: number;
  after30DaysPositive: number;
}

export interface StrainSummary {
  strainName: string;
  total: number;
  after1stDose: number;
  after2ndDose: number;
  after30Days2ndDose: number;
}

export interface AgeSummary {
  ageGroup: string;
  totalEvents: number;
  culturePositive: number;

  after1stDoseEvents: number;
  after1stDoseCulturePositive: number;

  after2ndDoseEvents: number;
  after2ndDoseCulturePositive: number;

  after30Days2ndDoseEvents: number;
  after30Days2ndDoseCulturePositive: number;
}

export interface SummaryData {
    sites: SiteSummary[];
    totals: SiteSummary;
    strains: StrainSummary[];
    pcrSites: PcrSummary[];
    pcrTotals: PcrSummary;
    ageDistribution: AgeSummary[];
}
