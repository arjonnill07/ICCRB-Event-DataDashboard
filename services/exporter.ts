
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

export const exportToXLSX = (data: SummaryData, generatedAt: Date) => {
    const reportDateInfo = [`Report Generated: ${generatedAt.toLocaleString()}`];
    
    // --- Site Summary Table ---
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

    const siteTableData = getTableData(data);

    // --- Age Summary Table ---
    const ageTitle = ["Age wise diarrheal events"];
    const ageHeader1 = [
        "Age Distribution", 
        "Total Events", 
        "Culture Positive", 
        "After 1st dose", null, 
        "After 2nd dose", null,
        "After 30 days of the 2nd dose", null
    ];
    // header2 can be reused or similar structure
    const ageTableData = getAgeTableData(data);


    // --- PCR Summary Table ---
    const pcrTitle = ["RT-PCR Result"];
    const pcrHeader1 = [
        "Site Name",
        "Total Tests",
        "Total Positive",
        "After 1st dose", null,
        "After 2nd dose", null,
        "After 30 days of the 2nd dose", null
    ];
    const pcrHeader2 = [
        null, null, null,
        "Tested", "Positive",
        "Tested", "Positive",
        "Tested", "Positive"
    ];
    const pcrTableData = getPcrTableData(data);
    
    // --- Strain Summary Table ---
    const strainTitle = ["Serotype/Serogroup Distribution of Culture Positive Cases"];
    const strainHeader = [
        "Serotype/Serogroup",
        "Total Positive Cases",
        "After 1st dose",
        "After 2nd dose",
        "After 30 days of the 2nd dose"
    ];
    const strainTableData = getStrainTableData(data);

    // Combine all data with spacing
    const finalData = [
        reportDateInfo,
        [], // Spacer
        header1,
        header2,
        ...siteTableData,
        [], // Spacer
        [], // Spacer
        ageTitle,
        ageHeader1,
        header2, // Reusing similar structure
        ...ageTableData,
        [], // Spacer
        [], // Spacer
        pcrTitle,
        pcrHeader1,
        pcrHeader2,
        ...pcrTableData,
        [], // Spacer
        [], // Spacer
        strainTitle,
        strainHeader,
        ...strainTableData
    ];

    const ws = XLSX.utils.aoa_to_sheet(finalData);
    
    // Merge Calculations
    const ageStartRow = 4 + siteTableData.length + 2;
    const pcrStartRow = ageStartRow + 4 + ageTableData.length + 2;
    const strainStartRow = pcrStartRow + 4 + pcrTableData.length + 2; 

    const merges = [
        // Site Table
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // Site Name
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // Enrollment
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // Number of Diarrhoeal Events
        { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } }, // After 1st dose
        { s: { r: 2, c: 5 }, e: { r: 2, c: 6 } }, // After 2nd dose
        { s: { r: 2, c: 7 }, e: { r: 2, c: 8 } }, // After 30 days
        
        // Age Table
        { s: { r: ageStartRow, c: 0 }, e: { r: ageStartRow, c: 4 } }, // Title
        { s: { r: ageStartRow + 1, c: 0 }, e: { r: ageStartRow + 2, c: 0 } }, // Age Group
        { s: { r: ageStartRow + 1, c: 1 }, e: { r: ageStartRow + 2, c: 1 } }, // Total Events
        { s: { r: ageStartRow + 1, c: 2 }, e: { r: ageStartRow + 2, c: 2 } }, // Culture Positive
        { s: { r: ageStartRow + 1, c: 3 }, e: { r: ageStartRow + 1, c: 4 } }, // After 1st dose
        { s: { r: ageStartRow + 1, c: 5 }, e: { r: ageStartRow + 1, c: 6 } }, // After 2nd dose
        { s: { r: ageStartRow + 1, c: 7 }, e: { r: ageStartRow + 1, c: 8 } }, // After 30 days

        // PCR Table
        { s: { r: pcrStartRow, c: 0 }, e: { r: pcrStartRow, c: 4 } }, // Title
        { s: { r: pcrStartRow + 1, c: 0 }, e: { r: pcrStartRow + 2, c: 0 } }, // Site Name
        { s: { r: pcrStartRow + 1, c: 1 }, e: { r: pcrStartRow + 2, c: 1 } }, // Total Tests
        { s: { r: pcrStartRow + 1, c: 2 }, e: { r: pcrStartRow + 2, c: 2 } }, // Total Positive
        { s: { r: pcrStartRow + 1, c: 3 }, e: { r: pcrStartRow + 1, c: 4 } }, // After 1st dose
        { s: { r: pcrStartRow + 1, c: 5 }, e: { r: pcrStartRow + 1, c: 6 } }, // After 2nd dose
        { s: { r: pcrStartRow + 1, c: 7 }, e: { r: pcrStartRow + 1, c: 8 } }, // After 30 days
        
        // Strain Table
        { s: { r: strainStartRow, c: 0 }, e: { r: strainStartRow, c: 4 } }
    ];
    
    ws['!merges'] = merges;

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

        const commonStyles = {
            cellPadding: 3,
            fontSize: 8,
        };
        const commonHeadStyles = {
            fillColor: [243, 244, 246], // gray-100
            textColor: [55, 65, 81],    // gray-700
            fontStyle: 'bold',
            halign: 'center'
        };

        // --- Table 1: Site Summary ---
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
            headStyles: commonHeadStyles,
            styles: commonStyles,
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
                    hookData.cell.styles.fillColor = [229, 231, 235];
                 }
            }
        });

        // --- Table 2: Age Summary ---
        let finalY = (doc as any).lastAutoTable.finalY || 150;
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Age wise diarrheal events", 40, finalY + 30);

        const ageHead = [
            [
                { content: 'Age Distribution', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'Total Events', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'Culture Positive', rowSpan: 2, styles: { valign: 'middle' } },
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

        const ageBody = getAgeTableData(data);

         (doc as any).autoTable({
            head: ageHead,
            body: ageBody,
            startY: finalY + 45,
            theme: 'grid',
            headStyles: commonHeadStyles,
            styles: commonStyles,
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
            }
        });

        // --- Table 3: PCR Summary ---
        finalY = (doc as any).lastAutoTable.finalY || 250;
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("RT-PCR Result", 40, finalY + 30);

        const pcrHead = [
             [
                { content: 'Site Name', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'Total Tests', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'Total Positive', rowSpan: 2, styles: { valign: 'middle' } },
                { content: 'After 1st dose', colSpan: 2, styles: { halign: 'center' } },
                { content: 'After 2nd dose', colSpan: 2, styles: { halign: 'center' } },
                { content: 'After 30 days of the 2nd dose', colSpan: 2, styles: { halign: 'center' } }
            ],
            [
                'Tested', 'Positive',
                'Tested', 'Positive',
                'Tested', 'Positive'
            ]
        ];
        const pcrBody = getPcrTableData(data);
        
        (doc as any).autoTable({
            head: pcrHead,
            body: pcrBody,
            startY: finalY + 45,
            theme: 'grid',
            headStyles: commonHeadStyles,
            styles: commonStyles,
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
                 if (hookData.section === 'body' && hookData.row.index === pcrBody.length - 1) { 
                    hookData.cell.styles.fontStyle = 'bold';
                    hookData.cell.styles.fillColor = [229, 231, 235];
                 }
            }
        });

        // --- Table 4: Strain Distribution ---
        finalY = (doc as any).lastAutoTable.finalY || 350;
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Serotype/Serogroup Distribution of Culture Positive Cases", 40, finalY + 40);

        const strainHead = [[
            "Serotype/Serogroup",
            "Total Positive Cases",
            "After 1st dose",
            "After 2nd dose",
            "After 30 days of the 2nd dose"
        ]];

        const strainBody = getStrainTableData(data);

        (doc as any).autoTable({
            head: strainHead,
            body: strainBody,
            startY: finalY + 55,
            theme: 'grid',
            headStyles: commonHeadStyles,
            styles: {
                ...commonStyles,
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'left' }
            }
        });

        doc.save('Clinical_Trial_Summary_Report.pdf');
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        alert(`Could not generate PDF. Error: ${errorMessage}`);
    }
};
