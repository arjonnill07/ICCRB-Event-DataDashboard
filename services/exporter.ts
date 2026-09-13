
import type { SummaryData, DetailedParticipantEvent, StrainSummary } from '../types';
import { formatPercent } from '../utils/formatter';

declare const XLSX: any;

declare global {
    interface Window {
        jspdf: any;
    }
}

const getTableData = (data: SummaryData): (string | number)[][] => {
    const allRows = [...data.sites, data.totals];
    return allRows.map(item => [
        item.siteName,
        item.enrollment,
        `${item.totalDiarrhealEvents} (${formatPercent(item.totalDiarrhealEvents, item.enrollment)})`,
        `${item.totalCulturePositive} (${formatPercent(item.totalCulturePositive, item.reportedEventsCount)})`,
        item.after1stDoseEvents,
        `${item.after1stDoseCulturePositive} (${formatPercent(item.after1stDoseCulturePositive, item.after1stDoseEvents)})`,
        item.after2ndDoseEvents,
        `${item.after2ndDoseCulturePositive} (${formatPercent(item.after2ndDoseCulturePositive, item.after2ndDoseEvents)})`,
        item.after30Days2ndDoseEvents,
        `${item.after30Days2ndDoseCulturePositive} (${formatPercent(item.after30Days2ndDoseCulturePositive, item.after30Days2ndDoseEvents)})`,
    ]);
};

type FilteredCultureTotals = {
    siteAdjusted: Map<string, { culturePositive: number; after1: number; after2: number; after30: number }>;
    ageAdjusted: Map<string, { culturePositive: number; after1: number; after2: number; after30: number }>;
    strainAdjusted: StrainSummary[]; // row list (without removed strains, includes recalculated Total row in UI builders)
};

const computeFilteredCultureTotals = (data: SummaryData, excludedStrains: string[] | undefined): FilteredCultureTotals => {
    const allStrains = data.strains.map(s => s.strainName);
    const excluded = new Set(excludedStrains && excludedStrains.length ? excludedStrains : []);
    const included = allStrains.filter(s => !excluded.has(s));

    const siteAdjusted = new Map<string, { after1: number; after2: number; after30: number }>();
    for (const site of data.siteStrainDistribution) {
        let culturePositive = 0;
        let after1 = 0;
        let after2 = 0;
        let after30 = 0;

        for (const st of site.strains) {
            if (!included.includes(st.strainName)) continue;
            culturePositive += st.total;
            after1 += st.after1stDose;
            after2 += st.after2ndDose;
            after30 += st.after30Days2ndDose;
        }
        siteAdjusted.set(site.siteName, { culturePositive, after1, after2, after30 });
    }

    const ageAdjusted = new Map<string, { culturePositive: number; after1: number; after2: number; after30: number }>();
    for (const age of data.ageStrainDistribution) {
        let after1 = 0;
        let after2 = 0;
        let after30 = 0;

        for (const st of age.strains) {
            if (!included.includes(st.strainName)) continue;
            after1 += st.after1stDose;
            after2 += st.after2ndDose;
            after30 += st.after30Days2ndDose;
        }

        const culturePositive = after1 + after2 + after30;
        ageAdjusted.set(age.ageGroup, { culturePositive, after1, after2, after30 });
    }

    const strainAdjusted = data.strains.filter(s => included.includes(s.strainName));

    return { siteAdjusted, ageAdjusted, strainAdjusted };
};

