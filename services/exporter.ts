
import type { SummaryData, DetailedParticipantEvent } from '../types';
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
        item.after1stDoseEvents,
        `${item.after1stDoseCulturePositive} (${formatPercent(item.after1stDoseCulturePositive, item.after1stDoseEvents)})`,
        item.after2ndDoseEvents,
        `${item.after2ndDoseCulturePositive} (${formatPercent(item.after2ndDoseCulturePositive, item.after2ndDoseEvents)})`,
        item.after30Days2ndDoseEvents,
        `${item.after30Days2ndDoseCulturePositive} (${formatPercent(item.after30Days2ndDoseCulturePositive, item.after30Days2ndDoseEvents)})`,
    ]);
};

const getAgeTableData = (data: SummaryData): (string | number)[][] => {
    return data.ageDistribution.map(item => [
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

const getStrainTableData = (data: SummaryData): (string | number)[][] => {
    const totals = data.strains.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        after1: acc.after1 + curr.after1stDose,
        after2: acc.after2 + curr.after2ndDose,
        after30: acc.after30 + curr.after30Days2ndDose
    }), { total: 0, after1: 0, after2: 0, after30: 0 });

    return data.strains.map(item => [
        item.strainName,
        `${item.total} (${formatPercent(item.total, totals.total)})`,
        `${item.after1stDose} (${formatPercent(item.after1stDose, totals.after1)})`,
        `${item.after2ndDose} (${formatPercent(item.after2ndDose, totals.after2)})`,
        `${item.after30Days2ndDose} (${formatPercent(item.after30Days2ndDose, totals.after30)})`
    ]);
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
    const header1 = ["Site Name", "Enrollment", "Number of Diarrhoeal Events", "After 1st dose", null, "After 2nd dose", null, "After 30 days of the 2nd dose", null];
    const header2 = [null, null, null, "Diarrheal events", "Culture positive", "Diarrheal events", "Culture positive", "Diarrheal events", "Culture positive"];
    const siteTableData = getTableData(data);
    const ageTitle = ["Age wise diarrheal events"];
    const ageHeader1 = ["Age Distribution", "Total Events", "Culture Positive", "After 1st dose", null, "After 2nd dose", null, "After 30 days of the 2nd dose", null];
    const ageTableData = getAgeTableData(data);
    const pcrTitle = ["RT-PCR Result"];
    const pcrHeader1 = ["Site Name", "Total Tests", "Total Positive", "After 1st dose", null, "After 2nd dose", null, "After 30 days of the 2nd dose", null];
    const pcrHeader2 = [null, null, null, "Tested", "Positive", "Tested", "Positive", "Tested", "Positive"];
    const pcrTableData = getPcrTableData(data);
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
        strainTitle, strainHeader, ...strainTableData
    ];

    const ws = XLSX.utils.aoa_to_sheet(finalData);
    const ageStartRow = 4 + siteTableData.length + 2;
    const pcrStartRow = ageStartRow + 4 + ageTableData.length + 2;
    const strainStartRow = pcrStartRow + 4 + pcrTableData.length + 2; 

    const merges = [
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
        { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } }, { s: { r: 2, c: 5 }, e: { r: 2, c: 6 } }, { s: { r: 2, c: 7 }, e: { r: 2, c: 8 } },
        { s: { r: ageStartRow, c: 0 }, e: { r: ageStartRow, c: 4 } }, { s: { r: ageStartRow + 1, c: 0 }, e: { r: ageStartRow + 2, c: 0 } },
        { s: { r: ageStartRow + 1, c: 1 }, e: { r: ageStartRow + 2, c: 1 } }, { s: { r: ageStartRow + 1, c: 2 }, e: { r: ageStartRow + 2, c: 2 } },
        { s: { r: ageStartRow + 1, c: 3 }, e: { r: ageStartRow + 1, c: 4 } }, { s: { r: ageStartRow + 1, c: 5 }, e: { r: ageStartRow + 1, c: 6 } }, { s: { r: ageStartRow + 1, c: 7 }, e: { r: ageStartRow + 1, c: 8 } },
        { s: { r: pcrStartRow, c: 0 }, e: { r: pcrStartRow, c: 4 } }, { s: { r: pcrStartRow + 1, c: 0 }, e: { r: pcrStartRow + 2, c: 0 } },
        { s: { r: pcrStartRow + 1, c: 1 }, e: { r: pcrStartRow + 2, c: 1 } }, { s: { r: pcrStartRow + 1, c: 2 }, e: { r: pcrStartRow + 2, c: 2 } },
        { s: { r: pcrStartRow + 1, c: 3 }, e: { r: pcrStartRow + 1, c: 4 } }, { s: { r: pcrStartRow + 1, c: 5 }, e: { r: pcrStartRow + 1, c: 6 } }, { s: { r: pcrStartRow + 1, c: 7 }, e: { r: pcrStartRow + 1, c: 8 } },
        { s: { r: strainStartRow, c: 0 }, e: { r: strainStartRow, c: 4 } }
    ];
    ws['!merges'] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Report");
    XLSX.writeFile(wb, "Summary_Report_Conjugate_vaccine_PR-24079_icddrb.xlsx");
};

