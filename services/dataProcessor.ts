
import type { Participant, DiarrhealEvent, SiteSummary, SummaryData, StrainSummary, PcrSummary, AgeSummary, PcrAgeSummary, DetailedParticipantEvent, RecurrentCase, DiagnosticConcordance } from '../types';

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
    // Remove day designations in various formats:
    // - (Day-01), (Day 01), Day-01, Day 01, , Day-01, etc.
    // Handles: optional comma, optional whitespace, Day (with optional parentheses), optional - or space, digits
    let result = val.replace(/,?\s*\(?Day[- ]?\d+\)?\s*/gi, '').trim();
    // Remove supplemental designations in similar formats (optional leading comma, optional surrounding parentheses, and optional whitespace)
    result = result.replace(/,?\s*\(?Supplemental\)?\s*/gi, '').trim();
    // Clean up trailing dashes and extra spaces
    result = result.replace(/[-\s]+$/, '').trim();
    // Treat comma and whitespace variants of the same case number identically.
    return result.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();
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
            const normalizedDelims = cleaned.replace(/[.\-\/]+/g, '.');
            const partsDMY = normalizedDelims.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
            if (partsDMY) date = new Date(Date.UTC(parseInt(partsDMY[3], 10), parseInt(partsDMY[2], 10) - 1, parseInt(partsDMY[1], 10)));
            const partsYMD = normalizedDelims.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
            if (partsYMD) date = new Date(Date.UTC(parseInt(partsYMD[1], 10), parseInt(partsYMD[2], 10) - 1, parseInt(partsYMD[3], 10)));
        }
        if (!isNaN(date.getTime())) return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
    return null;
};

const safeString = (val: any): string => (val === null || val === undefined) ? '' : String(val).trim();

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

const headerMatchesVariant = (header: string, variant: string): boolean => {
    const normalizedHeader = normalizeHeader(header);
    const normalizedVariant = normalizeHeader(variant);
    if (!normalizedHeader || !normalizedVariant) return false;

    // Generic headers like "Date", "ID", "Result" should only match exactly to avoid picking
    // up unrelated fields such as "Diagnostic Date" or "Diagnostic Sending Date".
    const genericExactOnly = new Set(['date', 'id', 'result', 'site']);
    if (genericExactOnly.has(normalizedVariant)) {
        return normalizedHeader === normalizedVariant;
    }

    return normalizedHeader === normalizedVariant || normalizedHeader.includes(normalizedVariant);
};

const findHeaderRowIndex = (rows: any[][], requiredVariants: string[][]): number => {
    const maxRows = Math.min(rows.length, 200);
    for (let i = 0; i < maxRows; i++) {
        const pots = (rows[i] || []).map(h => safeString(h));
        if (requiredVariants.every(vars => vars.some(v => pots.some(header => headerMatchesVariant(header, v))))) return i;
    }
    return -1;
};

const findHeaderIndex = (headers: any[], names: string[]): number => {
    return headers.findIndex(h => names.some(name => headerMatchesVariant(h, name)));
};

