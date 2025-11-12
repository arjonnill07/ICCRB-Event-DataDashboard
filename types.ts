
export interface Participant {
  participant_id: string;
  site_name: string;
  dose1_date?: string;
  dose2_date?: string;
}

export interface DiarrhealEvent {
  participant_id: string;
  event_date: string;
  culture_positive: string;
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

export interface SummaryData {
    sites: SiteSummary[];
    totals: SiteSummary;
}