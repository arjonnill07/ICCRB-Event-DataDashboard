
import type { Participant, DiarrhealEvent, SiteSummary, SummaryData, StrainSummary, PcrSummary, AgeSummary, DetailedParticipantEvent, RecurrentCase, DiagnosticConcordance } from '../types';

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

const normalizeEventNoSite = (val: string): string => {
    if (!val) return '';
    return val.replace(/\s*\(Day[- ]?\d+\)\s*/gi, '').trim();
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};

const parseDate = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined) return null;
    if (dateInput instanceof Date) return new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
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
            if (partsDMY) date = new Date(Date.UTC(parseInt(partsDMY[3], 10), parseInt(partsDMY[2], 10) - 1, parseInt(partsDMY[1], 10)));
        }
        if (!isNaN(date.getTime())) return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    return null;
};

const readWorkbook = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (!event.target?.result) return reject(new Error('Empty file'));
                const data = new Uint8Array(event.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                resolve(workbook);
            } catch (e) { reject(e); }
        };
        reader.readAsArrayBuffer(file);
    });
};

const normalizeSheetName = (value: string): string => {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const getRowsFromWorkbook = (workbook: any, sheetName?: string): any[][] => {
    const requested = sheetName ? normalizeSheetName(sheetName) : normalizeSheetName(workbook.SheetNames[0]);
    const matchName = workbook.SheetNames.find((name: string) => normalizeSheetName(name) === requested)
        || workbook.SheetNames.find((name: string) => normalizeSheetName(name).includes(requested))
        || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[matchName];
    if (!worksheet) throw new Error(`Worksheet "${matchName}" not found.`);
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
};

const normalizeHeader = (header: string): string => safeString(header).toLowerCase().replace(/[^a-z0-9]/g, '');

const findHeaderRowIndex = (rows: any[][], requiredVariants: string[][]): number => {
    const maxRows = Math.min(rows.length, 200);
    for (let i = 0; i < maxRows; i++) {
        const pots = (rows[i] || []).map(h => normalizeHeader(safeString(h)));
        if (requiredVariants.every(vars => vars.some(v => pots.some(header => header.includes(normalizeHeader(v)))))) return i;
    }
    return -1;
};

const findHeaderIndex = (headers: any[], names: string[]): number => {
    const normalizedNames = names.map(n => normalizeHeader(n));
    return headers.findIndex(h => normalizedNames.some(name => normalizeHeader(safeString(h)).includes(name)));
};

const findSheetNameByHeaderVariants = (workbook: any, requiredVariants: string[][]): string | null => {
    for (const sheetName of workbook.SheetNames) {
        const rows = getRowsFromWorkbook(workbook, sheetName);
        if (findHeaderRowIndex(rows, requiredVariants) >= 0) return sheetName;
    }
    return null;
};

const normalizeKeyPart = (value: any): string => safeString(value).toUpperCase().replace(/\s+/g, ' ').trim();

const isLikelyRandomizationId = (value: any): boolean => {
    const s = safeString(value).toUpperCase();
    return /^R\d{1,}/.test(s) || /^\d{3,}$/.test(s) || /^[A-Z]{1,}\d+/.test(s);
};

const scoreColumnByValidator = (rows: any[][], columnIndex: number, validator: (val: string) => boolean, startRow = 0, maxRows = 10): number => {
    let score = 0;
    for (let i = startRow; i < Math.min(rows.length, startRow + maxRows); i++) {
        const val = safeString(rows[i][columnIndex]);
        if (validator(val)) score++;
    }
    return score;
};

const findBestColumnByValidator = (rows: any[][], validator: (val: string) => boolean, startRow = 0, maxRows = 10): number => {
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
    let bestIndex = -1;
    let bestScore = 0;
    for (let col = 0; col < maxCols; col++) {
        const score = scoreColumnByValidator(rows, col, validator, startRow, maxRows);
        if (score > bestScore) { bestScore = score; bestIndex = col; }
    }
    return bestScore >= 3 ? bestIndex : -1;
};

const normalizePcrResult = (raw: any): string => {
    const value = safeString(raw).trim();
    if (!value) return '';
    const normalized = value.toLowerCase();
    if (/^\s*0\s*$/.test(value) || /\b(not|non|no|neg|negative|absent|undetected|not detected)\b/.test(normalized)) return 'Negative';
    if (/^\s*1\s*$/.test(value) || /\b(pos|positive|detected|reactive|present|yes)\b/.test(normalized)) return 'Positive';
    if (/^\s*(n\/a|na|unknown|missing|not tested|not done|pending|inconclusive)\s*$/.test(normalized)) return 'Not Tested';
    return value;
};

const isPcrPositive = (raw: any): boolean => normalizePcrResult(raw) === 'Positive';
const isPcrTested = (raw: any): boolean => {
    const result = normalizePcrResult(raw);
    return result === 'Positive' || result === 'Negative';
};

const buildEventReferenceKey = (entry: { participant_id?: string; event_date?: any; culture_no?: string; stool_no?: string; event_no_site?: string; }): string => {
    const pid = normalizeKeyPart(entry.participant_id);
    const date = parseDate(entry.event_date)?.toISOString().split('T')[0] || normalizeKeyPart(entry.event_date);
    const cNo = normalizeKeyPart(entry.culture_no);
    const stool = normalizeKeyPart(entry.stool_no);
    const eventNo = normalizeKeyPart(normalizeEventNoSite(entry.event_no_site || ''));
    return [pid, date, cNo, stool, eventNo].join('|');
};

const buildEventPrimaryKey = (entry: { participant_id?: string; event_date?: any; event_no_site?: string }): string => {
    const pid = normalizeKeyPart(entry.participant_id);
    const date = parseDate(entry.event_date)?.toISOString().split('T')[0] || normalizeKeyPart(entry.event_date);
    const eventNo = normalizeKeyPart(normalizeEventNoSite(entry.event_no_site || ''));
    return [pid, date, eventNo].join('|');
};

const buildEventDateKey = (entry: { participant_id?: string; event_date?: any }): string => {
    const pid = normalizeKeyPart(entry.participant_id);
    const date = parseDate(entry.event_date)?.toISOString().split('T')[0] || normalizeKeyPart(entry.event_date);
    return [pid, date].join('|');
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

const parseFile = async (file: File, sheetName?: string): Promise<any[][]> => {
    const workbook = await readWorkbook(file);
    return getRowsFromWorkbook(workbook, sheetName);
};

const parseParticipantsFile = async (file: File): Promise<Participant[]> => {
    const workbook = await readWorkbook(file);
    const REQUIRED_VARIANTS = [['Site Name', 'Site'], ['Randomization Number', 'Rand#', 'ID'], ['Visit Name', 'Visit'], ['Actual Date', 'Date']];
    const sheetName = findSheetNameByHeaderVariants(workbook, REQUIRED_VARIANTS) ?? workbook.SheetNames[0];
    const rows = getRowsFromWorkbook(workbook, sheetName);
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
    const workbook = await readWorkbook(file);
    const REQUIRED_VARIANTS = [['Culture No', 'C.No'], ['Rand# ID', 'ID'], ['Collection Date', 'Date'], ['Result']];
    const sheetName = findSheetNameByHeaderVariants(workbook, REQUIRED_VARIANTS) ?? workbook.SheetNames[0];
    const rows = getRowsFromWorkbook(workbook, sheetName);
    const headerRowIndex = findHeaderRowIndex(rows, REQUIRED_VARIANTS);
    if (headerRowIndex === -1) throw new Error("Missing required columns in Events file.");
    const headers = rows[headerRowIndex].map(h => safeString(h));
    const colMap = {
        cNo: findHeaderIndex(headers, ['Culture No', 'C.No']),
        rand: findHeaderIndex(headers, ['Rand# ID', 'ID']),
        place: findHeaderIndex(headers, ['Place', 'Site']),
        stoolNo: findHeaderIndex(headers, ['Stool No', 'Stool#']),
        date: findHeaderIndex(headers, ['Collection Date', 'Date']),
        res: findHeaderIndex(headers, ['Result']),
        strain: findHeaderIndex(headers, ['Shigella Strain', 'Strain']),
        pcr: findHeaderIndex(headers, ['RT-PCR result', 'PCR', 'RT-PCR Result', 'PCR Result']),
        pcrNo: findHeaderIndex(headers, ['PCR Positive No', 'PCR No']),
        age: findHeaderIndex(headers, ['Age']),
        eventNoSite: findHeaderIndex(headers, ['Event No (Site)', 'Event No', 'Site Event No', 'Site No'])
    };
    const dataRows = rows.slice(headerRowIndex + 1);
    let lastValidIndex = -1;
    for (let i = dataRows.length - 1; i >= 0; i--) {
        if (safeString(dataRows[i][colMap.eventNoSite]).trim() !== '') {
            lastValidIndex = i;
            break;
        }
    }
    if (lastValidIndex === -1) {
        throw new Error("No valid Event No (Site) found in Events file. Calculations require Event No (Site) to ensure lab consistency.");
    }
    const filteredDataRows = dataRows.slice(0, lastValidIndex + 1);

    const eventMap = new Map<string, DiarrhealEvent>();
    const primaryEventMap = new Map<string, DiarrhealEvent>();
    const dateEventMap = new Map<string, DiarrhealEvent>();

    const events = filteredDataRows.filter(row => {
        const c = safeString(row[colMap.cNo]);
        const dateVal = parseDate(row[colMap.date]);
        return c && /^\d|RS/i.test(c) && !c.toLowerCase().includes('total') && dateVal !== null;
    }).map(row => {
        const randId = safeString(row[colMap.rand]);
        const siteByRange = getSiteFromId(randId);
        const stoolNoStr = safeString(row[colMap.stoolNo]) || safeString(row[colMap.cNo]);
        const event: DiarrhealEvent = {
            participant_id: randId,
            event_date: parseDate(row[colMap.date])?.toISOString().split('T')[0] || 'Unknown',
            culture_positive: safeString(row[colMap.res]),
            culture_no: safeString(row[colMap.cNo]),
            stool_no: stoolNoStr,
            event_no_site: safeString(row[colMap.eventNoSite]),
            episode_id: `CNO-${safeString(row[colMap.cNo])}`,
            shigella_strain: safeString(row[colMap.strain]),
            pcr_result: normalizePcrResult(row[colMap.pcr]),
            age_months: parseAge(row[colMap.age]) || undefined,
            site_fallback: siteByRange === "Other/Unknown" ? normalizeSiteName(safeString(row[colMap.place])) : siteByRange,
            pcr_no_string: safeString(row[colMap.pcrNo])
        };
        const fullKey = buildEventReferenceKey(event);
        const primaryKey = buildEventPrimaryKey(event);
        const dateKey = buildEventDateKey(event);
        if (!eventMap.has(fullKey)) eventMap.set(fullKey, event);
        if (!primaryEventMap.has(primaryKey)) primaryEventMap.set(primaryKey, event);
        if (!dateEventMap.has(dateKey)) dateEventMap.set(dateKey, event);
        return event;
    });

    console.groupCollapsed('PCR Merge Diagnostics');
    console.info('Events sheet:', sheetName);
    console.info('Event rows parsed:', filteredDataRows.length, 'Events mapped:', events.length, 'Unique event keys:', eventMap.size);
    console.info('PCR sheet name candidates:', workbook.SheetNames.filter(name => normalizeSheetName(name).includes('sheet6') || normalizeSheetName(name).includes('rtpcr') || normalizeSheetName(name).includes('pcr')));
    console.groupEnd();

    const pcrSheetPatterns = [['Culture No', 'C.No'], ['Collection Date', 'Date', 'Sample Date'], ['RT-PCR result', 'PCR', 'RT-PCR Result', 'PCR Result', 'RT PCR result', 'RT PCR Result', 'Result']];
    const sheet6Name = workbook.SheetNames.find(name => normalizeSheetName(name) === 'sheet6' || normalizeSheetName(name).includes('sheet6') || normalizeSheetName(name).includes('rtpcr') || normalizeSheetName(name).includes('pcr'))
        || findSheetNameByHeaderVariants(workbook, pcrSheetPatterns);
    if (sheet6Name) {
        console.info('Detected PCR sheet:', sheet6Name);
        const pcrRows = getRowsFromWorkbook(workbook, sheet6Name);
        const pcrHeaderIndex = findHeaderRowIndex(pcrRows, pcrSheetPatterns);
        console.info('PCR sheet rows:', pcrRows.length, 'Header row index:', pcrHeaderIndex);
        if (pcrHeaderIndex === -1) {
            const sampleRows = pcrRows.slice(0, 10).map(row => (row || []).map(cell => safeString(cell)));
            console.warn('PCR Sheet6 header detection failed. Sample first 10 rows:', sampleRows);
        }
        if (pcrHeaderIndex >= 0) {
            const pcrHeaders = pcrRows[pcrHeaderIndex].map(h => safeString(h));
            console.info('PCR sheet header row values:', pcrHeaders);
            let randIndex = findHeaderIndex(pcrHeaders, ['Rand# ID', 'ID', 'Randomization Number', 'Rand#', 'Randomization No']);
            const dateIndex = findHeaderIndex(pcrHeaders, ['Collection Date', 'Date', 'Sample Date']);
            const pcrIndex = findHeaderIndex(pcrHeaders, ['RT-PCR result', 'PCR', 'RT-PCR Result', 'PCR Result', 'RT PCR result', 'RT PCR Result']);
            const cNoIndex = findHeaderIndex(pcrHeaders, ['Culture No', 'C.No']);
            const stoolIndex = findHeaderIndex(pcrHeaders, ['Stool No', 'Stool#']);
            const eventNoSiteIndex = findHeaderIndex(pcrHeaders, ['Event No (Site)', 'Event No', 'Site Event No', 'Site No']);
            if (randIndex < 0) {
                const inferred = findBestColumnByValidator(pcrRows, isLikelyRandomizationId, pcrHeaderIndex + 1, 15);
                if (inferred >= 0) {
                    randIndex = inferred;
                    console.info('Inferred participant ID column index for PCR sheet:', randIndex);
                }
            }
            const pcrColMap = {
                rand: randIndex,
                date: dateIndex,
                pcr: pcrIndex,
                cNo: cNoIndex,
                stoolNo: stoolIndex,
                eventNoSite: eventNoSiteIndex
            };
            if (pcrColMap.date < 0 || pcrColMap.pcr < 0 || pcrColMap.cNo < 0) {
                console.warn('Sheet6 RT-PCR sheet found, but required PCR headers are missing:', pcrColMap, 'headers:', pcrHeaders);
            } else {
                const pcrDataRows = pcrRows.slice(pcrHeaderIndex + 1);
                let totalPcrRows = 0;
                let matchedPcrRows = 0;
                let unmatchedPcrRows = 0;
                for (const row of pcrDataRows) {
                    const rawPcrValue = safeString(row[pcrColMap.pcr]);
                    if (!rawPcrValue) continue;
                    totalPcrRows++;
                    const normalizedPcrValue = normalizePcrResult(rawPcrValue);
                    const reference = {
                        participant_id: pcrColMap.rand >= 0 ? safeString(row[pcrColMap.rand]) : '',
                        event_date: safeString(row[pcrColMap.date]),
                        culture_no: safeString(row[pcrColMap.cNo]),
                        stool_no: pcrColMap.stoolNo >= 0 ? safeString(row[pcrColMap.stoolNo]) : '',
                        event_no_site: pcrColMap.eventNoSite >= 0 ? safeString(row[pcrColMap.eventNoSite]) : ''
                    };
                    const fullKey = buildEventReferenceKey(reference);
                    let matchedEvent = eventMap.get(fullKey);
                    if (!matchedEvent) {
                        const primaryKey = buildEventPrimaryKey(reference);
                        matchedEvent = primaryEventMap.get(primaryKey);
                    }
                    if (!matchedEvent) {
                        const dateKey = buildEventDateKey(reference);
                        matchedEvent = dateEventMap.get(dateKey);
                    }
                    if (!matchedEvent && reference.culture_no) {
                        matchedEvent = Array.from(eventMap.values()).find(e => normalizeKeyPart(e.participant_id) === normalizeKeyPart(reference.participant_id) && normalizeKeyPart(e.culture_no) === normalizeKeyPart(reference.culture_no));
                    }
                    if (!matchedEvent && reference.stool_no) {
                        matchedEvent = Array.from(eventMap.values()).find(e => normalizeKeyPart(e.participant_id) === normalizeKeyPart(reference.participant_id) && normalizeKeyPart(e.stool_no) === normalizeKeyPart(reference.stool_no));
                    }
                    if (!matchedEvent && reference.culture_no) {
                        matchedEvent = Array.from(eventMap.values()).find(e => normalizeKeyPart(e.culture_no) === normalizeKeyPart(reference.culture_no));
                    }
                    if (matchedEvent) {
                        matchedEvent.pcr_result = normalizedPcrValue;
                        matchedPcrRows++;
                    } else {
                        unmatchedPcrRows++;
                        console.warn('Sheet6 RT-PCR row could not be matched to any event:', reference, 'value:', rawPcrValue);
                    }
                }
                console.info(`Sheet6 RT-PCR mapping: total rows=${totalPcrRows}, matched=${matchedPcrRows}, unmatched=${unmatchedPcrRows}`);
            }
        } else {
            console.warn('Sheet6 found but RT-PCR header row could not be located. Sheet6 rows were ignored.');
        }
    } else {
        console.warn('No Sheet6/RT-PCR sheet found in workbook. RT-PCR values will not be merged from Sheet6.');
    }

    return events;
};

export const processFiles = async (participantsFile: File, eventsFile: File): Promise<SummaryData> => {
    const [pData, eData] = await Promise.all([parseParticipantsFile(participantsFile), parseEventsFile(eventsFile)]);
    const pMap = new Map<string, Participant>();
    pData.forEach(p => pMap.set(p.participant_id, p));

    const reportedEpisodesMap = new Map<string, DiarrhealEvent[]>();
    eData.forEach(e => {
        const baseEventId = e.event_no_site ? normalizeEventNoSite(e.event_no_site) : `UN-${e.participant_id}-${e.event_date}`;
        const groupKey = `${e.participant_id}|${baseEventId}`;
        const list = reportedEpisodesMap.get(groupKey) || [];
        list.push(e);
        reportedEpisodesMap.set(groupKey, list);
    });

    const siteSummaries = new Map<string, SiteSummary>();
    const pcrSummaries = new Map<string, PcrSummary>();
    const ageSummaries = new Map<string, AgeSummary>();
    const strainSummaries = new Map<string, StrainSummary>();
    const detailedEvents: DetailedParticipantEvent[] = [];
    const recurrentCases: RecurrentCase[] = [];
    const siteParticipantsSet = new Map<string, Set<string>>();
    const concordance: DiagnosticConcordance = { totalEpisodes: 0, culturePosPcrPos: 0, cultureNegPcrPos: 0, culturePosPcrNeg: 0, bothNegative: 0 };
    const specimenYield = {
        stool: { count: 0, culturePos: 0, pcrPos: 0 },
        swab: { count: 0, culturePos: 0, pcrPos: 0 }
    };

    const getSite = (n: string) => {
        const s = normalizeSiteName(n);
        if (!siteSummaries.has(s)) {
            siteSummaries.set(s, { siteName: s, enrollment: 0, totalDiarrhealEvents: 0, reportedEventsCount: 0, participantsWithEvents: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 });
            pcrSummaries.set(s, { siteName: s, totalTests: 0, totalPositive: 0, after1stDoseTests: 0, after1stDosePositive: 0, after2ndDoseTests: 0, after2ndDosePositive: 0, after30DaysTests: 0, after30DaysPositive: 0 });
            siteParticipantsSet.set(s, new Set());
        }
        return siteSummaries.get(s)!;
    };

    INITIAL_SITES.forEach(s => getSite(s));
    AGE_GROUPS.forEach(g => ageSummaries.set(g, { ageGroup: g, totalEvents: 0, culturePositive: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 }));
    pData.forEach(p => { if (p.site_name) getSite(p.site_name).enrollment++; });

    const participantsEpisodeMap = new Map<string, DiarrhealEvent[][]>();
    reportedEpisodesMap.forEach((episode, groupKey) => {
        const [participantId] = groupKey.split('|');
        const list = participantsEpisodeMap.get(participantId) || [];
        list.push(episode);
        participantsEpisodeMap.set(participantId, list);
    });

    participantsEpisodeMap.forEach((allEpisodes, participantId) => {
        const p = pMap.get(participantId);
        const participantRecurrentHistory: RecurrentCase['history'] = [];
        let participantCulturePositives = 0;
        const seenStrains = new Set<string>();
        let hasPersistentPathogen = false;

        allEpisodes.forEach(episode => {
            const sortedInEpisode = [...episode].sort((a,b) => (a.event_date === 'Unknown' ? 1 : b.event_date === 'Unknown' ? -1 : new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
            const representative = sortedInEpisode[0];
            const siteNameRaw = p?.site_name || representative.site_fallback || "Other/Unknown";
            const site = getSite(siteNameRaw);
            const pcrSum = pcrSummaries.get(site.siteName)!;
            siteParticipantsSet.get(site.siteName)?.add(participantId);
            
            const anyCulturePos = episode.some(e => e.culture_positive.toLowerCase().includes('pos') || e.culture_positive === '1');
            const primaryStrain = episode.find(e => (e.culture_positive.toLowerCase().includes('pos') || e.culture_positive === '1') && e.shigella_strain)?.shigella_strain;
            const anyPcrPos = episode.some(e => isPcrPositive(e.pcr_result));
            const anyPcrTested = episode.some(e => isPcrTested(e.pcr_result));

            // Concordance Tracking
            concordance.totalEpisodes++;
            if (anyCulturePos && anyPcrPos) concordance.culturePosPcrPos++;
            else if (!anyCulturePos && anyPcrPos) concordance.cultureNegPcrPos++;
            else if (anyCulturePos && !anyPcrPos) concordance.culturePosPcrNeg++;
            else concordance.bothNegative++;

            // Yield Tracking per Sample
            episode.forEach(e => {
                const isRS = e.stool_no.toUpperCase().includes('RS') || e.culture_no.toUpperCase().includes('RS');
                const target = isRS ? specimenYield.swab : specimenYield.stool;
                target.count++;
                if (e.culture_positive.toLowerCase().includes('pos') || e.culture_positive === '1') target.culturePos++;
                if (isPcrPositive(e.pcr_result)) target.pcrPos++;
            });

            if (primaryStrain) { if (seenStrains.has(primaryStrain)) hasPersistentPathogen = true; seenStrains.add(primaryStrain); }

            let doseCategory = "Baseline/Pre-Dose";
            const eD = parseDate(representative.event_date);
            const d1D = p?.dose1_date ? parseDate(p.dose1_date) : null;
            if (eD && d1D && eD >= d1D) {
                site.totalDiarrhealEvents++; site.reportedEventsCount++;
                const ageGroup = getAgeGroup(representative.age_months ?? p?.age_months ?? 0);
                const ageSum = ageGroup ? ageSummaries.get(ageGroup) : null;
                if (ageSum) { ageSum.totalEvents++; if (anyCulturePos) ageSum.culturePositive++; }
                if (anyPcrTested) { pcrSum.totalTests++; if (anyPcrPos) pcrSum.totalPositive++; }

                const d2D = p?.dose2_date ? parseDate(p.dose2_date) : null;
                const d2_30 = d2D ? addDays(d2D, 30) : null;
                const isAfter30 = (d2_30 && eD >= d2_30);
                const isAfterD2 = (d2D && eD >= d2D && !isAfter30);
                const isAfterD1 = (!isAfterD2 && !isAfter30);

                if (isAfterD1) { doseCategory = "After 1st Dose"; site.after1stDoseEvents++; if (ageSum) ageSum.after1stDoseEvents++; if (anyCulturePos) { site.after1stDoseCulturePositive++; if (ageSum) ageSum.after1stDoseCulturePositive++; } if (anyPcrTested) { pcrSum.after1stDoseTests++; if (anyPcrPos) pcrSum.after1stDosePositive++; } }
                else if (isAfterD2) { doseCategory = "After 2nd Dose"; site.after2ndDoseEvents++; if (ageSum) ageSum.after2ndDoseEvents++; if (anyCulturePos) { site.after2ndDoseCulturePositive++; if (ageSum) ageSum.after2ndDoseCulturePositive++; } if (anyPcrTested) { pcrSum.after2ndDoseTests++; if (anyPcrPos) pcrSum.after2ndDosePositive++; } }
                else if (isAfter30) { doseCategory = "After 30 Days of 2nd Dose"; site.after30Days2ndDoseEvents++; if (ageSum) ageSum.after30Days2ndDoseEvents++; if (anyCulturePos) { site.after30Days2ndDoseCulturePositive++; if (ageSum) ageSum.after30Days2ndDoseCulturePositive++; } if (anyPcrTested) { pcrSum.after30DaysTests++; if (anyPcrPos) pcrSum.after30DaysPositive++; } }

                if (anyCulturePos) {
                    const sN = primaryStrain || "Unspecified";
                    if (!strainSummaries.has(sN)) strainSummaries.set(sN, { strainName: sN, total: 0, after1stDose: 0, after2ndDose: 0, after30Days2ndDose: 0 });
                    const ss = strainSummaries.get(sN)!; ss.total++;
                    if (isAfterD1) ss.after1stDose++; else if (isAfterD2) ss.after2ndDose++; else if (isAfter30) ss.after30Days2ndDose++;
                }
            }
            participantRecurrentHistory.push({ date: representative.event_date, result: anyCulturePos ? "Positive" : "Negative", stage: doseCategory, strain: primaryStrain });
            if (anyCulturePos) participantCulturePositives++;
            detailedEvents.push({ site: site.siteName, participantId, collectionDate: representative.event_date, doseCategory, cultureResult: anyCulturePos ? "Positive" : "Negative", shigellaStrain: primaryStrain || "N/A", pcrResult: anyPcrTested ? (anyPcrPos ? "Positive" : "Negative") : "Not Tested", ageMonths: (representative.age_months ?? p?.age_months ?? 0).toFixed(1), participantTotalEvents: allEpisodes.length, stoolsCollected: episode.filter(e => !e.stool_no.toUpperCase().includes('RS') && !e.culture_no.toUpperCase().includes('RS')).length, rectalSwabsCollected: episode.filter(e => e.stool_no.toUpperCase().includes('RS') || e.culture_no.toUpperCase().includes('RS')).length });
        });
        if (allEpisodes.length > 1) recurrentCases.push({ participantId, siteName: p?.site_name || allEpisodes[0][0].site_fallback || "Other/Unknown", totalEpisodes: allEpisodes.length, culturePositives: participantCulturePositives, hasPersistentPathogen, history: participantRecurrentHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) });
    });

    siteSummaries.forEach(s => { s.participantsWithEvents = siteParticipantsSet.get(s.siteName)?.size || 0; });
    const sites = Array.from(siteSummaries.values());
    return {
        sites, totals: { siteName: "Total", enrollment: sites.reduce((s, x) => s + x.enrollment, 0), totalDiarrhealEvents: sites.reduce((s, x) => s + x.totalDiarrhealEvents, 0), reportedEventsCount: sites.reduce((s, x) => s + x.reportedEventsCount, 0), participantsWithEvents: Array.from(new Set(Array.from(siteParticipantsSet.values()).flatMap(set => Array.from(set)))).length, after1stDoseEvents: sites.reduce((s, x) => s + x.after1stDoseEvents, 0), after1stDoseCulturePositive: sites.reduce((s, x) => s + x.after1stDoseCulturePositive, 0), after2ndDoseEvents: sites.reduce((s, x) => s + x.after2ndDoseEvents, 0), after2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after2ndDoseCulturePositive, 0), after30Days2ndDoseEvents: sites.reduce((s, x) => s + x.after30Days2ndDoseEvents, 0), after30Days2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after30Days2ndDoseCulturePositive, 0) },
        strains: Array.from(strainSummaries.values()).sort((a, b) => b.total - a.total), pcrSites: Array.from(pcrSummaries.values()),
        pcrTotals: { siteName: "Total", totalTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.totalTests, 0), totalPositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.totalPositive, 0), after1stDoseTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after1stDoseTests, 0), after1stDosePositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after1stDosePositive, 0), after2ndDoseTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after2ndDoseTests, 0), after2ndDosePositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after2ndDosePositive, 0), after30DaysTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after30DaysTests, 0), after30DaysPositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after30DaysPositive, 0) },
        ageDistribution: Array.from(ageSummaries.values()).filter(a => a.totalEvents > 0), detailedEvents: detailedEvents.sort((a, b) => a.site.localeCompare(b.site) || a.participantId.localeCompare(b.participantId)), recurrentCases: recurrentCases.sort((a, b) => b.totalEpisodes - a.totalEpisodes), unmappedEvents: eData.filter(e => !pMap.has(e.participant_id)).length,
        concordance, specimenYield
    };
};
