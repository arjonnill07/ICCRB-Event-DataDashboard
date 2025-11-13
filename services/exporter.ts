import type { SummaryData } from '../types';
import { formatPercent } from '../utils/formatter';

declare const XLSX: any;

// Since the jsPDF library is loaded via a script tag, we need to declare its presence on the window object for TypeScript.
declare global {
    interface Window {
        jsPDF: any;
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

export const exportToXLSX = (data: SummaryData, generatedAt: Date) => {
    const reportDateInfo = [`Report Generated: ${generatedAt.toLocaleString()}`];
    const header1 = [
        "Site Name", 
        "Enrollment", 
        "Number of Diarrhoeal Events", 
        "After 1st dose", null, 
        "After 2nd dose", null,
        "After 30 days of the 2nd dose", null
    ];
    const header2 = [
        null, null, null,
        "Diarrheal events", "Culture positive",
        "Diarrheal events", "Culture positive",
        "Diarrheal events", "Culture positive"
    ];

    const tableData = getTableData(data);
    const finalData = [reportDateInfo, [], header1, header2, ...tableData];

    const ws = XLSX.utils.aoa_to_sheet(finalData);
    
    // Adjust row indices by +2 to account for the date and spacer rows
    ws['!merges'] = [
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // Site Name
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // Enrollment
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // Number of Diarrhoeal Events
        { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } }, // After 1st dose
        { s: { r: 2, c: 5 }, e: { r: 2, c: 6 } }, // After 2nd dose
        { s: { r: 2, c: 7 }, e: { r: 2, c: 8 } }, // After 30 days
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Report");
    XLSX.writeFile(wb, "Clinical_Trial_Summary_Report.xlsx");
};

export const exportToPDF = (data: SummaryData, generatedAt: Date) => {
    try {
        if (!window.jsPDF || typeof window.jsPDF !== 'function') {
            throw new Error("jsPDF constructor not found. The PDF library may not have loaded correctly.");
        }

        const doc = new window.jsPDF('l');

        if (typeof (doc as any).autoTable !== 'function') {
            throw new Error("jsPDF-AutoTable plugin not loaded correctly. The 'autoTable' method is missing.");
        }

        doc.setFontSize(18);
        doc.text("Clinical Trial Summary Report", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100); // A gray color for the subtitle
        doc.text(`Generated on: ${generatedAt.toLocaleString()}`, 14, 28);

        const columns = [
            { title: "Site Name", dataKey: "siteName" },
            { title: "Enrollment", dataKey: "enrollment" },
            { title: "Diarrhoeal Events", dataKey: "diarrhoealEvents" },
            { title: "Events\n(1st dose)", dataKey: "events1" },
            { title: "Positive\n(1st dose)", dataKey: "positive1" },
            { title: "Events\n(2nd dose)", dataKey: "events2" },
            { title: "Positive\n(2nd dose)", dataKey: "positive2" },
            { title: "Events\n(30d+)", dataKey: "events30" },
            { title: "Positive\n(30d+)", dataKey: "positive30" },
        ];
        
        const body = getTableData(data);

        (doc as any).autoTable(columns, body, {
            startY: 32,
            theme: 'grid',
            headStyles: {
                fillColor: [243, 244, 246], // gray-100
                textColor: [55, 65, 81],    // gray-700
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                cellPadding: 2,
                fontSize: 8,
            },
            columnStyles: {
                siteName: { halign: 'left' },
                enrollment: { halign: 'center' },
                diarrhoealEvents: { halign: 'center' },
                events1: { halign: 'center' },
                positive1: { halign: 'center' },
                events2: { halign: 'center' },
                positive2: { halign: 'center' },
                events30: { halign: 'center' },
                positive30: { halign: 'center' },
            },
            didParseCell: function(hookData: any) {
                 if (hookData.row.index === body.length - 1) { // Last row (Totals)
                    hookData.cell.styles.fontStyle = 'bold';
                    hookData.cell.styles.fillColor = [229, 231, 235]; // gray-200
                 }
            }
        });

        doc.save('Clinical_Trial_Summary_Report.pdf');
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        alert(`Could not generate PDF. Error: ${errorMessage}`);
    }
};