const findPcrResultHeaderIndex = (headers: any[]): number => {
    const headerValues = headers.map(h => normalizeHeader(safeString(h)));
    for (let i = 0; i < headerValues.length; i++) {
        const value = headerValues[i];
        if (value === 'rtpcrresult' || value === 'rtpcr' || value === 'pcrresult' || value === 'pcr') return i;
    }
    for (let i = 0; i < headerValues.length; i++) {
        const value = headerValues[i];
        if (value.includes('rtpcr') && value.includes('result')) return i;
        if (value.includes('pcrresult') && !value.includes('date')) return i;
    }
    return headers.findIndex(h => {
        const normalized = normalizeHeader(safeString(h));
        return /(rt[- ]?pcr|pcr)result\b/.test(normalized) && !normalized.includes('date');
    });
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
    // 1. Explicit Not Tested / N/A / Unknown
    if (/^\s*(?:n\/?a|na|unknown|missing|not tested|not done|pending|inconclusive|nd)\s*$/i.test(normalized)) return 'Not Tested';
    // 2. Explicit Positive
    if (/^\s*(?:1|\+|positive|pos|p|detected|reactive|present|yes|y|true)\s*$/i.test(normalized)) return 'Positive';
    // 3. Explicit Negative
    if (/^\s*(?:0|\-|negative|neg|no|not|absent|undetected|non[- ]?detected)\s*$/i.test(normalized)) return 'Negative';
    // 4. Word boundary patterns
    if (/\b(?:positive|pos|detected|reactive|present)\b/i.test(normalized)) return 'Positive';
    if (/\b(?:negative|neg|absent|undetected|not detected|non[- ]?detected)\b/i.test(normalized)) return 'Negative';
    if (/\b(?:not tested|not done|pending|inconclusive|n\/a)\b/i.test(normalized)) return 'Not Tested';
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
    if (months <= 0 || isNaN(months)) return null;
    if (months <= 12) return "6-12 month";
    if (months <= 24) return "13-24 month";
    if (months <= 36) return "25-36 month";
    if (months <= 48) return "37-48 months";
    return "above 48 months";
};

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
        if (colMap.eventNoSite >= 0 && safeString(dataRows[i][colMap.eventNoSite]).trim() !== '') {
            lastValidIndex = i;
            break;
        }
    }
    const filteredDataRows = lastValidIndex >= 0 ? dataRows.slice(0, lastValidIndex + 1) : dataRows;

    const events: DiarrhealEvent[] = filteredDataRows.filter(row => {
        const c = safeString(row[colMap.cNo]);
        const randId = safeString(row[colMap.rand]);
        const stoolNo = safeString(row[colMap.stoolNo]);
        const dateVal = parseDate(row[colMap.date]);
        if (!randId || randId.toLowerCase().includes('total') || c.toLowerCase().includes('total')) return false;
        return (c !== '' || stoolNo !== '' || dateVal !== null);
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
            event_no_site: colMap.eventNoSite >= 0 ? safeString(row[colMap.eventNoSite]) : '',
            episode_id: `CNO-${safeString(row[colMap.cNo]) || stoolNoStr}`,
            shigella_strain: safeString(row[colMap.strain]),
            pcr_result: colMap.pcr >= 0 ? normalizePcrResult(row[colMap.pcr]) : '',
            age_months: colMap.age >= 0 ? parseAge(row[colMap.age]) || undefined : undefined,
            site_fallback: siteByRange === "Other/Unknown" ? (colMap.place >= 0 ? normalizeSiteName(safeString(row[colMap.place])) : siteByRange) : siteByRange,
            pcr_no_string: colMap.pcrNo >= 0 ? safeString(row[colMap.pcrNo]) : ''
        };
        return event;
    });

    const pcrSheetPatterns = [['Culture No', 'C.No'], ['Collection Date', 'Date', 'Sample Date'], ['RT-PCR result', 'PCR', 'RT-PCR Result', 'PCR Result', 'RT PCR result', 'RT PCR Result', 'Result']];
    const sheet6Name = workbook.SheetNames.find((name: string) => name !== sheetName && findHeaderRowIndex(getRowsFromWorkbook(workbook, name), pcrSheetPatterns) >= 0)
        ?? workbook.SheetNames.find((name: string) => /sheet\s*6/i.test(name) || /pcr/i.test(name))
        ?? (workbook.SheetNames.includes('Sheet6') ? 'Sheet6' : (workbook.SheetNames.length > 2 ? workbook.SheetNames[2] : null));
    if (sheet6Name) {
        const pcrRows = getRowsFromWorkbook(workbook, sheet6Name);
        const pcrHeaderIndex = findHeaderRowIndex(pcrRows, pcrSheetPatterns);
        if (pcrHeaderIndex >= 0) {
            const pcrHeaders = pcrRows[pcrHeaderIndex].map(h => safeString(h));
            let randIndex = findHeaderIndex(pcrHeaders, ['Rand# ID', 'ID', 'Randomization Number', 'Rand#', 'Randomization No']);
            const dateIndex = findHeaderIndex(pcrHeaders, ['Collection Date', 'Sample Date', 'Date']);
            const pcrIndex = findPcrResultHeaderIndex(pcrHeaders);
            const cNoIndex = findHeaderIndex(pcrHeaders, ['Culture No', 'C.No']);
            const stoolIndex = findHeaderIndex(pcrHeaders, ['Stool No', 'Stool#']);
            const eventNoSiteIndex = findHeaderIndex(pcrHeaders, ['Event No (Site)', 'Event No', 'Site Event No', 'Site No']);
            const placeIndex = findHeaderIndex(pcrHeaders, ['Place', 'Site']);
            const ageIndex = findHeaderIndex(pcrHeaders, ['Age']);
            if (randIndex < 0) {
                const inferred = findBestColumnByValidator(pcrRows, isLikelyRandomizationId, pcrHeaderIndex + 1, 15);
                if (inferred >= 0) {
                    randIndex = inferred;
                }
            }
            const pcrColMap = {
                rand: randIndex,
                date: dateIndex,
                pcr: pcrIndex,
                cNo: cNoIndex,
                stoolNo: stoolIndex,
                eventNoSite: eventNoSiteIndex,
                place: placeIndex,
                age: ageIndex
            };
            if (pcrColMap.pcr >= 0) {
                const pcrDataRows = pcrRows.slice(pcrHeaderIndex + 1);
                const matchedEventsSet = new Set<DiarrhealEvent>();

                for (const row of pcrDataRows) {
                    const rawPcrValue = safeString(row[pcrColMap.pcr]);
                    if (!rawPcrValue) continue;
                    const normalizedPcrValue = normalizePcrResult(rawPcrValue);
                    const rawDateValue = pcrColMap.date >= 0 ? row[pcrColMap.date] : null;
                    const parsedDateObj = parseDate(rawDateValue);
                    const dateString = parsedDateObj?.toISOString().split('T')[0] || safeString(rawDateValue);
                    const rid = pcrColMap.rand >= 0 ? safeString(row[pcrColMap.rand]) : '';
                    const cNo = pcrColMap.cNo >= 0 ? safeString(row[pcrColMap.cNo]) : '';
                    const stoolNo = pcrColMap.stoolNo >= 0 ? safeString(row[pcrColMap.stoolNo]) : '';
                    const eventNoSite = pcrColMap.eventNoSite >= 0 ? safeString(row[pcrColMap.eventNoSite]) : '';
                    const placeStr = pcrColMap.place >= 0 ? safeString(row[pcrColMap.place]) : '';
                    const ageRaw = pcrColMap.age >= 0 ? row[pcrColMap.age] : null;

                    const candidates = events.filter(e => normalizeKeyPart(e.participant_id) === normalizeKeyPart(rid) && !matchedEventsSet.has(e));

                    let matchedEvent: DiarrhealEvent | undefined = undefined;

                    // Tier 1: Culture No Match
                    if (cNo && cNo.toUpperCase() !== 'N/A') {
                        matchedEvent = candidates.find(e => normalizeKeyPart(e.culture_no) === normalizeKeyPart(cNo));
                    }
                    // Tier 2: Stool No Match
                    if (!matchedEvent && stoolNo) {
                        matchedEvent = candidates.find(e => normalizeKeyPart(e.stool_no) === normalizeKeyPart(stoolNo));
                    }
                    // Tier 3: Numeric Digits in Stool No Match
                    if (!matchedEvent && stoolNo) {
                        const digits6 = stoolNo.match(/\d+/);
                        if (digits6) {
                            matchedEvent = candidates.find(e => {
                                const digits1 = e.stool_no.match(/\d+/);
                                return digits1 && digits1[0] === digits6[0];
                            });
                        }
                    }
                    // Tier 4: Date Match
                    if (!matchedEvent && dateString && dateString !== 'Unknown') {
                        matchedEvent = candidates.find(e => e.event_date === dateString);
                    }
                    // Tier 5: Fallback Single Candidate
                    if (!matchedEvent && candidates.length === 1) {
                        matchedEvent = candidates[0];
                    }

                    if (matchedEvent) {
                        matchedEvent.pcr_result = normalizedPcrValue;
                        if ((!matchedEvent.event_date || matchedEvent.event_date === 'Unknown') && dateString && dateString !== 'Unknown') {
                            matchedEvent.event_date = dateString;
                        }
                        const parsedAge6 = parseAge(ageRaw);
                        if (parsedAge6 !== null) {
                            matchedEvent.age_months = parsedAge6;
                        }
                        matchedEventsSet.add(matchedEvent);
                    } else if (rid) {
                        const siteByRange = getSiteFromId(rid);
                        const newEvent: DiarrhealEvent = {
                            participant_id: rid,
                            event_date: dateString || 'Unknown',
                            culture_positive: 'Negative',
                            culture_no: cNo || 'N/A',
                            stool_no: stoolNo || cNo || 'N/A',
                            event_no_site: eventNoSite || '',
                            episode_id: `PCR-${stoolNo || cNo || rid}`,
                            shigella_strain: '',
                            pcr_result: normalizedPcrValue,
                            age_months: parseAge(ageRaw) || undefined,
                            site_fallback: siteByRange === "Other/Unknown" ? (placeStr ? normalizeSiteName(placeStr) : siteByRange) : siteByRange,
                            pcr_no_string: ''
                        };
                        events.push(newEvent);
                        matchedEventsSet.add(newEvent);
                    }
                }
            }
        }
    }

    return events;
};