const getAgeTableData = (data: SummaryData): (string | number)[][] => {
    const ageTotals = data.ageTotals ?? {
        ageGroup: 'Total',
        totalEvents: data.ageDistribution.reduce((s, x) => s + x.totalEvents, 0),
        culturePositive: data.ageDistribution.reduce((s, x) => s + x.culturePositive, 0),
        after1stDoseEvents: data.ageDistribution.reduce((s, x) => s + x.after1stDoseEvents, 0),
        after1stDoseCulturePositive: data.ageDistribution.reduce((s, x) => s + x.after1stDoseCulturePositive, 0),
        after2ndDoseEvents: data.ageDistribution.reduce((s, x) => s + x.after2ndDoseEvents, 0),
        after2ndDoseCulturePositive: data.ageDistribution.reduce((s, x) => s + x.after2ndDoseCulturePositive, 0),
        after30Days2ndDoseEvents: data.ageDistribution.reduce((s, x) => s + x.after30Days2ndDoseEvents, 0),
        after30Days2ndDoseCulturePositive: data.ageDistribution.reduce((s, x) => s + x.after30Days2ndDoseCulturePositive, 0),
    };
    const allRows = [...data.ageDistribution, ageTotals];
    return allRows.map(item => [
        item.ageGroup,
        item.totalEvents,
        `${item.culturePositive} (${formatPercent(item.culturePositive, item.totalEvents)})`,
        item.after1stDoseEvents,
        `${item.after1stDoseCulturePositive} (${formatPercent(item.after1stDoseCulturePositive, item.after1stDoseEvents)})`,
        item.after2ndDoseEvents,
        `${item.after2ndDoseCulturePositive} (${formatPercent(item.after2ndDoseCulturePositive, item.after2ndDoseEvents)})`,
        item.after30Days2ndDoseEvents,
        `${item.after30Days2ndDoseCulturePositive} (${formatPercent(item.after30Days2ndDoseCulturePositive, item.after30Days2ndDoseEvents)})`,
    ]);
};

const getFilteredTableData = (data: SummaryData, selectedStrains: string[] | undefined): (string | number)[][] => {
    const filtered = computeFilteredCultureTotals(data, selectedStrains);

    const totalCulturePositive = Array.from(filtered.siteAdjusted.values()).reduce((s, x) => s + x.culturePositive, 0);
    const totalAfter1 = Array.from(filtered.siteAdjusted.values()).reduce((s, x) => s + x.after1, 0);
    const totalAfter2 = Array.from(filtered.siteAdjusted.values()).reduce((s, x) => s + x.after2, 0);
    const totalAfter30 = Array.from(filtered.siteAdjusted.values()).reduce((s, x) => s + x.after30, 0);

    const allRows = [...data.sites, data.totals];
    return allRows.map(item => {
        const adjusted =
            item.siteName === data.totals.siteName
                ? { culturePositive: totalCulturePositive, after1: totalAfter1, after2: totalAfter2, after30: totalAfter30 }
                : (filtered.siteAdjusted.get(item.siteName) ?? { culturePositive: 0, after1: 0, after2: 0, after30: 0 });

        // IMPORTANT: diarrheal episode counts remain exactly unchanged.
        // Only Culture Positive counts change.
        return [
            item.siteName,
            item.enrollment,
            `${item.totalDiarrhealEvents} (${formatPercent(item.totalDiarrhealEvents, item.enrollment)})`,
            `${adjusted.culturePositive} (${formatPercent(adjusted.culturePositive, item.reportedEventsCount)})`,
            item.after1stDoseEvents,
            `${adjusted.after1} (${formatPercent(adjusted.after1, item.after1stDoseEvents)})`,
            item.after2ndDoseEvents,
            `${adjusted.after2} (${formatPercent(adjusted.after2, item.after2ndDoseEvents)})`,
            item.after30Days2ndDoseEvents,
            `${adjusted.after30} (${formatPercent(adjusted.after30, item.after30Days2ndDoseEvents)})`,
        ];
    });
};

