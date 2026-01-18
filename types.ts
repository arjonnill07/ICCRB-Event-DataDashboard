
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
  culture_no: string;
  stool_no: string;
  event_no_site?: string; // New field for validation
  shigella_strain?: string;
  pcr_result?: string;
  age_months?: number;
  site_fallback?: string;
  pcr_no_string?: string;
}

export interface DetailedParticipantEvent {
  site: string;
  participantId: string;
  collectionDate: string;
  doseCategory: string;
  cultureResult: string;
  shigellaStrain: string;
  pcrResult: string;
  ageMonths: string;
  participantTotalEvents: number;
  stoolsCollected: number;
  rectalSwabsCollected: number;
}

export interface RecurrentCase {
    participantId: string;
    siteName: string;
    totalEpisodes: number;
    culturePositives: number;
    hasPersistentPathogen: boolean;
    history: { 
        date: string; 
        result: string; 
        stage: string; 
        strain?: string;
    }[];
}

export interface SiteSummary {
  siteName: string;
  enrollment: number;
  totalDiarrhealEvents: number; // This is calculated by our logic
  reportedEventsCount: number;   // This is from the "Event No (Site)" column
  /**
   * participantsWithEvents: The count of unique participants who experienced 
   * at least one diarrheal event within the site.
   */
  participantsWithEvents: number;

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
    detailedEvents: DetailedParticipantEvent[];
    recurrentCases: RecurrentCase[];
    unmappedEvents: number;
}