export const exportToPDF = (data: SummaryData, generatedAt: Date) => {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF constructor not found.");
        const doc = new window.jspdf.jsPDF('l', 'pt');
        if (typeof (doc as any).autoTable !== 'function') throw new Error("jsPDF-AutoTable plugin not loaded.");
        const titleLine1 = "Summary Report: Conjugate vaccine (PR-24079)";
        const titleLine2 = "icddr,b, Mohakhali, Dhaka, Bangladesh";
        doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(titleLine1, 40, 40);
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(titleLine2, 40, 58);
        doc.setFontSize(9); doc.setTextColor(100); doc.text(`Generated on: ${generatedAt.toLocaleString()}`, 40, 75);
        const commonStyles = { cellPadding: 3, fontSize: 8 };
        const commonHeadStyles = { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', halign: 'center' };
        const head = [[{ content: 'Site Name', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Enrollment', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Number of Diarrhoeal Events', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }], ['Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive']];
        const body = getTableData(data);
        (doc as any).autoTable({ head, body, startY: 90, theme: 'grid', headStyles: commonHeadStyles, styles: commonStyles, didParseCell: function(hookData: any) { if (hookData.section === 'body' && hookData.row.index === body.length - 1) { hookData.cell.styles.fontStyle = 'bold'; hookData.cell.styles.fillColor = [229, 231, 235]; } } });
        let finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(14); doc.setTextColor(0); doc.text("Age wise diarrheal events", 40, finalY + 30);
        const ageHead = [[{ content: 'Age Distribution', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Events', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Culture Positive', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }], ['Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive', 'Diarrheal events', 'Culture positive']];
        const ageBody = getAgeTableData(data);
        (doc as any).autoTable({ head: ageHead, body: ageBody, startY: finalY + 45, theme: 'grid', headStyles: commonHeadStyles, styles: commonStyles });
        finalY = (doc as any).lastAutoTable.finalY || 250;
        doc.setFontSize(14); doc.setTextColor(0); doc.text("RT-PCR Result", 40, finalY + 30);
        const pcrHead = [[{ content: 'Site Name', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Tests', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'Total Positive', rowSpan: 2, styles: { valign: 'middle' } }, { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } }, { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }], ['Tested', 'Positive', 'Tested', 'Positive', 'Tested', 'Positive']];
        const pcrBody = getPcrTableData(data);
        (doc as any).autoTable({ head: pcrHead, body: pcrBody, startY: finalY + 45, theme: 'grid', headStyles: commonHeadStyles, styles: commonStyles, didParseCell: function(hookData: any) { if (hookData.section === 'body' && hookData.row.index === pcrBody.length - 1) { hookData.cell.styles.fontStyle = 'bold'; hookData.cell.styles.fillColor = [229, 231, 235]; } } });
        finalY = (doc as any).lastAutoTable.finalY || 350;
        doc.setFontSize(14); doc.setTextColor(0); doc.text("Serotype/Serogroup Distribution of Culture Positive Cases", 40, finalY + 40);
        const strainHead = [["Serotype/Serogroup", "Total Positive Cases", "After 1st dose", "After 2nd dose", "After 30 days of the 2nd dose"]];
        const strainBody = getStrainTableData(data);
        (doc as any).autoTable({ head: strainHead, body: strainBody, startY: finalY + 55, theme: 'grid', headStyles: commonHeadStyles, styles: { ...commonStyles, halign: 'center' } });
        doc.save('Summary_Report_Conjugate_vaccine_PR-24079_icddrb.pdf');
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert(`Could not generate PDF. Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
};
