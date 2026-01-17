
import type { Participant, DiarrhealEvent, SiteSummary, SummaryData, StrainSummary, PcrSummary, AgeSummary, DetailedParticipantEvent, RecurrentCase } from '../types';

declare const XLSX: any;

const INITIAL_SITES = ["Mirpur", "Korail", "Tongi", "Mirzapur"];
const AGE_GROUPS = [
    "6-12 month",
    "13-24 month",
    "25-36 month",
    "37-48 months",
    "above 48 months"
];

const getSiteFromId = (id: string): string => {
    const cleanId = id.trim().toUpperCase();
    const match = cleanId.match(/R(\d+)/);
    if (!match) return "Other/Unknown";
    const num = parseInt(match[1], 10);

    if (num >= 1 && num <= 1350) return "Mirpur";
    if (num >= 6001 && num <= 7760) return "Korail";
    if (num >= 12001 && num <= 13790) return "Tongi";
    if (num >= 18001 && num <= 21100) return "Mirzapur";

    return "Other/Unknown";
};

const normalizeSiteName = (name: string): string => {
    const s = name.trim().toLowerCase();
    if (!s) return "Other/Unknown";
    if (s.includes("mirpur")) return "Mirpur";
    if (s.includes("korail")) return "Korail";
    if (s.includes("tongi")) return "Tongi";
    if (s.includes("mirzapur")) return "Mirzapur";
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
            const siteName = getSiteFromId(rawId);
            participantsMap.set(rawId, { 
                participant_id: rawId, 
                site_name: siteName === "Other/Unknown" ? normalizeSiteName(safeString(row[colMap.site])) : siteName, 
                age_months: parseAge(row[colMap.age]) || undefined 
            });
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
        cNo: findIndex(['Culture No', 'C.No']), 
        rand: findIndex(['Rand# ID', 'ID']), 
        place: findIndex(['Place', 'Site']),
        stoolNo: findIndex(['Stool No', 'Stool#']), 
        date: findIndex(['Collection Date', 'Date']), 
        res: findIndex(['Result']), 
        strain: findIndex(['Shigella Strain', 'Strain']),
        pcr: findIndex(['RT-PCR result', 'PCR']), 
        pcrNo: findIndex(['PCR Positive No', 'PCR No']), 
        age: findIndex(['Age'])
    };

    return rows.slice(headerRowIndex + 1).filter(row => {
        const c = safeString(row[colMap.cNo]);
        const dateVal = parseDate(row[colMap.date]);
        return c && /^\d|RS/i.test(c) && !c.toLowerCase().includes('total') && dateVal !== null;
    }).map(row => {
        const randId = safeString(row[colMap.rand]);
        const siteByRange = getSiteFromId(randId);
        const stoolNoStr = safeString(row[colMap.stoolNo]) || safeString(row[colMap.cNo]);
        
        return {
            participant_id: randId,
            event_date: parseDate(row[colMap.date])?.toISOString().split('T')[0] || 'Unknown',
            culture_positive: safeString(row[colMap.res]),
            culture_no: safeString(row[colMap.cNo]),
            stool_no: stoolNoStr,
            episode_id: `CNO-${safeString(row[colMap.cNo])}`,
            shigella_strain: safeString(row[colMap.strain]),
            pcr_result: safeString(row[colMap.pcr]),
            age_months: parseAge(row[colMap.age]) || undefined,
            site_fallback: siteByRange === "Other/Unknown" ? normalizeSiteName(safeString(row[colMap.place])) : siteByRange,
            pcr_no_string: safeString(row[colMap.pcrNo])
        };
    });
};

