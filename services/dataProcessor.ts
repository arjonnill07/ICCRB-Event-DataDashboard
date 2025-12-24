
import type { Participant, DiarrhealEvent, SiteSummary, SummaryData, StrainSummary, PcrSummary, AgeSummary } from '../types';

declare const XLSX: any;

const INITIAL_SITES = ["Tongi", "Mirpur", "Korail", "Mirzapur"];
const AGE_GROUPS = [
    "6-12 month",
    "13-24 month",
    "25-36 month",
    "37-48 months",
    "above 48 months"
];

// Normalize strings to Title Case for consistent site matching
const normalizeSiteName = (name: string): string => {
    const s = name.trim().toLowerCase();
    if (!s) return "Other/Unknown";
    return s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};

const parseDate = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined) return null;
    if (dateInput instanceof Date) {
        return new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
    }
    if (typeof dateInput === 'number') {
        const date = XLSX.SSF.parse_date_code(dateInput);
        if (date) return new Date(Date.UTC(date.y, date.m - 1, date.d));
    }
    if (typeof dateInput === 'string') {
        const cleaned = dateInput.trim();
        if (!cleaned || cleaned.toLowerCase() === 'n/a') return null;
        let date = new Date(cleaned.includes('T') || cleaned.includes('Z') ? cleaned : `${cleaned}T00:00:00Z`);
        if (isNaN(date.getTime())) {
            const partsDMY = cleaned.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/);
            if (partsDMY) {
                date = new Date(Date.UTC(parseInt(partsDMY[3], 10), parseInt(partsDMY[2], 10) - 1, parseInt(partsDMY[1], 10)));
            }
        }
        if (!isNaN(date.getTime())) return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    return null;
};

const parseAge = (ageStr: any): number | null => {
    if (!ageStr) return null;
    const s = String(ageStr).toUpperCase().trim();
    let months = 0, found = false;
    const yMatch = s.match(/(\d+(\.\d+)?)\s*Y/);
    if (yMatch) { months += parseFloat(yMatch[1]) * 12; found = true; }
    const mMatch = s.match(/(\d+(\.\d+)?)\s*M/);
    if (mMatch) { months += parseFloat(mMatch[1]); found = true; }
    if (!found) {
        const numericMatch = s.match(/^(\d+(\.\d+)?)$/);
        if (numericMatch) return parseFloat(numericMatch[1]);
        return null;
    }
    return months;
};

const getAgeGroup = (months: number): string | null => {
    if (months >= 6 && months <= 12) return "6-12 month";
    if (months > 12 && months <= 24) return "13-24 month";
    if (months > 24 && months <= 36) return "25-36 month";
    if (months > 36 && months <= 48) return "37-48 months";
    if (months > 48) return "above 48 months";
    return null;
};

const safeString = (val: any): string => (val === null || val === undefined) ? '' : String(val).trim();

const parseFile = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (!event.target?.result) return reject(new Error("Empty file"));
                const data = new Uint8Array(event.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }));
            } catch (e) { reject(e); }
        };
        reader.readAsArrayBuffer(file);
    });
};

const parseParticipantsFile = async (file: File): Promise<Participant[]> => {
    const rows = await parseFile(file);
    const REQUIRED_VARIANTS = [['Site Name', 'Site'], ['Randomization Number', 'Rand#', 'ID'], ['Visit Name', 'Visit'], ['Actual Date', 'Date']];
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const pots = (rows[i] || []).map(h => safeString(h).toLowerCase());
        if (REQUIRED_VARIANTS.every(vars => vars.some(v => pots.includes(v.toLowerCase())))) { headerRowIndex = i; break; }
    }
    if (headerRowIndex === -1) throw new Error("Missing required columns in Participant file.");
    const headers = rows[headerRowIndex].map(h => safeString(h));
    const findIndex = (names: string[]) => headers.findIndex(h => names.map(n => n.toLowerCase()).includes(h.toLowerCase()));
    const colMap = {
        site: findIndex(['Site Name', 'Site']), rand: findIndex(['Randomization Number', 'Rand#', 'ID']),
        visit: findIndex(['Visit Name', 'Visit']), date: findIndex(['Actual Date', 'Date']),
        age: headers.findIndex(h => h.toLowerCase().includes('age') && !/dosage|stage/.test(h.toLowerCase()))
    };
    const participantsMap = new Map<string, Partial<Participant>>();
    for (const row of rows.slice(headerRowIndex + 1)) {
        const rawId = safeString(row[colMap.rand]);
        if (!rawId) continue;
        if (!participantsMap.has(rawId)) {
            participantsMap.set(rawId, { participant_id: rawId, site_name: normalizeSiteName(safeString(row[colMap.site])), age_months: parseAge(row[colMap.age]) || undefined });
        }
        const p = participantsMap.get(rawId)!;
        const date = parseDate(row[colMap.date]);
        if (date) {
            const dateStr = date.toISOString().split('T')[0];
            const v = safeString(row[colMap.visit]).toUpperCase();
            if (v.includes('V1') || v.includes('VISIT 1')) p.dose1_date = dateStr;
            else if (v.includes('V3') || v.includes('VISIT 3')) p.dose2_date = dateStr;
        }
    }
    return Array.from(participantsMap.values()) as Participant[];
};

