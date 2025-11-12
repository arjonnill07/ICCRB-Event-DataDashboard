import type { Participant, DiarrhealEvent, SiteSummary, SummaryData } from '../types';

declare const XLSX: any;

const SITES = ["Tongi", "Mirpur", "Korail", "Mirzapur"];

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


// Robust, content-aware file parser.
const parseFile = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                if (!event.target?.result) {
                    return reject(new Error("File could not be read."));
                }

                const buffer = event.target.result as ArrayBuffer;
                
                // Check for ZIP/XLSX magic number (PK\x03\x04)
                const view = new Uint8Array(buffer, 0, 4);
                const isXlsx = view.length === 4 && view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
                
                let workbook;

                if (isXlsx) {
                    // It's a binary format like XLSX, parse from the ArrayBuffer.
                    workbook = XLSX.read(buffer, { type: 'array' });
                } else {
                    // It's not an XLSX, so treat it as a text-based format (e.g., CSV).
                    // Decode the ArrayBuffer to a string. TextDecoder is the modern standard.
                    const decoder = new TextDecoder('utf-8');
                    let textData = decoder.decode(buffer);

                    // Check for and remove the UTF-8 Byte Order Mark (BOM) if present.
                    if (textData.charCodeAt(0) === 0xFEFF) {
                        textData = textData.substring(1);
                    }
                    
                    // Parse the decoded text string.
                    workbook = XLSX.read(textData, { type: 'string' });
                }

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

        // Always read the file as an ArrayBuffer to allow for content inspection.
        reader.readAsArrayBuffer(file);
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
    
    const colMap = {
        siteName: headers.indexOf('Site Name'),
        randNum: headers.indexOf('Randomization Number'),
        visitName: headers.indexOf('Visit Name'),
        actualDate: headers.indexOf('Actual Date'),
    };

    const participantsMap = new Map<string, Partial<Participant>>();

    for (const row of dataRows) {
        const participantId = String(row[colMap.randNum] || '').trim();
        if (!participantId) continue;

        if (!participantsMap.has(participantId)) {
            participantsMap.set(participantId, {
                participant_id: participantId,
                site_name: String(row[colMap.siteName] || '').trim(),
            });
        }

        const participantRecord = participantsMap.get(participantId)!;
        const visitName = String(row[colMap.visitName] || '').trim();
        const actualDateObj = parseDate(row[colMap.actualDate]);
        
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
    
    const REQUIRED_HEADERS = ['Rand# ID', 'Collection Date', 'Result', 'Site Number & Episode'];
    let headerRowIndex = -1;
    let colMap: { [key: string]: number } = {};

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const potentialHeaders = rows[i].map(h => String(h || '').trim());
        if (REQUIRED_HEADERS.every(req => potentialHeaders.includes(req))) {
            headerRowIndex = i;
            const headers = potentialHeaders;
            colMap = {
                randId: headers.indexOf('Rand# ID'),
                collectionDate: headers.indexOf('Collection Date'),
                resultCulture: headers.indexOf('Result'),
                episodeId: headers.indexOf('Site Number & Episode'),
            };
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error("Could not find required headers in events file: 'Rand# ID', 'Collection Date', 'Result', 'Site Number & Episode'.");
    }
    
    const dataRows = rows.slice(headerRowIndex + 1);

    const result = dataRows.map(row => {
        const participantId = String(row[colMap.randId] || '').trim();
        const eventDateObj = parseDate(row[colMap.collectionDate]);
        const episodeId = String(row[colMap.episodeId] || '').trim();

        if (!participantId || !eventDateObj || !episodeId) return null;

        return {
            participant_id: participantId,
            event_date: eventDateObj.toISOString().split('T')[0],
            culture_positive: String(row[colMap.resultCulture] || ''),
            episode_id: episodeId,
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

    for (const event of eventsData) {
        if (!event.participant_id || !event.episode_id) {
            continue;
        }
        
        // Normalize episode ID by removing day-specific info to group multi-day samples
        const episodeKey = `${event.participant_id}-${event.episode_id.replace(/, Day-\d+/i, '').trim()}`;
        
        const existingEpisode = uniqueEpisodes.get(episodeKey);
        const isCurrentSamplePositive = String(event.culture_positive).trim().toLowerCase().startsWith('positive');

        if (!existingEpisode) {
            // This is the first sample we've seen for this episode.
            uniqueEpisodes.set(episodeKey, {
                ...event,
                culture_positive: isCurrentSamplePositive ? "Positive" : "Negative" 
            });
        } else {
            // We've already seen a sample for this episode. Update if necessary.
            
            // If the current sample is positive, the entire episode is now considered positive.
            if (isCurrentSamplePositive) {
                existingEpisode.culture_positive = "Positive";
            }
            
            // The episode date should be the earliest sample collection date.
            if (new Date(event.event_date) < new Date(existingEpisode.event_date)) {
                existingEpisode.event_date = event.event_date;
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

    const siteSummaries = new Map<string, SiteSummary>();
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
    });

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

        // --- FIX: Increment total events before checking for dose dates ---
        summary.totalDiarrhealEvents++;
        const isCulturePositive = event.culture_positive.toLowerCase().startsWith('positive');

        // --- Now, categorize the event only if dose dates are available ---
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

        if (dose2Date) { // Participant has a valid second dose date
            const dose2DatePlus30 = addDays(dose2Date, 30);
            
            if (eventDate < dose2Date) {
                summary.after1stDoseEvents++;
                if (isCulturePositive) summary.after1stDoseCulturePositive++;
            } else if (eventDate < dose2DatePlus30) {
                summary.after2ndDoseEvents++;
                if (isCulturePositive) summary.after2ndDoseCulturePositive++;
            } else { // eventDate is >= dose2DatePlus30
                summary.after30Days2ndDoseEvents++;
                if (isCulturePositive) summary.after30Days2ndDoseCulturePositive++;
            }
        } else { // Participant has no valid second dose date
            summary.after1stDoseEvents++;
            if (isCulturePositive) summary.after1stDoseCulturePositive++;
        }
    }
    
    const sites = Array.from(siteSummaries.values());

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

    return { sites, totals };
};