export const processFiles = async (participantsFile: File, eventsFile: File): Promise<SummaryData> => {
    const [pData, eData] = await Promise.all([parseParticipantsFile(participantsFile), parseEventsFile(eventsFile)]);
    const pMap = new Map<string, Participant>();
    pData.forEach(p => pMap.set(p.participant_id, p));

    const eventsByParticipant = new Map<string, DiarrhealEvent[]>();
    eData.forEach(e => {
        const list = eventsByParticipant.get(e.participant_id) || [];
        list.push(e);
        eventsByParticipant.set(e.participant_id, list);
    });

    const siteSummaries = new Map<string, SiteSummary>();
    const pcrSummaries = new Map<string, PcrSummary>();
    const ageSummaries = new Map<string, AgeSummary>();
    const strainSummaries = new Map<string, StrainSummary>();
    const detailedEvents: DetailedParticipantEvent[] = [];
    const recurrentCases: RecurrentCase[] = [];
    const uniqueParticipantsWithEventsBySite = new Map<string, Set<string>>();
    let unmappedEvents = 0;

    const getSite = (n: string) => {
        const s = normalizeSiteName(n);
        if (!siteSummaries.has(s)) {
            siteSummaries.set(s, { siteName: s, enrollment: 0, totalDiarrhealEvents: 0, participantsWithEvents: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 });
            pcrSummaries.set(s, { siteName: s, totalTests: 0, totalPositive: 0, after1stDoseTests: 0, after1stDosePositive: 0, after2ndDoseTests: 0, after2ndDosePositive: 0, after30DaysTests: 0, after30DaysPositive: 0 });
            uniqueParticipantsWithEventsBySite.set(s, new Set());
        }
        return siteSummaries.get(s)!;
    };

    INITIAL_SITES.forEach(s => getSite(s));
    AGE_GROUPS.forEach(g => ageSummaries.set(g, { ageGroup: g, totalEvents: 0, culturePositive: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 }));

    pData.forEach(p => { if (p.site_name) getSite(p.site_name).enrollment++; });

    eventsByParticipant.forEach((rawEvents, participantId) => {
        const p = pMap.get(participantId);
        if (!p) unmappedEvents++;

        const sortedEvents = [...rawEvents].sort((a, b) => {
            if (a.event_date === 'Unknown') return 1;
            if (b.event_date === 'Unknown') return -1;
            return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        });

        const episodes: DiarrhealEvent[][] = [];
        if (sortedEvents.length > 0) {
            let currentEpisode = [sortedEvents[0]];
            for (let i = 1; i < sortedEvents.length; i++) {
                const event = sortedEvents[i];
                const prevEvent = currentEpisode[currentEpisode.length - 1];
                if (event.event_date === 'Unknown' || prevEvent.event_date === 'Unknown') {
                    episodes.push(currentEpisode);
                    currentEpisode = [event];
                    continue;
                }
                const dateA = new Date(prevEvent.event_date);
                const dateB = new Date(event.event_date);
                const diffDays = (dateB.getTime() - dateA.getTime()) / (1000 * 3600 * 24);
                const isRS = event.stool_no.toUpperCase().includes('RS') || event.culture_no.toUpperCase().includes('RS');
                if (diffDays <= 3 || (isRS && diffDays <= 10)) {
                    currentEpisode.push(event);
                } else {
                    episodes.push(currentEpisode);
                    currentEpisode = [event];
                }
            }
            episodes.push(currentEpisode);
        }

        const numEpisodes = episodes.length;
        const participantRecurrentHistory: RecurrentCase['history'] = [];
        let participantCulturePositives = 0;
        const seenStrains = new Set<string>();
        let hasPersistentPathogen = false;

        episodes.forEach(episode => {
            const representative = episode[0];
            const siteNameRaw = p?.site_name || representative.site_fallback || "Other/Unknown";
            const site = getSite(siteNameRaw);
            const pcrSum = pcrSummaries.get(site.siteName)!;
            
            uniqueParticipantsWithEventsBySite.get(site.siteName)?.add(participantId);

            const ageMonth = episode.reduce((max, e) => {
                const current = e.age_months ?? p?.age_months ?? 0;
                return current > max ? current : max;
            }, 0);
            
            const groupName = ageMonth > 0 ? getAgeGroup(ageMonth) : null;
            const ageSum = groupName ? ageSummaries.get(groupName) : null;

            let stools = 0, swabs = 0;
            episode.forEach(e => {
                const isRS = e.stool_no.toUpperCase().includes('RS') || e.culture_no.toUpperCase().includes('RS');
                if (isRS) swabs++; else stools++;
            });

            const anyCulturePos = episode.some(e => e.culture_positive.toLowerCase().includes('pos') || e.culture_positive === '1');
            const primaryStrain = episode.find(e => (e.culture_positive.toLowerCase().includes('pos') || e.culture_positive === '1') && e.shigella_strain)?.shigella_strain;
            const anyPcrPos = episode.some(e => e.pcr_result.toLowerCase().includes('pos') || e.pcr_result === '1');
            const anyPcrTested = episode.some(e => {
                const r = e.pcr_result.toLowerCase();
                return r.includes('pos') || r.includes('neg') || r === '1' || r === '0';
            });

            if (primaryStrain) {
                if (seenStrains.has(primaryStrain)) hasPersistentPathogen = true;
                seenStrains.add(primaryStrain);
            }

            let doseCategory = "Baseline/Pre-Dose";
            if (p?.dose1_date && representative.event_date !== 'Unknown') {
                const eD = new Date(representative.event_date);
                const d1D = new Date(p.dose1_date);
                const d2D = p.dose2_date ? new Date(p.dose2_date) : null;
                const d2_30 = d2D ? addDays(d2D, 30) : null;
                
                if (eD >= d1D) {
                    site.totalDiarrhealEvents++;
                    if (ageSum) ageSum.totalEvents++;
                    if (anyCulturePos && ageSum) ageSum.culturePositive++;
                    if (anyPcrTested) {
                        pcrSum.totalTests++;
                        if (anyPcrPos) pcrSum.totalPositive++;
                    }

                    const isAfter30 = (d2_30 && eD >= d2_30);
                    const isAfterD2 = (d2D && eD >= d2D && !isAfter30);
                    const isAfterD1 = (!isAfterD2 && !isAfter30);

                    if (isAfterD1) {
                        doseCategory = "After 1st Dose";
                        site.after1stDoseEvents++;
                        if (ageSum) ageSum.after1stDoseEvents++;
                        if (anyCulturePos) { site.after1stDoseCulturePositive++; if (ageSum) ageSum.after1stDoseCulturePositive++; }
                        if (anyPcrTested) { pcrSum.after1stDoseTests++; if (anyPcrPos) pcrSum.after1stDosePositive++; }
                    } else if (isAfterD2) {
                        doseCategory = "After 2nd Dose";
                        site.after2ndDoseEvents++;
                        if (ageSum) ageSum.after2ndDoseEvents++;
                        if (anyCulturePos) { site.after2ndDoseCulturePositive++; if (ageSum) ageSum.after2ndDoseCulturePositive++; }
                        if (anyPcrTested) { pcrSum.after2ndDoseTests++; if (anyPcrPos) pcrSum.after2ndDosePositive++; }
                    } else if (isAfter30) {
                        doseCategory = "After 30 Days of 2nd Dose";
                        site.after30Days2ndDoseEvents++;
                        if (ageSum) ageSum.after30Days2ndDoseEvents++;
                        if (anyCulturePos) { site.after30Days2ndDoseCulturePositive++; if (ageSum) ageSum.after30Days2ndDoseCulturePositive++; }
                        if (anyPcrTested) { pcrSum.after30DaysTests++; if (anyPcrPos) pcrSum.after30DaysPositive++; }
                    }

                    if (anyCulturePos) {
                        const sN = primaryStrain || "Unspecified";
                        if (!strainSummaries.has(sN)) strainSummaries.set(sN, { strainName: sN, total: 0, after1stDose: 0, after2ndDose: 0, after30Days2ndDose: 0 });
                        const ss = strainSummaries.get(sN)!; ss.total++;
                        if (isAfterD1) ss.after1stDose++; else if (isAfterD2) ss.after2ndDose++; else if (isAfter30) ss.after30Days2ndDose++;
                    }
                } else {
                    doseCategory = "Pre-Dose 1 (Excluded from Summary)";
                }
            } else {
                doseCategory = "Unmapped Dose Date (Excluded from Summary)";
            }

            participantRecurrentHistory.push({
                date: representative.event_date,
                result: anyCulturePos ? "Positive" : "Negative",
                stage: doseCategory,
                strain: primaryStrain
            });
            if (anyCulturePos) participantCulturePositives++;

            detailedEvents.push({
                site: site.siteName,
                participantId: participantId,
                collectionDate: representative.event_date,
                doseCategory,
                cultureResult: anyCulturePos ? "Positive" : "Negative",
                shigellaStrain: primaryStrain || "N/A",
                pcrResult: anyPcrTested ? (anyPcrPos ? "Positive" : "Negative") : "Not Tested",
                ageMonths: ageMonth.toFixed(1),
                participantTotalEvents: numEpisodes,
                stoolsCollected: stools,
                rectalSwabsCollected: swabs
            });
        });

        if (numEpisodes > 1) {
            recurrentCases.push({
                participantId,
                siteName: p?.site_name || rawEvents[0].site_fallback || "Other/Unknown",
                totalEpisodes: numEpisodes,
                culturePositives: participantCulturePositives,
                hasPersistentPathogen,
                history: participantRecurrentHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            });
        }
    });

    siteSummaries.forEach(s => { s.participantsWithEvents = uniqueParticipantsWithEventsBySite.get(s.siteName)?.size || 0; });

    const sites = Array.from(siteSummaries.values());
    return {
        sites,
        totals: {
            siteName: "Total Enrolled",
            enrollment: sites.reduce((s, x) => s + x.enrollment, 0),
            totalDiarrhealEvents: sites.reduce((s, x) => s + x.totalDiarrhealEvents, 0),
            participantsWithEvents: Array.from(new Set(Array.from(uniqueParticipantsWithEventsBySite.values()).flatMap(set => Array.from(set)))).length,
            after1stDoseEvents: sites.reduce((s, x) => s + x.after1stDoseEvents, 0),
            after1stDoseCulturePositive: sites.reduce((s, x) => s + x.after1stDoseCulturePositive, 0),
            after2ndDoseEvents: sites.reduce((s, x) => s + x.after2ndDoseEvents, 0),
            after2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after2ndDoseCulturePositive, 0),
            after30Days2ndDoseEvents: sites.reduce((s, x) => s + x.after30Days2ndDoseEvents, 0),
            after30Days2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after30Days2ndDoseCulturePositive, 0),
        },
        strains: Array.from(strainSummaries.values()).sort((a, b) => b.total - a.total),
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
        detailedEvents: detailedEvents.sort((a, b) => a.site.localeCompare(b.site) || a.participantId.localeCompare(b.participantId)),
        recurrentCases: recurrentCases.sort((a, b) => b.totalEpisodes - a.totalEpisodes),
        unmappedEvents
    };
};