const parseEventsFile = async (file: File): Promise<DiarrhealEvent[]> => {
    const rows = await parseFile(file);
    const REQUIRED_VARIANTS = [['Culture No', 'C.No'], ['Rand# ID', 'ID'], ['Collection Date', 'Date'], ['Result']];
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const pots = (rows[i] || []).map(h => safeString(h).toLowerCase());
        if (REQUIRED_VARIANTS.every(vars => vars.some(v => pots.includes(v.toLowerCase())))) { headerRowIndex = i; break; }
    }
    if (headerRowIndex === -1) throw new Error("Missing required columns in Events file.");
    const headers = rows[headerRowIndex].map(h => safeString(h));
    const findIndex = (names: string[]) => headers.findIndex(h => names.map(n => n.toLowerCase()).includes(h.toLowerCase()));
    const colMap = {
        cNo: findIndex(['Culture No', 'C.No']), rand: findIndex(['Rand# ID', 'ID']), place: findIndex(['Place', 'Site']),
        date: findIndex(['Collection Date', 'Date']), res: findIndex(['Result']), strain: findIndex(['Shigella Strain', 'Strain']),
        pcr: findIndex(['RT-PCR result', 'PCR']), pcrNo: findIndex(['PCR Positive No', 'PCR No']), age: findIndex(['Age'])
    };
    return rows.slice(headerRowIndex + 1).filter(row => {
        const c = safeString(row[colMap.cNo]);
        return c && /^\d/.test(c) && !c.toLowerCase().includes('total');
    }).map(row => ({
        participant_id: safeString(row[colMap.rand]),
        event_date: parseDate(row[colMap.date])?.toISOString().split('T')[0] || 'Unknown',
        culture_positive: safeString(row[colMap.res]),
        culture_no: safeString(row[colMap.cNo]),
        episode_id: `CNO-${safeString(row[colMap.cNo])}`,
        shigella_strain: safeString(row[colMap.strain]),
        pcr_result: safeString(row[colMap.pcr]),
        age_months: parseAge(row[colMap.age]) || undefined,
        site_fallback: normalizeSiteName(safeString(row[colMap.place])),
        pcr_no_string: safeString(row[colMap.pcrNo])
    }));
};

const extractPositiveId = (str: string): string | null => {
    const match = str.match(/Positive\s*,?\s*(\d+)/i);
    return match ? match[1] : null;
};