const getFilteredAgeTableData = (data: SummaryData, selectedStrains: string[] | undefined): (string | number)[][] => {
    const filtered = computeFilteredCultureTotals(data, selectedStrains);

    const totalCulturePos = Array.from(filtered.ageAdjusted.values()).reduce((s, x) => s + x.culturePositive, 0);
    const totalAfter1 = Array.from(filtered.ageAdjusted.values()).reduce((s, x) => s + x.after1, 0);
    const totalAfter2 = Array.from(filtered.ageAdjusted.values()).reduce((s, x) => s + x.after2, 0);
    const totalAfter30 = Array.from(filtered.ageAdjusted.values()).reduce((s, x) => s + x.after30, 0);

    const ageTotals = data.ageTotals ?? {
        ageGroup: 'Total',
        totalEvents: data.ageDistribution.reduce((s, x) => s + x.totalEvents, 0),
        culturePositive: data.ageDistribution.reduce((s, x) => s + x.culturePositive, 0),
        after1stDoseEvents: data.ageDistribution.reduce((s, x) => s + x.after1stDoseEvents, 0),
        after1stDoseCulturePositive: data.ageDistribution.reduce((s, x) => s + x.after1stDoseCulturePositive, 0),
        after2ndDoseEvents: data.ageDistribution.reduce((s, x) => s + x.after2ndDoseEvents, 0),
        after2ndDoseCulturePositive: data.ageDistribution.reduce((s, x) => s + x.after2ndDoseCulturePositive, 0),
        after30Days2ndDoseEvents: data.ageDistribution.reduce((s, x) => s + x.after30Days2ndDoseEvents, 0),
        after30Days2ndDoseCulturePositive: data.ageDistribution.reduce((s, x) => s + x.after30Days2ndDoseCulturePositive, 0),
    };

    const allRows = [...data.ageDistribution, ageTotals];
    return allRows.map(item => {
        const adjusted =
            item.ageGroup === ageTotals.ageGroup
                ? { culturePositive: totalCulturePos, after1: totalAfter1, after2: totalAfter2, after30: totalAfter30 }
                : (filtered.ageAdjusted.get(item.ageGroup) ?? { culturePositive: 0, after1: 0, after2: 0, after30: 0 });

        return [
            item.ageGroup,
            item.totalEvents,
            `${adjusted.culturePositive} (${formatPercent(adjusted.culturePositive, item.totalEvents)})`,
            item.after1stDoseEvents,
            `${adjusted.after1} (${formatPercent(adjusted.after1, item.after1stDoseEvents)})`,
            item.after2ndDoseEvents,
            `${adjusted.after2} (${formatPercent(adjusted.after2, item.after2ndDoseEvents)})`,
            item.after30Days2ndDoseEvents,
            `${adjusted.after30} (${formatPercent(adjusted.after30, item.after30Days2ndDoseEvents)})`,
        ];
    });
};

const getPcrTableData = (data: SummaryData): (string | number)[][] => {
    const allRows = [...data.pcrSites, data.pcrTotals];
    return allRows.map(item => [
        item.siteName,
        item.totalTests,
        `${item.totalPositive} (${formatPercent(item.totalPositive, item.totalTests)})`,
        item.after1stDoseTests,
        `${item.after1stDosePositive} (${formatPercent(item.after1stDosePositive, item.after1stDoseTests)})`,
        item.after2ndDoseTests,
        `${item.after2ndDosePositive} (${formatPercent(item.after2ndDosePositive, item.after2ndDoseTests)})`,
        item.after30DaysTests,
        `${item.after30DaysPositive} (${formatPercent(item.after30DaysPositive, item.after30DaysTests)})`,
    ]);
};

const getPcrAgeTableData = (data: SummaryData): (string | number)[][] => {
    const pcrAgeTotals = data.pcrAgeTotals ?? {
        ageGroup: 'Total',
        totalTests: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.totalTests, 0),
        totalPositive: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.totalPositive, 0),
        after1stDoseTests: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.after1stDoseTests, 0),
        after1stDosePositive: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.after1stDosePositive, 0),
        after2ndDoseTests: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.after2ndDoseTests, 0),
        after2ndDosePositive: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.after2ndDosePositive, 0),
        after30DaysTests: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.after30DaysTests, 0),
        after30DaysPositive: (data.pcrAgeDistribution || []).reduce((s, x) => s + x.after30DaysPositive, 0),
    };
    const allRows = [...(data.pcrAgeDistribution || []), pcrAgeTotals];
    return allRows.map(item => [
        item.ageGroup,
        item.totalTests,
        `${item.totalPositive} (${formatPercent(item.totalPositive, item.totalTests)})`,
        item.after1stDoseTests,
        `${item.after1stDosePositive} (${formatPercent(item.after1stDosePositive, item.after1stDoseTests)})`,
        item.after2ndDoseTests,
        `${item.after2ndDosePositive} (${formatPercent(item.after2ndDosePositive, item.after2ndDoseTests)})`,
        item.after30DaysTests,
        `${item.after30DaysPositive} (${formatPercent(item.after30DaysPositive, item.after30DaysTests)})`,
    ]);
};

