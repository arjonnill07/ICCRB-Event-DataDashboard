
import type { Participant, DiarrhealEvent, SiteSummary, SummaryData, StrainSummary, PcrSummary, AgeSummary } from '../types';

declare const XLSX: any;

const SITES = ["Tongi", "Mirpur", "Korail", "Mirzapur"];
const AGE_GROUPS = [
    "6-12 month",
    "13-24 month",
    "25-36 month",
    "37-48 months", // Pluralized to match request
    "above 48 months"
];

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
        if (date) {
            return new Date(Date.UTC(date.y, date.m - 1, date.d, date.H, date.M, date.S));
        }
    }
    
    if (typeof dateInput === 'string') {
        // Tries to parse ISO-like strings, or appends Z to treat as UTC
        let date = new Date(dateInput.includes('T') || dateInput.includes('Z') ? dateInput : `${dateInput}T00:00:00Z`);

        // Handles DD.MM.YYYY format if the first attempt failed
        if (isNaN(date.getTime())) {
            const partsDMY = dateInput.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
            if (partsDMY) {
                date = new Date(Date.UTC(parseInt(partsDMY[3], 10), parseInt(partsDMY[2], 10) - 1, parseInt(partsDMY[1], 10)));
            }
        }
        
        // If we have a valid date, normalize it to UTC midnight to avoid timezone issues
        if (!isNaN(date.getTime())) {
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        }
    }
    
    return null;
};

// Helper to parse age string (e.g., "1Y 8M", "6M 5D") into total months
const parseAge = (ageStr: any): number | null => {
    if (!ageStr) return null;
    const s = String(ageStr).toUpperCase().trim();
    if (!s) return null;

    let months = 0;
    let found = false;

    // Matches "1 Y", "1Y", "1 yr", "1 year", "1.5 Y"
    const yMatch = s.match(/(\d+(\.\d+)?)\s*Y/);
    if (yMatch) {
        months += parseFloat(yMatch[1]) * 12;
        found = true;
    }

    // Matches "8 M", "8M", "8 mo", "8 month", "8.5 M"
    const mMatch = s.match(/(\d+(\.\d+)?)\s*M/);
    if (mMatch) {
        months += parseFloat(mMatch[1]);
        found = true;
    }
    
    // If no specific unit markers are found but it is a plain number, 
    // we return null to be safe rather than guessing units, 
    // unless the prompt/data guarantees a unitless convention (not the case here).
    
    if (!found) return null;
    return months;
};

// Helper to determine age group based on months
const getAgeGroup = (months: number): string | null => {
    // Using integers for the lower bound checks usually aligns with "completed months" logic
    if (months >= 6 && months <= 12) return "6-12 month";
    if (months >= 13 && months <= 24) return "13-24 month";
    if (months >= 25 && months <= 36) return "25-36 month";
    if (months >= 37 && months <= 48) return "37-48 months";
    if (months > 48) return "above 48 months";
    return null;
};

// Helper to safely convert cell values to string, preserving '0' which is falsy in JS
const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
};

// More robust file parser that handles CSV and XLSX differently based on extension.
const parseFile = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const isCSV = file.name.toLowerCase().endsWith('.csv');

        reader.onload = (event) => {
            try {
                if (!event.target?.result) {
                    return reject(new Error("File could not be read."));
                }

                const data = event.target.result;
                // Using 'binary' for non-CSV (XLSX) fixes "Bad uncompressed size" errors often seen with ArrayBuffers
                const readOptions = { type: isCSV ? 'string' : 'binary' };
                const workbook = XLSX.read(data, readOptions);

                if (!workbook || !workbook.SheetNames.length) {
                    return reject(new Error(`File "${file.name}" contains no readable sheets.`));
                }
                
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                if (rows.length < 1) {
                    return reject(new Error(`File "${file.name}" appears to be empty.`));
                }

                resolve(rows);

            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                reject(new Error(`Failed to parse "${file.name}". Ensure it is a valid CSV or XLSX file. Error: ${errorMessage}`));
            }
        };

        reader.onerror = () => reject(new Error(`Error reading file "${file.name}".`));

        // Use readAsText for CSVs and readAsBinaryString for others (like XLSX) to avoid compression issues
        if (isCSV) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    });
};