export const processFiles = async (participantsFile: File, eventsFile: File): Promise<SummaryData> => {
    const [pData, eData] = await Promise.all([parseParticipantsFile(participantsFile), parseEventsFile(eventsFile)]);
    const pMap = new Map<string, Participant>();
    pData.forEach(p => pMap.set(p.participant_id, p));

    const siteSummaries = new Map<string, SiteSummary>();
    const pcrSummaries = new Map<string, PcrSummary>();
    const ageSummaries = new Map<string, AgeSummary>();
    const strainSummaries = new Map<string, StrainSummary>();
    const countedCulturePos = new Set<string>();
    const countedPcrPos = new Set<string>();
    let unmappedEvents = 0;

    const getSite = (n: string) => {
        const s = normalizeSiteName(n);
        if (!siteSummaries.has(s)) {
            siteSummaries.set(s, { siteName: s, enrollment: 0, totalDiarrhealEvents: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 });
            pcrSummaries.set(s, { siteName: s, totalTests: 0, totalPositive: 0, after1stDoseTests: 0, after1stDosePositive: 0, after2ndDoseTests: 0, after2ndDosePositive: 0, after30DaysTests: 0, after30DaysPositive: 0 });
        }
        return siteSummaries.get(s)!;
    };

    INITIAL_SITES.forEach(s => getSite(s));
    AGE_GROUPS.forEach(g => ageSummaries.set(g, { ageGroup: g, totalEvents: 0, culturePositive: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 }));

    pData.forEach(p => { if (p.site_name) getSite(p.site_name).enrollment++; });

    eData.forEach(event => {
        const p = pMap.get(event.participant_id);
        if (!p) unmappedEvents++;
        const site = getSite(p?.site_name || event.site_fallback || "Other/Unknown");
        const pcrSum = pcrSummaries.get(site.siteName)!;
        const ageMonth = event.age_months ?? p?.age_months;
        const groupName = ageMonth ? getAgeGroup(ageMonth) : null;
        const ageSum = groupName ? ageSummaries.get(groupName) : null;

        site.totalDiarrhealEvents++;
        if (ageSum) ageSum.totalEvents++;

        const isPos = event.culture_positive.toLowerCase().includes('pos') || event.culture_positive === '1';
        const posKey = `${event.participant_id}_${extractPositiveId(event.culture_positive) || event.culture_no}`;
        let isNewPos = isPos && !countedCulturePos.has(posKey);
        if (isNewPos) { 
            countedCulturePos.add(posKey); 
            if (ageSum) ageSum.culturePositive++; 
        }

        const pcrRaw = event.pcr_result.toLowerCase();
        const pcrRank = (pcrRaw.includes('pos') || pcrRaw === '1') ? 2 : (pcrRaw.includes('neg') || pcrRaw === '0' ? 1 : 0);
        const pcrKey = `${event.participant_id}_${extractPositiveId(event.pcr_no_string || '') || event.culture_no}`;
        let isNewPcr = pcrRank === 2 && !countedPcrPos.has(pcrKey);
        if (pcrRank > 0) { pcrSum.totalTests++; if (isNewPcr) { countedPcrPos.add(pcrKey); pcrSum.totalPositive++; } }

        if (p?.dose1_date && event.event_date !== 'Unknown') {
            const eD = new Date(event.event_date), d1D = new Date(p.dose1_date);
            if (eD >= d1D) {
                const d2D = p.dose2_date ? new Date(p.dose2_date) : null, d2_30 = d2D ? addDays(d2D, 30) : null;
                const record = (cat: 'after1' | 'after2' | 'after30') => {
                    if (cat === 'after1') { 
                        site.after1stDoseEvents++; 
                        if (ageSum) ageSum.after1stDoseEvents++; 
                        if (isNewPos) { 
                            site.after1stDoseCulturePositive++; 
                            if (ageSum) ageSum.after1stDoseCulturePositive++; 
                        } 
                        if (pcrRank > 0) { pcrSum.after1stDoseTests++; if (isNewPcr) pcrSum.after1stDosePositive++; } 
                    }
                    else if (cat === 'after2') { 
                        site.after2ndDoseEvents++; 
                        if (ageSum) ageSum.after2ndDoseEvents++; 
                        if (isNewPos) { 
                            site.after2ndDoseCulturePositive++; 
                            if (ageSum) ageSum.after2ndDoseCulturePositive++; 
                        } 
                        if (pcrRank > 0) { pcrSum.after2ndDoseTests++; if (isNewPcr) pcrSum.after2ndDosePositive++; } 
                    }
                    else { 
                        site.after30Days2ndDoseEvents++; 
                        if (ageSum) ageSum.after30Days2ndDoseEvents++; 
                        if (isNewPos) { 
                            site.after30Days2ndDoseCulturePositive++; 
                            if (ageSum) ageSum.after30Days2ndDoseCulturePositive++; 
                        } 
                        if (pcrRank > 0) { pcrSum.after30DaysTests++; if (isNewPcr) pcrSum.after30DaysPositive++; } 
                    }
                    if (isNewPos) {
                        const sN = event.shigella_strain || "Unspecified";
                        if (!strainSummaries.has(sN)) strainSummaries.set(sN, { strainName: sN, total: 0, after1stDose: 0, after2ndDose: 0, after30Days2ndDose: 0 });
                        const ss = strainSummaries.get(sN)!; ss.total++;
                        if (cat === 'after1') ss.after1stDose++; else if (cat === 'after2') ss.after2ndDose++; else ss.after30Days2ndDose++;
                    }
                };
                if (!d2D || eD < d2D) record('after1'); else if (d2_30 && eD < d2_30) record('after2'); else record('after30');
            }
        }
    });

    const sites = Array.from(siteSummaries.values());
    return {
        sites,
        totals: {
            siteName: "Total Enrolled",
            enrollment: sites.reduce((s, x) => s + x.enrollment, 0),
            totalDiarrhealEvents: sites.reduce((s, x) => s + x.totalDiarrhealEvents, 0),
            after1stDoseEvents: sites.reduce((s, x) => s + x.after1stDoseEvents, 0),
            after1stDoseCulturePositive: sites.reduce((s, x) => s + x.after1stDoseCulturePositive, 0),
            after2ndDoseEvents: sites.reduce((s, x) => s + x.after2ndDoseEvents, 0),
            after2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after2ndDoseCulturePositive, 0),
            after30Days2ndDoseEvents: sites.reduce((s, x) => s + x.after30Days2ndDoseEvents, 0),
            after30Days2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after30Days2ndDoseCulturePositive, 0),
        },
        strains: Array.from(strainSummaries.values()).sort((a,b) => b.total - a.total),
        pcrSites: Array.from(pcrSummaries.values()),
        pcrTotals: {
            siteName: "Total Enrolled",
            totalTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.totalTests, 0),
            totalPositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.totalPositive, 0),
            after1stDoseTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after1stDoseTests, 0),
            after1stDosePositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after1stDosePositive, 0),
            after2ndDoseTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after2ndDoseTests, 0),
            after2ndDosePositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after2ndDosePositive, 0),
            after30DaysTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after30DaysTests, 0),
            after30DaysPositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after30DaysPositive, 0),
        },
        ageDistribution: Array.from(ageSummaries.values()).filter(a => a.totalEvents > 0),
        unmappedEvents
    };
};
