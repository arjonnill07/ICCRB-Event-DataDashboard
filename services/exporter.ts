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

export const exportToXLSX = (data: SummaryData) => {
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
    const finalData = [header1, header2, ...tableData];

    const ws = XLSX.utils.aoa_to_sheet(finalData);
    
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Site Name
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Enrollment
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Number of Diarrhoeal Events
        { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } }, // After 1st dose
        { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } }, // After 2nd dose
        { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } }, // After 30 days
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Report");
    XLSX.writeFile(wb, "Clinical_Trial_Summary_Report.xlsx");
};

export const exportToPDF = (data: SummaryData) => {
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

        // Define columns and body for the jsPDF-AutoTable v2.x API
        const columns = [
            "Site Name",
            "Enrollment",
            "Diarrhoeal Events",
            "Events\n(1st dose)",
            "Positive\n(1st dose)",
            "Events\n(2nd dose)",
            "Positive\n(2nd dose)",
            "Events\n(30d+)",
            "Positive\n(30d+)",
        ];
        
        const body = getTableData(data);

        // Define options and call autoTable with the correct signature: (columns, data, options)
        (doc as any).autoTable(columns, body, {
            startY: 30,
            theme: 'grid',
            headStyles: {
                fillColor: [243, 244, 246], // gray-100
                textColor: [55, 65, 81], // gray-700
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                cellPadding: 2,
                fontSize: 8,
            },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' },
                8: { halign: 'center' },
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