const getStrainTableData = (data: SummaryData, selectedStrains?: string[]): (string | number)[][] => {
    const filteredStrains = selectedStrains
        ? data.strains.filter(item => selectedStrains.includes(item.strainName))
        : data.strains;

    const totals = filteredStrains.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        after1: acc.after1 + curr.after1stDose,
        after2: acc.after2 + curr.after2ndDose,
        after30: acc.after30 + curr.after30Days2ndDose
    }), { total: 0, after1: 0, after2: 0, after30: 0 });

    const rows = filteredStrains.map(item => [
        item.strainName,
        `${item.total} (${formatPercent(item.total, totals.total)})`,
        `${item.after1stDose} (${formatPercent(item.after1stDose, totals.after1)})`,
        `${item.after2ndDose} (${formatPercent(item.after2ndDose, totals.after2)})`,
        `${item.after30Days2ndDose} (${formatPercent(item.after30Days2ndDose, totals.after30)})`
    ]);

    rows.push([
        'Total',
        `${totals.total} (${formatPercent(totals.total, totals.total)})`,
        `${totals.after1} (${formatPercent(totals.after1, totals.after1)})`,
        `${totals.after2} (${formatPercent(totals.after2, totals.after2)})`,
        `${totals.after30} (${formatPercent(totals.after30, totals.after30)})`
    ]);

    return rows;
};

export const exportDetailedToXLSX = (data: SummaryData, siteFilter: string = "All Sites") => {
    const headers = [
        "Clinical Site",
        "Randomization ID",
        "Collection Date",
        "Clinical Stage (Dose Category)",
        "Culture Result",
        "Shigella Strain/Serotype",
        "RT-PCR Result",
        "Age (Months)",
        "Participant Total Distinct Episodes", // New Header
        "Stools Collected (per Episode)",        // New Header
        "Rectal Swabs Collected (per Episode)"   // New Header
    ];

    let eventsToExport = data.detailedEvents;
    if (siteFilter !== "All Sites") {
        eventsToExport = eventsToExport.filter(e => e.site === siteFilter);
    }

    const body = eventsToExport.map(e => [
        e.site,
        e.participantId,
        e.collectionDate,
        e.doseCategory,
        e.cultureResult,
        e.shigellaStrain,
        e.pcrResult,
        e.ageMonths,
        e.participantTotalEvents,
        e.stoolsCollected,
        e.rectalSwabsCollected
    ]);

    const finalData = [headers, ...body];
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detailed Event Log");
    
    const fileName = siteFilter === "All Sites" 
        ? "Detailed_Site_Wise_Diarrheal_Events_PR-24079.xlsx"
        : `Detailed_Events_${siteFilter}_PR-24079.xlsx`;
        
    XLSX.writeFile(wb, fileName);
};