export const processFiles = async (participantsFile: File, eventsFile: File): Promise<SummaryData> => {
    const [pData, eData] = await Promise.all([parseParticipantsFile(participantsFile), parseEventsFile(eventsFile)]);
    const pMap = new Map<string, Participant>();
    pData.forEach(p => pMap.set(p.participant_id, p));

    const siteSummaries = new Map<string, SiteSummary>();
    const pcrSummaries = new Map<string, PcrSummary>();
    const ageSummaries = new Map<string, AgeSummary>();
    const pcrAgeSummaries = new Map<string, PcrAgeSummary>();
    const strainSummaries = new Map<string, StrainSummary>();

    const siteStrainSummariesBySite = new Map<string, Map<string, StrainSummary>>();
    const ageStrainSummariesByAge = new Map<string, Map<string, StrainSummary>>();
    const detailedEvents: DetailedParticipantEvent[] = [];
    const recurrentCases: RecurrentCase[] = [];
    const siteParticipantsSet = new Map<string, Set<string>>();
    const concordance: DiagnosticConcordance = { totalEpisodes: 0, culturePosPcrPos: 0, cultureNegPcrPos: 0, culturePosPcrNeg: 0, bothNegative: 0 };
    const specimenYield = {
        stool: { count: 0, culturePos: 0, pcrPos: 0 },
        swab: { count: 0, culturePos: 0, pcrPos: 0 }
    };

    const getPcrSite = (siteName: string): PcrSummary => {
        const existing = pcrSummaries.get(siteName);
        if (existing) return existing;
        const created: PcrSummary = { siteName, totalTests: 0, totalPositive: 0, after1stDoseTests: 0, after1stDosePositive: 0, after2ndDoseTests: 0, after2ndDosePositive: 0, after30DaysTests: 0, after30DaysPositive: 0 };
        pcrSummaries.set(siteName, created);
        return created;
    };

    const getSite = (n: string) => {
        const s = normalizeSiteName(n);
        if (!siteSummaries.has(s)) {
            siteSummaries.set(s, { siteName: s, enrollment: 0, totalDiarrhealEvents: 0, reportedEventsCount: 0, totalCulturePositive: 0, participantsWithEvents: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 });
            getPcrSite(s);
            siteParticipantsSet.set(s, new Set());
        }
        return siteSummaries.get(s)!;
    };

    INITIAL_SITES.forEach(s => {
        getSite(s);
        siteStrainSummariesBySite.set(s, new Map());
    });
    AGE_GROUPS.forEach(g => {
        ageSummaries.set(g, { ageGroup: g, totalEvents: 0, culturePositive: 0, after1stDoseEvents: 0, after1stDoseCulturePositive: 0, after2ndDoseEvents: 0, after2ndDoseCulturePositive: 0, after30Days2ndDoseEvents: 0, after30Days2ndDoseCulturePositive: 0 });
        pcrAgeSummaries.set(g, { ageGroup: g, totalTests: 0, totalPositive: 0, after1stDoseTests: 0, after1stDosePositive: 0, after2ndDoseTests: 0, after2ndDosePositive: 0, after30DaysTests: 0, after30DaysPositive: 0 });
        ageStrainSummariesByAge.set(g, new Map());
    });
    pData.forEach(p => { if (p.site_name) getSite(p.site_name).enrollment++; });

    // Process RT-PCR Tests across all tested samples
    eData.forEach(e => {
        if (!isPcrTested(e.pcr_result)) return;
        const isPos = isPcrPositive(e.pcr_result);
        const p = pMap.get(e.participant_id);
        const siteNameRaw = (p?.site_name && p.site_name !== "Other/Unknown") ? p.site_name : (e.site_fallback && e.site_fallback !== "Other/Unknown" ? e.site_fallback : getSiteFromId(e.participant_id));
        const siteName = normalizeSiteName(siteNameRaw);
        const pcrSum = getPcrSite(siteName);
        pcrSum.totalTests++;
        if (isPos) pcrSum.totalPositive++;

        const ageM = e.age_months ?? p?.age_months ?? 0;
        const ageGroup = getAgeGroup(ageM);
        const pcrAgeSum = ageGroup ? pcrAgeSummaries.get(ageGroup) : null;
        if (pcrAgeSum) {
            pcrAgeSum.totalTests++;
            if (isPos) pcrAgeSum.totalPositive++;
        }

        const eD = parseDate(e.event_date);
        const d1D = p?.dose1_date ? parseDate(p.dose1_date) : null;
        const d2D = p?.dose2_date ? parseDate(p.dose2_date) : null;
        const d2_30 = d2D ? addDays(d2D, 30) : null;

        if (eD && d1D && eD >= d1D) {
            const isAfter30 = (d2_30 && eD >= d2_30);
            const isAfterD2 = (d2D && eD >= d2D && !isAfter30);
            const isAfterD1 = (!isAfterD2 && !isAfter30);

            if (isAfterD1) {
                if (pcrSum) { pcrSum.after1stDoseTests++; if (isPos) pcrSum.after1stDosePositive++; }
                if (pcrAgeSum) { pcrAgeSum.after1stDoseTests++; if (isPos) pcrAgeSum.after1stDosePositive++; }
            } else if (isAfterD2) {
                if (pcrSum) { pcrSum.after2ndDoseTests++; if (isPos) pcrSum.after2ndDosePositive++; }
                if (pcrAgeSum) { pcrAgeSum.after2ndDoseTests++; if (isPos) pcrAgeSum.after2ndDosePositive++; }
            } else if (isAfter30) {
                if (pcrSum) { pcrSum.after30DaysTests++; if (isPos) pcrSum.after30DaysPositive++; }
                if (pcrAgeSum) { pcrAgeSum.after30DaysTests++; if (isPos) pcrAgeSum.after30DaysPositive++; }
            }
        }
    });

    const reportedEpisodesMap = new Map<string, DiarrhealEvent[]>();
    eData.forEach(e => {
        const normalizedEventId = normalizeEventNoSite(e.event_no_site || '');
        const baseEventId = normalizedEventId || `UN-${e.participant_id}-${e.event_date}-${e.culture_no}-${e.stool_no}`;
        const groupKey = `${e.participant_id}|${baseEventId}`;
        const list = reportedEpisodesMap.get(groupKey) || [];
        list.push(e);
        reportedEpisodesMap.set(groupKey, list);
    });

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
            const ageGroup = (() => {
                const eD = parseDate(representative.event_date);
                if (!eD) return getAgeGroup(representative.age_months ?? p?.age_months ?? 0);
                return getAgeGroup(representative.age_months ?? p?.age_months ?? 0);
            })();
            const eD = parseDate(representative.event_date);
            const d1D = p?.dose1_date ? parseDate(p.dose1_date) : null;
            if (eD && d1D && eD >= d1D) {
                site.totalDiarrhealEvents++; site.reportedEventsCount++;
                if (anyCulturePos) site.totalCulturePositive++;
                const ageSum = ageGroup ? ageSummaries.get(ageGroup) : null;
                if (ageSum) { ageSum.totalEvents++; if (anyCulturePos) ageSum.culturePositive++; }

                const d2D = p?.dose2_date ? parseDate(p.dose2_date) : null;
                const d2_30 = d2D ? addDays(d2D, 30) : null;
                const isAfter30 = (d2_30 && eD >= d2_30);
                const isAfterD2 = (d2D && eD >= d2D && !isAfter30);
                const isAfterD1 = (!isAfterD2 && !isAfter30);

                if (isAfterD1) {
                    doseCategory = "After 1st Dose";
                    site.after1stDoseEvents++;
                    if (ageSum) ageSum.after1stDoseEvents++;
                    if (anyCulturePos) { site.after1stDoseCulturePositive++; if (ageSum) ageSum.after1stDoseCulturePositive++; }
                }
                else if (isAfterD2) {
                    doseCategory = "After 2nd Dose";
                    site.after2ndDoseEvents++;
                    if (ageSum) ageSum.after2ndDoseEvents++;
                    if (anyCulturePos) { site.after2ndDoseCulturePositive++; if (ageSum) ageSum.after2ndDoseCulturePositive++; }
                }
                else if (isAfter30) {
                    doseCategory = "After 30 Days of 2nd Dose";
                    site.after30Days2ndDoseEvents++;
                    if (ageSum) ageSum.after30Days2ndDoseEvents++;
                    if (anyCulturePos) { site.after30Days2ndDoseCulturePositive++; if (ageSum) ageSum.after30Days2ndDoseCulturePositive++; }
                }

                if (anyCulturePos) {
                    const sN = primaryStrain || "Unspecified";

                    // Existing global strain totals
                    if (!strainSummaries.has(sN)) strainSummaries.set(sN, { strainName: sN, total: 0, after1stDose: 0, after2ndDose: 0, after30Days2ndDose: 0 });
                    const ss = strainSummaries.get(sN)!; ss.total++;
                    if (isAfterD1) ss.after1stDose++; else if (isAfterD2) ss.after2ndDose++; else if (isAfter30) ss.after30Days2ndDose++;

                    // Per-site/per-strain culture-positive totals
                    if (!siteStrainSummariesBySite.has(site.siteName)) siteStrainSummariesBySite.set(site.siteName, new Map());
                    const perSite = siteStrainSummariesBySite.get(site.siteName)!;
                    if (!perSite.has(sN)) perSite.set(sN, { strainName: sN, total: 0, after1stDose: 0, after2ndDose: 0, after30Days2ndDose: 0 });
                    const siteSs = perSite.get(sN)!;
                    siteSs.total++;
                    if (isAfterD1) siteSs.after1stDose++; else if (isAfterD2) siteSs.after2ndDose++; else if (isAfter30) siteSs.after30Days2ndDose++;

                    // Per-age/per-strain culture-positive totals
                    if (ageGroup) {
                        if (!ageStrainSummariesByAge.has(ageGroup)) ageStrainSummariesByAge.set(ageGroup, new Map());
                        const perAge = ageStrainSummariesByAge.get(ageGroup)!;
                        if (!perAge.has(sN)) perAge.set(sN, { strainName: sN, total: 0, after1stDose: 0, after2ndDose: 0, after30Days2ndDose: 0 });
                        const ageSs = perAge.get(sN)!;
                        ageSs.total++;
                        if (isAfterD1) ageSs.after1stDose++; else if (isAfterD2) ageSs.after2ndDose++; else if (isAfter30) ageSs.after30Days2ndDose++;
                    }
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
    const siteStrainDistribution = Array.from(siteStrainSummariesBySite.entries()).map(([siteName, strainsMap]) => ({
        siteName,
        strains: Array.from(strainsMap.values()).sort((a, b) => b.total - a.total)
    }));

    const ageStrainDistribution = Array.from(ageStrainSummariesByAge.entries()).map(([ageGroup, strainsMap]) => ({
        ageGroup,
        strains: Array.from(strainsMap.values()).sort((a, b) => b.total - a.total)
    }));

    return {
        sites,
        totals: { siteName: "Total", enrollment: sites.reduce((s, x) => s + x.enrollment, 0), totalDiarrhealEvents: sites.reduce((s, x) => s + x.totalDiarrhealEvents, 0), reportedEventsCount: sites.reduce((s, x) => s + x.reportedEventsCount, 0), totalCulturePositive: sites.reduce((s, x) => s + x.totalCulturePositive, 0), participantsWithEvents: Array.from(new Set(Array.from(siteParticipantsSet.values()).flatMap(set => Array.from(set)))).length, after1stDoseEvents: sites.reduce((s, x) => s + x.after1stDoseEvents, 0), after1stDoseCulturePositive: sites.reduce((s, x) => s + x.after1stDoseCulturePositive, 0), after2ndDoseEvents: sites.reduce((s, x) => s + x.after2ndDoseEvents, 0), after2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after2ndDoseCulturePositive, 0), after30Days2ndDoseEvents: sites.reduce((s, x) => s + x.after30Days2ndDoseEvents, 0), after30Days2ndDoseCulturePositive: sites.reduce((s, x) => s + x.after30Days2ndDoseCulturePositive, 0) },
        strains: Array.from(strainSummaries.values()).sort((a, b) => b.total - a.total),

        siteStrainDistribution,
        ageStrainDistribution,

        pcrSites: Array.from(pcrSummaries.values()),
        pcrTotals: { siteName: "Total", totalTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.totalTests, 0), totalPositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.totalPositive, 0), after1stDoseTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after1stDoseTests, 0), after1stDosePositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after1stDosePositive, 0), after2ndDoseTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after2ndDoseTests, 0), after2ndDosePositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after2ndDosePositive, 0), after30DaysTests: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after30DaysTests, 0), after30DaysPositive: Array.from(pcrSummaries.values()).reduce((s, x) => s + x.after30DaysPositive, 0) },
        ageDistribution: Array.from(ageSummaries.values()).filter(a => a.totalEvents > 0),
        ageTotals: {
            ageGroup: "Total",
            totalEvents: Array.from(ageSummaries.values()).reduce((s, x) => s + x.totalEvents, 0),
            culturePositive: Array.from(ageSummaries.values()).reduce((s, x) => s + x.culturePositive, 0),
            after1stDoseEvents: Array.from(ageSummaries.values()).reduce((s, x) => s + x.after1stDoseEvents, 0),
            after1stDoseCulturePositive: Array.from(ageSummaries.values()).reduce((s, x) => s + x.after1stDoseCulturePositive, 0),
            after2ndDoseEvents: Array.from(ageSummaries.values()).reduce((s, x) => s + x.after2ndDoseEvents, 0),
            after2ndDoseCulturePositive: Array.from(ageSummaries.values()).reduce((s, x) => s + x.after2ndDoseCulturePositive, 0),
            after30Days2ndDoseEvents: Array.from(ageSummaries.values()).reduce((s, x) => s + x.after30Days2ndDoseEvents, 0),
            after30Days2ndDoseCulturePositive: Array.from(ageSummaries.values()).reduce((s, x) => s + x.after30Days2ndDoseCulturePositive, 0),
        },
        pcrAgeDistribution: Array.from(pcrAgeSummaries.values()).filter(a => a.totalTests > 0),
        pcrAgeTotals: {
            ageGroup: "Total",
            totalTests: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.totalTests, 0),
            totalPositive: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.totalPositive, 0),
            after1stDoseTests: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.after1stDoseTests, 0),
            after1stDosePositive: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.after1stDosePositive, 0),
            after2ndDoseTests: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.after2ndDoseTests, 0),
            after2ndDosePositive: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.after2ndDosePositive, 0),
            after30DaysTests: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.after30DaysTests, 0),
            after30DaysPositive: Array.from(pcrAgeSummaries.values()).reduce((s, x) => s + x.after30DaysPositive, 0),
        },
        detailedEvents: detailedEvents.sort((a, b) => a.site.localeCompare(b.site) || a.participantId.localeCompare(b.participantId)),
        participants: pData,
        recurrentCases: recurrentCases.sort((a, b) => b.totalEpisodes - a.totalEpisodes),
        unmappedEvents: eData.filter(e => !pMap.has(e.participant_id)).length,
        concordance,
        specimenYield
    };
};