const parseParticipantsFile = async (file: File): Promise<Participant[]> => {
    const rows = await parseFile(file);
    
    if (rows.length < 2) {
        throw new Error("Participant file has an invalid format or is too short.");
    }

    const REQUIRED_HEADERS = ['Site Name', 'Randomization Number', 'Visit Name', 'Actual Date'];
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const potentialHeaders = rows[i].map(h => String(h || '').trim());
        const hasAllHeaders = REQUIRED_HEADERS.every(reqHeader => potentialHeaders.includes(reqHeader));
        if (hasAllHeaders) {
            headerRowIndex = i;
            headers = potentialHeaders;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Could not find the header row in the participant file. Make sure the file contains a row with the columns: 'Site Name', 'Randomization Number', 'Visit Name', 'Actual Date'.");
    }
    
    const dataRows = rows.slice(headerRowIndex + 1);
    
    // Improved Age column detection:
    // Finds any column containing "age" but excludes common words ending in "age"
    // This allows for "Age", "Age_Months", "Child Age", "Age (Y)" etc.
    const ageIndex = headers.findIndex(h => {
        const lowerH = String(h || '').toLowerCase();
        if (!lowerH.includes('age')) return false;
        // Exclude common false positives
        if (/village|dosage|manage|damage|stage|usage|storage|message|language|package|coverage|triage|average|percentage|shortage|leakage|sewage|voltage/.test(lowerH)) return false;
        return true;
    });

    const colMap = {
        siteName: headers.indexOf('Site Name'),
        randNum: headers.indexOf('Randomization Number'),
        visitName: headers.indexOf('Visit Name'),
        actualDate: headers.indexOf('Actual Date'),
        age: ageIndex
    };

    const participantsMap = new Map<string, Partial<Participant>>();

    for (const row of dataRows) {
        const participantId = String(row[colMap.randNum] || '').trim();
        if (!participantId) continue;

        if (!participantsMap.has(participantId)) {
            const ageMonths = colMap.age > -1 ? parseAge(row[colMap.age]) : undefined;
            
            participantsMap.set(participantId, {
                participant_id: participantId,
                site_name: String(row[colMap.siteName] || '').trim(),
                age_months: ageMonths || undefined
            });
        }

        const participantRecord = participantsMap.get(participantId)!;
        const visitName = String(row[colMap.visitName] || '').trim();
        const actualDateObj = parseDate(row[colMap.actualDate]);
        
        // Update age if not set and available in this row (sometimes age is only on the first row for a participant)
        if (colMap.age > -1 && participantRecord.age_months === undefined) {
             const ageMonths = parseAge(row[colMap.age]);
             if (ageMonths !== null) {
                 participantRecord.age_months = ageMonths;
             }
        }

        if (actualDateObj) {
            const actualDateStr = actualDateObj.toISOString().split('T')[0];
            if (visitName === 'V1') {
                participantRecord.dose1_date = actualDateStr;
            } else if (visitName === 'V3') {
                participantRecord.dose2_date = actualDateStr;
            }
        }
    }
    
    const result = Array.from(participantsMap.values())
        .filter(p => p.participant_id && p.site_name) as Participant[];
    
    return result;
};