export const exportToXLSX = (data: SummaryData, generatedAt: Date) => {
    const reportDateInfo = [`Report Generated: ${generatedAt.toLocaleString()}`];
    const header1 = ["Site Name", "Enrollment", "Number of Diarrhoeal Events", "Culture Positive", "After 1st dose", null, "After 2nd dose", null, "After 30 days of the 2nd dose", null];
    const header2 = [null, null, null, null, "Diarrheal events", "Culture positive", "Diarrheal events", "Culture positive", "Diarrheal events", "Culture positive"];
    const siteTableData = getTableData(data);
    
    const ageTitle = ["Age wise diarrheal events (Culture)"];
    const ageHeader1 = ["Age Distribution (Culture)", "Total Events", "Culture Positive", "After 1st dose", null, "After 2nd dose", null, "After 30 days of the 2nd dose", null];
    const ageTableData = getAgeTableData(data);
    
    const pcrTitle = ["RT-PCR Diagnostic Statistics by Site"];
    const pcrHeader1 = ["Site Name", "Total Tests", "Total Positive", "After 1st dose", null, "After 2nd dose", null, "After 30 days of the 2nd dose", null];
    const pcrHeader2 = [null, null, null, "Tested", "Positive", "Tested", "Positive", "Tested", "Positive"];
    const pcrTableData = getPcrTableData(data);

    const pcrAgeTitle = ["Age wise RT-PCR Diagnostic Statistics"];
    const pcrAgeHeader1 = ["Age Distribution (RT-PCR)", "Total Tests", "Total Positive", "After 1st dose", null, "After 2nd dose", null, "After 30 days of the 2nd dose", null];
    const pcrAgeHeader2 = [null, null, null, "Tested", "Positive", "Tested", "Positive", "Tested", "Positive"];
    const pcrAgeTableData = getPcrAgeTableData(data);

    const strainTitle = ["Serotype/Serogroup Distribution of Culture Positive Cases"];
    const strainHeader = ["Serotype/Serogroup", "Total Positive Cases", "After 1st dose", "After 2nd dose", "After 30 days of the 2nd dose"];
    const strainTableData = getStrainTableData(data);

    const finalData = [
        reportDateInfo,
        [], 
        header1, header2, ...siteTableData,
        [], [],
        ageTitle, ageHeader1, header2, ...ageTableData,
        [], [],
        pcrTitle, pcrHeader1, pcrHeader2, ...pcrTableData,
        [], [],
        pcrAgeTitle, pcrAgeHeader1, pcrAgeHeader2, ...pcrAgeTableData,
        [], [],
        strainTitle, strainHeader, ...strainTableData
    ];

    const ws = XLSX.utils.aoa_to_sheet(finalData);
    const ageStartRow = 4 + siteTableData.length + 2;
    const pcrStartRow = ageStartRow + 3 + ageTableData.length + 2;
    const pcrAgeStartRow = pcrStartRow + 3 + pcrTableData.length + 2;
    const strainStartRow = pcrAgeStartRow + 3 + pcrAgeTableData.length + 2; 

    const merges = [
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
        { s: { r: 2, c: 4 }, e: { r: 2, c: 5 } }, { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } }, { s: { r: 2, c: 8 }, e: { r: 2, c: 9 } },
        
        { s: { r: ageStartRow, c: 0 }, e: { r: ageStartRow, c: 4 } },
        { s: { r: ageStartRow + 1, c: 0 }, e: { r: ageStartRow + 2, c: 0 } },
        { s: { r: ageStartRow + 1, c: 1 }, e: { r: ageStartRow + 2, c: 1 } },
        { s: { r: ageStartRow + 1, c: 2 }, e: { r: ageStartRow + 2, c: 2 } },
        { s: { r: ageStartRow + 1, c: 3 }, e: { r: ageStartRow + 1, c: 4 } },
        { s: { r: ageStartRow + 1, c: 5 }, e: { r: ageStartRow + 1, c: 6 } },
        { s: { r: ageStartRow + 1, c: 7 }, e: { r: ageStartRow + 1, c: 8 } },

        { s: { r: pcrStartRow, c: 0 }, e: { r: pcrStartRow, c: 4 } },
        { s: { r: pcrStartRow + 1, c: 0 }, e: { r: pcrStartRow + 2, c: 0 } },
        { s: { r: pcrStartRow + 1, c: 1 }, e: { r: pcrStartRow + 2, c: 1 } },
        { s: { r: pcrStartRow + 1, c: 2 }, e: { r: pcrStartRow + 2, c: 2 } },
        { s: { r: pcrStartRow + 1, c: 3 }, e: { r: pcrStartRow + 1, c: 4 } },
        { s: { r: pcrStartRow + 1, c: 5 }, e: { r: pcrStartRow + 1, c: 6 } },
        { s: { r: pcrStartRow + 1, c: 7 }, e: { r: pcrStartRow + 1, c: 8 } },

        { s: { r: pcrAgeStartRow, c: 0 }, e: { r: pcrAgeStartRow, c: 4 } },
        { s: { r: pcrAgeStartRow + 1, c: 0 }, e: { r: pcrAgeStartRow + 2, c: 0 } },
        { s: { r: pcrAgeStartRow + 1, c: 1 }, e: { r: pcrAgeStartRow + 2, c: 1 } },
        { s: { r: pcrAgeStartRow + 1, c: 2 }, e: { r: pcrAgeStartRow + 2, c: 2 } },
        { s: { r: pcrAgeStartRow + 1, c: 3 }, e: { r: pcrAgeStartRow + 1, c: 4 } },
        { s: { r: pcrAgeStartRow + 1, c: 5 }, e: { r: pcrAgeStartRow + 1, c: 6 } },
        { s: { r: pcrAgeStartRow + 1, c: 7 }, e: { r: pcrAgeStartRow + 1, c: 8 } },

        { s: { r: strainStartRow, c: 0 }, e: { r: strainStartRow, c: 4 } }
    ];
    ws['!merges'] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Report");
    XLSX.writeFile(wb, "Summary_Report_Conjugate_vaccine_PR-24079_icddrb.xlsx");
};

export interface PDFExportOptions {
    includeSummary?: boolean;
    includeAge?: boolean;
    includePcr?: boolean;
    includePcrAge?: boolean;
    includeStrain?: boolean;
    selectedStrains?: string[];
}

