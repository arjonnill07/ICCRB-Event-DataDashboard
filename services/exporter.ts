import type { SummaryData } from '../types';
import { formatPercent } from '../utils/formatter';

declare const XLSX: any;

// Since the jsPDF library (v2+) is loaded via script, we declare its namespaced presence on the window object.
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
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error("jsPDF constructor not found. The PDF library (v2+) may not have loaded correctly.");
        }

        const doc = new window.jspdf.jsPDF('l', 'pt');

        if (typeof (doc as any).autoTable !== 'function') {
            throw new Error("jsPDF-AutoTable plugin not loaded correctly. The 'autoTable' method is missing.");
        }

        doc.setFontSize(18);
        doc.text("Clinical Trial Summary Report", 40, 50);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${generatedAt.toLocaleString()}`, 40, 65);

        const head = [
            [
                { content: 'Site Name', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'Enrollment', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'Number of Diarrhoeal Events', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } },
                { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } },
                { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }
            ],
            [
                'Diarrheal events', 'Culture positive',
                'Diarrheal events', 'Culture positive',
                'Diarrheal events', 'Culture positive'
            ]
        ];

        const body = getTableData(data);

        (doc as any).autoTable({
            head: head,
            body: body,
            startY: 75,
            theme: 'grid',
            headStyles: {
                fillColor: [243, 244, 246], // gray-100
                textColor: [55, 65, 81],    // gray-700
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                cellPadding: 3,
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
                 if (hookData.section === 'body' && hookData.row.index === body.length - 1) { // Last row (Totals)
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