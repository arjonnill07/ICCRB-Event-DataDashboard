
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
        let date = new Date(dateInput.includes('T') || dateInput.includes('Z') ? dateInput : `${dateInput}T00:00:00Z`);

        if (isNaN(date.getTime())) {
            const partsDMY = dateInput.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
            if (partsDMY) {
                date = new Date(Date.UTC(parseInt(partsDMY[3], 10), parseInt(partsDMY[2], 10) - 1, parseInt(partsDMY[1], 10)));
            }
        }
        
        if (!isNaN(date.getTime())) {
            return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        }
    }
    
    return null;
};

const parseParticipantsFile = (file: File): Promise<Participant[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (!event.target?.result) {
                    return reject(new Error("File could not be read."));
                }
                const data = event.target.result as ArrayBuffer;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                
                if (rows.length < 2) {
                    return reject(new Error("Participant file has an invalid format or is too short."));
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
                    return reject(new Error("Could not find the header row in the participant file. Make sure the file contains a row with the columns: 'Site Name', 'Randomization Number', 'Visit Name', 'Actual Date'."));
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
                
                resolve(result);

            } catch (e) { 
                reject(e instanceof Error ? e : new Error('Failed to parse participant file.'));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const parseEventsFile = (file: File): Promise<DiarrhealEvent[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (!event.target?.result) {
                    return reject(new Error("File could not be read."));
                }
                const data = event.target.result as ArrayBuffer;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                if (rows.length < 2) {
                    return reject(new Error("Events file has an invalid format or is too short."));
                }
                
                const REQUIRED_HEADERS = ['Rand# ID', 'Collection Date', 'Result (Culture)'];
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
                            resultCulture: headers.indexOf('Result (Culture)'),
                        };
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    return reject(new Error("Could not find required headers in events file: 'Rand# ID', 'Collection Date', 'Result (Culture)'."));
                }
                
                const dataRows = rows.slice(headerRowIndex + 1);

                const result = dataRows.map(row => {
                    const participantId = String(row[colMap.randId] || '').trim();
                    const eventDateObj = parseDate(row[colMap.collectionDate]);

                    if (!participantId || !eventDateObj) return null;

                    return {
                        participant_id: participantId,
                        event_date: eventDateObj.toISOString().split('T')[0],
                        culture_positive: String(row[colMap.resultCulture] || ''),
                    }
                }).filter(Boolean) as DiarrhealEvent[];
                resolve(result);
            } catch (e) { 
                reject(e instanceof Error ? e : new Error('Failed to parse events file.'));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
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

    for (const participant of participantsData) {
        if (participant.site_name && siteSummaries.has(participant.site_name)) {
            const summary = siteSummaries.get(participant.site_name)!;
            summary.enrollment++;
        }
    }

    for (const event of eventsData) {
        const participant = participantMap.get(event.participant_id);

        if (!participant || !participant.site_name || !siteSummaries.has(participant.site_name) || !participant.dose1_date) {
            continue;
        }
        
        const eventDate = new Date(`${event.event_date}T00:00:00Z`);
        const dose1Date = new Date(`${participant.dose1_date}T00:00:00Z`);

        if (isNaN(eventDate.getTime()) || isNaN(dose1Date.getTime()) || eventDate < dose1Date) {
            continue;
        }

        const summary = siteSummaries.get(participant.site_name)!;
        summary.totalDiarrhealEvents++;

        const isCulturePositive = String(event.culture_positive).toLowerCase().trim().startsWith('positive');

        if (participant.dose2_date) {
            const dose2Date = new Date(`${participant.dose2_date}T00:00:00Z`);
            if (isNaN(dose2Date.getTime())) {
                summary.after1stDoseEvents++;
                if (isCulturePositive) summary.after1stDoseCulturePositive++;
            } else {
                const dose2DatePlus30 = addDays(dose2Date, 30);
                
                if (eventDate >= dose1Date && eventDate < dose2Date) {
                    summary.after1stDoseEvents++;
                    if (isCulturePositive) summary.after1stDoseCulturePositive++;
                } else if (eventDate >= dose2Date && eventDate < dose2DatePlus30) {
                    summary.after2ndDoseEvents++;
                    if (isCulturePositive) summary.after2ndDoseCulturePositive++;
                } else if (eventDate >= dose2DatePlus30) {
                    summary.after30Days2ndDoseEvents++;
                    if (isCulturePositive) summary.after30Days2ndDoseCulturePositive++;
                }
            }
        } else {
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