export const exportToPDF = (data: SummaryData, generatedAt: Date, options: PDFExportOptions = {}) => {
    const {
        includeSummary = true,
        includeAge = true,
        includePcr = true,
        includePcrAge = true,
        includeStrain = true,
        selectedStrains = undefined
    } = options;

    try {
        if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF constructor not found.");
        const doc = new window.jspdf.jsPDF('l', 'pt');
        if (typeof (doc as any).autoTable !== 'function') throw new Error("jsPDF-AutoTable plugin not loaded.");
        const titleLine1 = "Summary Report: Conjugate vaccine (PR-24079)";
        const titleLine2 = "icddr,b, Mohakhali, Dhaka, Bangladesh";

        const allStrains = data.strains.map(item => item.strainName);
        // UI checkboxes represent strains/serogroups to EXCLUDE.
        const excluded = selectedStrains && selectedStrains.length ? selectedStrains : [];
        const included = excluded.length ? allStrains.filter(s => !excluded.includes(s)) : allStrains;

        const exclusionTitle = excluded.length ? `Excluding: ${excluded.join(', ')}` : "";

        doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(titleLine1, 40, 40);
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(titleLine2, 40, 58);
        if (exclusionTitle) {
            doc.setFontSize(10);
            doc.setTextColor(120);
            doc.text(exclusionTitle, 40, 70);
        }
        doc.setFontSize(9); doc.setTextColor(100); doc.text(`Generated on: ${generatedAt.toLocaleString()}`, 40, exclusionTitle ? 83 : 75);

        const tableStyles = { cellPadding: 4, fontSize: 8, overflow: 'linebreak', cellWidth: 'wrap' };
        const commonHeadStyles = { fillColor: [243, 244, 246], textColor: [33, 37, 41], fontStyle: 'bold', halign: 'center', valign: 'middle' };

        const strainBody = getStrainTableData(data, included);

        // Culture-positive tables already use computeFilteredCultureTotals(..) (excluding excluded strains).
        const filteredSiteTable = getFilteredTableData(data, excluded.length ? excluded : undefined);
        const filteredAgeTable = getFilteredAgeTableData(data, excluded.length ? excluded : undefined);

        if (!includeSummary && !includeAge && !includePcr && !includePcrAge && !includeStrain) {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("No PDF sections have been selected for export.", 40, 100);
            doc.save('Summary_Report_Conjugate_vaccine_PR-24079_icddrb.pdf');
            return;
        }

        let currentY = exclusionTitle ? 95 : 90;

        const checkPageBreak = (requiredHeight: number): void => {
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            const bottomMargin = 40;
            if (currentY + requiredHeight > pageHeight - bottomMargin) {
                doc.addPage();
                currentY = 40;
            }
        };

        if (includeSummary) {
            const head = [[{ content: 'Site Name', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Enrollment', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Number of Diarrhoeal Events', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Culture Positive', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }], ['Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive']];
            const body = excluded.length ? filteredSiteTable : getTableData(data);
            const estHeight = 40 + body.length * 20;
            checkPageBreak(estHeight);

            (doc as any).autoTable({
                head,
                body,
                startY: currentY,
                theme: 'grid',
                margin: { left: 40, right: 40 },
                headStyles: commonHeadStyles,
                styles: tableStyles,
                alternateRowStyles: { fillColor: [250, 250, 250] },
                pageBreak: 'avoid',
                didParseCell: function(hookData: any) {
                    if (hookData.section === 'body' && hookData.row.index === body.length - 1) {
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.fillColor = [229, 231, 235];
                    }
                }
            });
            currentY = ((doc as any).lastAutoTable?.finalY || currentY + 120) + 25;
        }

        if (includeAge) {
            const ageHead = [[{ content: 'Age Distribution (Culture)', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Events', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Culture Positive', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }], ['Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive']];
            const ageBody = excluded.length ? filteredAgeTable : getAgeTableData(data);
            const estHeight = 30 + 40 + ageBody.length * 20;
            checkPageBreak(estHeight);

            doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("Age wise diarrheal events (Culture)", 40, currentY);

            (doc as any).autoTable({
                head: ageHead,
                body: ageBody,
                startY: currentY + 15,
                theme: 'grid',
                margin: { left: 40, right: 40 },
                headStyles: commonHeadStyles,
                styles: tableStyles,
                alternateRowStyles: { fillColor: [250, 250, 250] },
                pageBreak: 'avoid',
                didParseCell: function(hookData: any) {
                    if (hookData.section === 'body' && hookData.row.index === ageBody.length - 1) {
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.fillColor = [229, 231, 235];
                    }
                }
            });
            currentY = ((doc as any).lastAutoTable?.finalY || currentY + 140) + 25;
        }

        if (includePcr) {
            const pcrHead = [[{ content: 'Site Name', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Tests', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Positive', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }], ['Tested', 'Positive', 'Tested', 'Positive', 'Tested', 'Positive']];
            const pcrBody = getPcrTableData(data);
            const estHeight = 30 + 40 + pcrBody.length * 20;
            checkPageBreak(estHeight);

            doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("RT-PCR Diagnostic Statistics by Site", 40, currentY);

            (doc as any).autoTable({
                head: pcrHead,
                body: pcrBody,
                startY: currentY + 15,
                theme: 'grid',
                margin: { left: 40, right: 40 },
                headStyles: commonHeadStyles,
                styles: tableStyles,
                alternateRowStyles: { fillColor: [250, 250, 250] },
                pageBreak: 'avoid',
                didParseCell: function(hookData: any) {
                    if (hookData.section === 'body' && hookData.row.index === pcrBody.length - 1) {
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.fillColor = [229, 231, 235];
                    }
                }
            });
            currentY = ((doc as any).lastAutoTable?.finalY || currentY + 140) + 25;
        }

        if (includePcrAge) {
            const pcrAgeHead = [[{ content: 'Age Distribution (RT-PCR)', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Tests', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Positive', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }], ['Tested', 'Positive', 'Tested', 'Positive', 'Tested', 'Positive']];
            const pcrAgeBody = getPcrAgeTableData(data);
            const estHeight = 30 + 40 + pcrAgeBody.length * 20;
            checkPageBreak(estHeight);

            doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("Age wise RT-PCR Diagnostic Statistics", 40, currentY);

            (doc as any).autoTable({
                head: pcrAgeHead,
                body: pcrAgeBody,
                startY: currentY + 15,
                theme: 'grid',
                margin: { left: 40, right: 40 },
                headStyles: commonHeadStyles,
                styles: tableStyles,
                alternateRowStyles: { fillColor: [250, 250, 250] },
                pageBreak: 'avoid',
                didParseCell: function(hookData: any) {
                    if (hookData.section === 'body' && hookData.row.index === pcrAgeBody.length - 1) {
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.fillColor = [229, 231, 235];
                    }
                }
            });
            currentY = ((doc as any).lastAutoTable?.finalY || currentY + 140) + 25;
        }

        if (includeStrain) {
            const allStrains = data.strains.map(item => item.strainName);
            const excluded = selectedStrains && selectedStrains.length ? selectedStrains : [];
            const exclusionNoteHeight = excluded.length > 0 ? 20 : 0;
            const estHeight = 30 + exclusionNoteHeight + 25 + strainBody.length * 20;
            checkPageBreak(estHeight);

            doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("Serotype/Serogroup Distribution of Culture Positive Cases", 40, currentY);
            currentY += 18;

            if (excluded.length > 0) {
                doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal");
                const excludedNames = excluded.join(', ');
                const exclusionText = excluded.length === allStrains.length
                    ? "Note: No serotypes have been selected; the table only displays the total summary row."
                    : `Note: ${excluded.length} serotype${excluded.length > 1 ? 's' : ''} excluded: ${excludedNames}.`;
                doc.text(exclusionText, 40, currentY);
                currentY += 15;
            }

            const strainHead = [["Serotype/Serogroup", "Total Positive Cases", "After 1st dose", "After 2nd dose", "After 30 days of the 2nd dose"]];
            (doc as any).autoTable({
                head: strainHead,
                body: strainBody,
                startY: currentY,
                theme: 'grid',
                margin: { left: 40, right: 40 },
                headStyles: commonHeadStyles,
                styles: { ...tableStyles, halign: 'center' },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                pageBreak: 'avoid',
                didParseCell: function(hookData: any) {
                    if (hookData.section === 'body' && hookData.row.index === strainBody.length - 1) {
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.fillColor = [229, 231, 235];
                    }
                }
            });
        }

        doc.save('Summary_Report_Conjugate_vaccine_PR-24079_icddrb.pdf');
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert(`Could not generate PDF. Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
};