const parseEventsFile = async (file: File): Promise<DiarrhealEvent[]> => {
    const rows = await parseFile(file);

    if (rows.length < 2) {
        throw new Error("Events file has an invalid format or is too short.");
    }
    
    const REQUIRED_BASE_HEADERS = ['Rand# ID', 'Collection Date', 'Result'];
    
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const potentialHeaders = rows[i].map(h => String(h || '').trim());
        const hasBaseHeaders = REQUIRED_BASE_HEADERS.every(req => potentialHeaders.includes(req));

        if (hasBaseHeaders) {
            headerRowIndex = i;
            headers = potentialHeaders;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Could not find required headers in events file. Must contain at least: 'Rand# ID', 'Collection Date', 'Result'.");
    }

    // Helper to find column index with regex and exclusions (e.g. exclude 'date' from 'pcr' search)
    const findColIndex = (headers: string[], matchRegex: RegExp, excludeRegex?: RegExp): number => {
        return headers.findIndex(h => {
            if (!matchRegex.test(h)) return false;
            if (excludeRegex && excludeRegex.test(h)) return false;
            return true;
        });
    };
    
    const shigellaStrainIndex = findColIndex(headers, /shigella\s*strain/i, /date|time/i);
    
    // Improved PCR column detection with prioritized strategies:
    
    // 1. Look for explicit 'RT-PCR result' first (Highest Priority)
    let pcrResultIndex = findColIndex(headers, /rt[- ]?pcr\s*(result|val|outcome)/i, /date|time|ct|cycle/i);
    
    // 2. If not found, look for 'Shigella PCR result'
    if (pcrResultIndex === -1) {
        pcrResultIndex = findColIndex(headers, /shigella\s*pcr\s*(result|val)/i, /date|time|ct|cycle/i);
    }

    // 3. If not found, look for generic 'PCR Result'
    if (pcrResultIndex === -1) {
        pcrResultIndex = findColIndex(headers, /pcr\s*result/i, /date|time|ct|cycle/i);
    }
    
    // 4. Fallback: look for 'RT-PCR' or 'Shigella PCR' but strictly exclude date, time, id, sample, visit, ct, cycle
    // This helps avoid columns like "RT-PCR Date" or "RT-PCR Ct value"
    if (pcrResultIndex === -1) {
        pcrResultIndex = findColIndex(headers, /rt[- ]?pcr|shigella\s*pcr/i, /date|time|id|sample|visit|specimen|code|comment|note|ct|cycle/i);
    }

    // Age column detection in events file
    const ageIndex = headers.findIndex(h => {
        const lowerH = String(h || '').toLowerCase();
        if (!lowerH.includes('age')) return false;
        // Exclude common false positives
        if (/village|dosage|manage|damage|stage|usage|storage|message|language|package|coverage|triage|average|percentage|shortage|leakage|sewage|voltage/.test(lowerH)) return false;
        return true;
    });
    
    const colMap = {
        randId: headers.indexOf('Rand# ID'),
        collectionDate: headers.indexOf('Collection Date'),
        resultCulture: headers.indexOf('Result'),
        siteSpecificParticipants: headers.indexOf('Site specific Participants'),
        siteNumberEpisode: headers.indexOf('Site Number & Episode'),
        shigellaStrain: shigellaStrainIndex,
        pcrResult: pcrResultIndex,
        age: ageIndex
    };
    
    const dataRows = rows.slice(headerRowIndex + 1);

    const result = dataRows.map((row, index) => {
        const participantId = safeString(row[colMap.randId]);
        const eventDateObj = parseDate(row[colMap.collectionDate]);

        // A row is only a processable event if it has a participant and a date.
        if (!participantId || !eventDateObj) {
            return null;
        }

        const specificEpisodeId = colMap.siteSpecificParticipants > -1 ? safeString(row[colMap.siteSpecificParticipants]) : '';
        const generalEpisodeId = colMap.siteNumberEpisode > -1 ? safeString(row[colMap.siteNumberEpisode]) : '';
        
        let episodeId = specificEpisodeId || generalEpisodeId;
        
        // If no episode identifier is found, create a synthetic one to ensure the event is counted as a unique episode.
        if (!episodeId) {
            episodeId = `synthetic-episode-${participantId}-${index}`;
        }
        
        const shigellaStrain = colMap.shigellaStrain > -1 ? safeString(row[colMap.shigellaStrain]) : undefined;
        // Ensure that if the column exists but cell is empty, we get empty string. If column doesn't exist, we get undefined.
        // safeString handles null/undefined/0 correctly.
        const pcrResult = colMap.pcrResult > -1 ? safeString(row[colMap.pcrResult]) : undefined;
        
        // Parse Age if available in events file
        const ageMonths = colMap.age > -1 ? parseAge(row[colMap.age]) : undefined;

        return {
            participant_id: participantId,
            event_date: eventDateObj.toISOString().split('T')[0],
            culture_positive: safeString(row[colMap.resultCulture]),
            episode_id: episodeId,
            shigella_strain: shigellaStrain,
            pcr_result: pcrResult,
            age_months: ageMonths,
        }
    }).filter(Boolean) as DiarrhealEvent[];
    
    return result;
};


export const processFiles = async (participantsFile: File, eventsFile: File): Promise<SummaryData> => {
    const [participantsData, eventsData] = await Promise.all([
        parseParticipantsFile(participantsFile),
        parseEventsFile(eventsFile),
    ]);
    
    if (!participantsData.length) {
        throw new Error("The participants file could not be parsed or contains no valid data. Please check the file content and format.");
    }
    if (!eventsData.length) {
        throw new Error("The events file could not be parsed or contains no valid data. Please check the file content and format.");
    }
    
    // De-duplicate events to count unique episodes.
    const uniqueEpisodes = new Map<string, DiarrhealEvent>();
    
    // Helper to determine PCR rank: Positive (2) > Negative (1) > Missing/Pending (0)
    const getPcrRank = (val?: string) => {
        if (val === undefined || val === null) return 0;
        
        // Robust cleanup: remove quotes, trim, lowercase
        const v = String(val).replace(/['"]/g, '').trim().toLowerCase();
        
        // Treat specific strings as missing/pending
        if (!v || ['pending', 'na', 'n/a', '-', '.', 'missing', 'null'].includes(v)) return 0;
        
        // Check for positive indicators
        // Matches: "1", "positive", "pos", "detected", "+"
        // Excludes: "not detected"
        if (
            v === '1' || 
            v === 'true' ||
            v.includes('pos') || 
            v === '+' ||
            (v.includes('detect') && !v.includes('not detect'))
        ) {
            return 2;
        }
        
        // Everything else that is not empty/pending is treated as Negative (Rank 1)
        // This includes "0", "negative", "neg", "not detected", etc.
        return 1;
    };

    for (const event of eventsData) {
        // The parser now guarantees a participant_id and episode_id for valid events
        
        // Normalize episode ID by removing day-specific info to group multi-day samples
        const normalizedEpisodeId = event.episode_id.replace(/(, Day-\d+|\s+\(Day-\d+\)|\s+Day-\d+)/i, '').trim();
        const episodeKey = `${event.participant_id}-${normalizedEpisodeId}`;
        
        const existingEpisode = uniqueEpisodes.get(episodeKey);
        
        const rawResult = String(event.culture_positive).trim().toLowerCase();
        // Use a more lenient check for "positive"
        const isCurrentSamplePositive = rawResult.includes('pos') || rawResult === '1';
        
        const currentPcrRank = getPcrRank(event.pcr_result);

        if (!existingEpisode) {
            // This is the first sample we've seen for this episode.
            uniqueEpisodes.set(episodeKey, {
                ...event,
                culture_positive: isCurrentSamplePositive ? "Positive" : "Negative",
                // Store the PCR result if it has data. If rank is 0, stored value might be undefined or original 'pending' string.
                // We keep the original string if it has value, but the rank logic will determine final usage.
                pcr_result: currentPcrRank > 0 ? event.pcr_result : undefined 
            });
        } else {
            // We've already seen a sample for this episode. Update if necessary.
            
            // If the current sample is positive, the entire episode is now considered positive.
            if (isCurrentSamplePositive) {
                existingEpisode.culture_positive = "Positive";
                // If this sample is positive, it likely contains the accurate strain info
                if (event.shigella_strain) {
                    existingEpisode.shigella_strain = event.shigella_strain;
                }
            }
            
            // PCR Logic: if current sample has a "better" result (Positive > Negative > Missing), update it.
            const existingPcrRank = getPcrRank(existingEpisode.pcr_result);
            if (currentPcrRank > existingPcrRank) {
                existingEpisode.pcr_result = event.pcr_result;
            }
            
            // The episode date should be the earliest sample collection date.
            if (new Date(event.event_date) < new Date(existingEpisode.event_date)) {
                existingEpisode.event_date = event.event_date;
            }
            
            // If existing episode doesn't have age but current sample does, update it
            if (existingEpisode.age_months === undefined && event.age_months !== undefined) {
                existingEpisode.age_months = event.age_months;
            }
        }
    }
    
    const uniqueEventsData = Array.from(uniqueEpisodes.values());

    const participantMap = new Map<string, Participant>();
    participantsData.forEach(p => {
        if (p.participant_id) {
            participantMap.set(p.participant_id, p);
        }
    });

    // Initialize Site Summaries (Culture)
    const siteSummaries = new Map<string, SiteSummary>();
    
    // Initialize PCR Summaries
    const pcrSummaries = new Map<string, PcrSummary>();

    // Initialize Age Summaries
    const ageSummaries = new Map<string, AgeSummary>();
    AGE_GROUPS.forEach(group => {
        ageSummaries.set(group, {
            ageGroup: group,
            totalEvents: 0,
            culturePositive: 0,
            after1stDoseEvents: 0,
            after1stDoseCulturePositive: 0,
            after2ndDoseEvents: 0,
            after2ndDoseCulturePositive: 0,
            after30Days2ndDoseEvents: 0,
            after30Days2ndDoseCulturePositive: 0
        });
    });
    
    SITES.forEach(site => {
        siteSummaries.set(site, {
            siteName: site,
            enrollment: 0,
            totalDiarrhealEvents: 0,
            after1stDoseEvents: 0,
            after1stDoseCulturePositive: 0,
            after2ndDoseEvents: 0,
            after2ndDoseCulturePositive: 0,
            after30Days2ndDoseEvents: 0,
            after30Days2ndDoseCulturePositive: 0,
        });

        pcrSummaries.set(site, {
            siteName: site,
            totalTests: 0,
            totalPositive: 0,
            after1stDoseTests: 0,
            after1stDosePositive: 0,
            after2ndDoseTests: 0,
            after2ndDosePositive: 0,
            after30DaysTests: 0,
            after30DaysPositive: 0
        });
    });

    const strainSummaries = new Map<string, StrainSummary>();
    const getStrainSummary = (name: string) => {
        if (!strainSummaries.has(name)) {
            strainSummaries.set(name, {
                strainName: name,
                total: 0,
                after1stDose: 0,
                after2ndDose: 0,
                after30Days2ndDose: 0
            });
        }
        return strainSummaries.get(name)!;
    };

    // Calculate enrollment per site
    for (const participant of participantsData) {
        if (participant.site_name && siteSummaries.has(participant.site_name)) {
            const summary = siteSummaries.get(participant.site_name)!;
            summary.enrollment++;
        }
    }

    // Process events
    for (const event of uniqueEventsData) {
        const participant = participantMap.get(event.participant_id);

        if (!participant || !participant.site_name || !siteSummaries.has(participant.site_name)) {
            continue;
        }

        const summary = siteSummaries.get(participant.site_name)!;
        const pcrSummary = pcrSummaries.get(participant.site_name)!;
        
        let ageSummary: AgeSummary | null = null;
        
        // Prioritize age from event data (as per sample file), then fallback to participant data
        const effectiveAgeMonths = event.age_months !== undefined ? event.age_months : participant.age_months;
        
        if (effectiveAgeMonths !== undefined && effectiveAgeMonths !== null) {
            const groupName = getAgeGroup(effectiveAgeMonths);
            if (groupName && ageSummaries.has(groupName)) {
                ageSummary = ageSummaries.get(groupName)!;
            }
        }

        // Culture logic
        summary.totalDiarrhealEvents++;
        const isCulturePositive = event.culture_positive.toLowerCase().startsWith('positive');
        
        if (ageSummary) {
            ageSummary.totalEvents++;
            if (isCulturePositive) ageSummary.culturePositive++;
        }

        // PCR Logic
        // Re-evaluate rank based on the consolidated episode result
        const pcrRank = getPcrRank(event.pcr_result);
        const hasPcrResult = pcrRank > 0; // Rank 1 (Negative) or 2 (Positive)
        const isPcrPositive = pcrRank === 2;
        
        if (hasPcrResult) {
            pcrSummary.totalTests++;
            if (isPcrPositive) pcrSummary.totalPositive++;
        }

        if (!participant.dose1_date) {
            continue; // Cannot categorize without at least dose 1
        }

        const eventDate = new Date(`${event.event_date}T00:00:00Z`);
        const dose1Date = new Date(`${participant.dose1_date}T00:00:00Z`);

        if (isNaN(eventDate.getTime()) || isNaN(dose1Date.getTime()) || eventDate < dose1Date) {
            continue; // Event is invalid or happened before the first dose
        }

        let dose2Date: Date | null = null;
        if (participant.dose2_date) {
            const parsedDose2Date = new Date(`${participant.dose2_date}T00:00:00Z`);
            if (!isNaN(parsedDose2Date.getTime())) {
                dose2Date = parsedDose2Date;
            }
        }
        
        let strainSummary: StrainSummary | null = null;
        if (isCulturePositive) {
            const strainName = event.shigella_strain ? event.shigella_strain : "Unspecified";
            strainSummary = getStrainSummary(strainName);
            strainSummary.total++;
        }

        if (dose2Date) { // Participant has a valid second dose date
            const dose2DatePlus30 = addDays(dose2Date, 30);
            
            if (eventDate < dose2Date) {
                // Timeframe: After 1st Dose
                summary.after1stDoseEvents++;
                if (isCulturePositive) {
                    summary.after1stDoseCulturePositive++;
                    if (strainSummary) strainSummary.after1stDose++;
                    if (ageSummary) ageSummary.after1stDoseCulturePositive++;
                }
                if (ageSummary) ageSummary.after1stDoseEvents++;

                if (hasPcrResult) {
                    pcrSummary.after1stDoseTests++;
                    if (isPcrPositive) pcrSummary.after1stDosePositive++;
                }

            } else if (eventDate < dose2DatePlus30) {
                 // Timeframe: After 2nd Dose
                summary.after2ndDoseEvents++;
                if (isCulturePositive) {
                    summary.after2ndDoseCulturePositive++;
                    if (strainSummary) strainSummary.after2ndDose++;
                    if (ageSummary) ageSummary.after2ndDoseCulturePositive++;
                }
                if (ageSummary) ageSummary.after2ndDoseEvents++;

                if (hasPcrResult) {
                    pcrSummary.after2ndDoseTests++;
                    if (isPcrPositive) pcrSummary.after2ndDosePositive++;
                }

            } else { // eventDate is >= dose2DatePlus30
                 // Timeframe: After 30 Days
                summary.after30Days2ndDoseEvents++;
                if (isCulturePositive) {
                    summary.after30Days2ndDoseCulturePositive++;
                    if (strainSummary) strainSummary.after30Days2ndDose++;
                    if (ageSummary) ageSummary.after30Days2ndDoseCulturePositive++;
                }
                if (ageSummary) ageSummary.after30Days2ndDoseEvents++;

                if (hasPcrResult) {
                    pcrSummary.after30DaysTests++;
                    if (isPcrPositive) pcrSummary.after30DaysPositive++;
                }
            }
        } else { // Participant has no valid second dose date, everything is after 1st dose
            summary.after1stDoseEvents++;
            if (isCulturePositive) {
                summary.after1stDoseCulturePositive++;
                if (strainSummary) strainSummary.after1stDose++;
                if (ageSummary) ageSummary.after1stDoseCulturePositive++;
            }
            if (ageSummary) ageSummary.after1stDoseEvents++;

            if (hasPcrResult) {
                pcrSummary.after1stDoseTests++;
                if (isPcrPositive) pcrSummary.after1stDosePositive++;
            }
        }
    }
    
    const sites = Array.from(siteSummaries.values());
    const strains = Array.from(strainSummaries.values()).sort((a, b) => b.total - a.total);
    const pcrSites = Array.from(pcrSummaries.values());
    const ageDistribution = Array.from(ageSummaries.values()); // The order is preserved as we initialized from AGE_GROUPS

    const totals: SiteSummary = {
        siteName: "Total Enrolled",
        enrollment: sites.reduce((sum, s) => sum + s.enrollment, 0),
        totalDiarrhealEvents: sites.reduce((sum, s) => sum + s.totalDiarrhealEvents, 0),
        after1stDoseEvents: sites.reduce((sum, s) => sum + s.after1stDoseEvents, 0),
        after1stDoseCulturePositive: sites.reduce((sum, s) => sum + s.after1stDoseCulturePositive, 0),
        after2ndDoseEvents: sites.reduce((sum, s) => sum + s.after2ndDoseEvents, 0),
        after2ndDoseCulturePositive: sites.reduce((sum, s) => sum + s.after2ndDoseCulturePositive, 0),
        after30Days2ndDoseEvents: sites.reduce((sum, s) => sum + s.after30Days2ndDoseEvents, 0),
        after30Days2ndDoseCulturePositive: sites.reduce((sum, s) => sum + s.after30Days2ndDoseCulturePositive, 0),
    };

    const pcrTotals: PcrSummary = {
        siteName: "Total Enrolled",
        totalTests: pcrSites.reduce((sum, s) => sum + s.totalTests, 0),
        totalPositive: pcrSites.reduce((sum, s) => sum + s.totalPositive, 0),
        after1stDoseTests: pcrSites.reduce((sum, s) => sum + s.after1stDoseTests, 0),
        after1stDosePositive: pcrSites.reduce((sum, s) => sum + s.after1stDosePositive, 0),
        after2ndDoseTests: pcrSites.reduce((sum, s) => sum + s.after2ndDoseTests, 0),
        after2ndDosePositive: pcrSites.reduce((sum, s) => sum + s.after2ndDosePositive, 0),
        after30DaysTests: pcrSites.reduce((sum, s) => sum + s.after30DaysTests, 0),
        after30DaysPositive: pcrSites.reduce((sum, s) => sum + s.after30DaysPositive, 0),
    };

    return { sites, totals, strains, pcrSites, pcrTotals, ageDistribution };
};
