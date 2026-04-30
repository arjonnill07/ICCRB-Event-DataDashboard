
import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SummaryTable } from './components/SummaryTable';
import { RecurrentCasesTable } from './components/RecurrentCasesTable';
import { DiagnosticInsights } from './components/DiagnosticInsights';
import { ParticipantLookup } from './components/ParticipantLookup';
import { processFiles } from './services/dataProcessor';
import { exportToPDF, exportToXLSX, exportDetailedToXLSX } from './services/exporter';
import type { SummaryData } from './types';

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; color: string }> = ({ title, value, subValue, color }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</span>
        <span className={`text-4xl font-extrabold ${color} tracking-tight`}>{value}</span>
        {subValue && <span className="text-xs text-slate-500 mt-2 font-medium">{subValue}</span>}
    </div>
);

const App: React.FC = () => {
    const [participantFile, setParticipantFile] = useState<File | null>(null);
    const [diarrheaFile, setDiarrheaFile] = useState<File | null>(null);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [reportGeneratedAt, setReportGeneratedAt] = useState<Date | null>(null);
    const [selectedExportSite, setSelectedExportSite] = useState<string>("All Sites");
    const [pdfOptions, setPdfOptions] = useState({ summary: true, age: true, pcr: true, strain: true });
    const [selectedStrains, setSelectedStrains] = useState<string[]>([]);
    const [showRecurrentCases, setShowRecurrentCases] = useState(false);

    useEffect(() => {
        if (summaryData) {
            setSelectedStrains(summaryData.strains.map(s => s.strainName));
        }
    }, [summaryData]);

    const handleGenerateReport = useCallback(async () => {
        if (!participantFile || !diarrheaFile) {
            setError("Please upload both files.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await processFiles(participantFile, diarrheaFile);
            setSummaryData(data);
            setReportGeneratedAt(new Date());
        } catch (e: any) {
            setError(`Analysis Error: ${e.message || "Failed to process files."}`);
        } finally {
            setIsLoading(false);
        }
    }, [participantFile, diarrheaFile]);
    
    const handleExportPDF = () => summaryData && reportGeneratedAt && exportToPDF(summaryData, reportGeneratedAt, {
        includeSummary: pdfOptions.summary,
        includeAge: pdfOptions.age,
        includePcr: pdfOptions.pcr,
        includeStrain: pdfOptions.strain,
        selectedStrains
    });
    const handleExportXLSX = () => summaryData && reportGeneratedAt && exportToXLSX(summaryData, reportGeneratedAt);
    const handleExportDetailed = () => summaryData && exportDetailedToXLSX(summaryData, selectedExportSite);

    const availableStrains = summaryData?.strains.map(s => s.strainName) ?? [];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
            <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border-b border-slate-700">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight mb-2 text-slate-50 drop-shadow-sm">
                        Phase III Clinical Trial Dashboard
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base font-medium max-w-2xl mx-auto">
                        S. Flexneri–S. Sonnei Bivalent Conjugate Vaccine Analysis Portal
                    </p>
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold tracking-widest uppercase mt-6 shadow-sm">
                        Protocol No: PR-24079
                    </div>
                </div>
            </header>
            
            <main className="py-10 flex-grow">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-10 transition-all hover:shadow-2xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                            <FileUpload id="p-file" title="Enrollment Data" description="Site Name, Rand#, Visit, Dates" onFileSelect={setParticipantFile} />
                            <FileUpload id="d-file" title="Event Log" description="Rand#, Date, Culture No, Result" onFileSelect={setDiarrheaFile} />
                        </div>
                        <div className="text-center pt-4">
                            <button
                                onClick={handleGenerateReport}
                                disabled={!participantFile || !diarrheaFile || isLoading}
                                className="px-12 py-4 text-lg font-black rounded-xl shadow-lg text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 transition-all transform hover:-translate-y-1 active:scale-95"
                            >
                                {isLoading ? 'ANALYZING CLINICAL STREAM...' : 'GENERATE FULL REPORT'}
                            </button>
                        </div>
                    </div>

                    {summaryData && !isLoading && (
                        <div className="mb-12 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                                <StatCard title="Total Enrollment" value={summaryData.totals.enrollment} color="text-slate-900" subValue="Participants Randomized" />
                                <StatCard title="Total Events" value={summaryData.totals.totalDiarrhealEvents} color="text-amber-600" subValue="Verified Diarrheal Episodes" />
                                <StatCard title="Culture Positive" value={summaryData.totals.after1stDoseCulturePositive + summaryData.totals.after2ndDoseCulturePositive + summaryData.totals.after30Days2ndDoseCulturePositive} color="text-rose-600" subValue="Confirmed Shigella Cases" />
                                <StatCard title="Recurrent Cases" value={summaryData.recurrentCases.length} color="text-blue-600" subValue="Participants with >1 Event" />
                            </div>

                            <DiagnosticInsights data={summaryData} />

                            <ParticipantLookup data={summaryData} />

                            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] mb-8">
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <p className="text-xs uppercase font-black tracking-widest text-slate-400">Site-specific XLSX export</p>
                                            <p className="mt-2 text-sm font-bold text-slate-900">Download event log for one site</p>
                                        </div>
                                        <div className="text-sm text-slate-500">Choose a site and export its detailed event log.</div>
                                    </div>

                                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">Export Site</label>
                                            <select
                                                value={selectedExportSite}
                                                onChange={(e) => setSelectedExportSite(e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            >
                                                <option value="All Sites">All Sites Combined</option>
                                                {summaryData.sites.map(s => (
                                                    <option key={s.siteName} value={s.siteName}>{s.siteName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <button
                                                onClick={handleExportDetailed}
                                                className="px-5 py-2.5 bg-teal-600 rounded-xl text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-sm"
                                            >
                                                Download XLSX
                                            </button>
                                            <button
                                                onClick={() => summaryData && exportDetailedToXLSX(summaryData, 'All Sites')}
                                                className="px-5 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all"
                                            >
                                                All Sites XLSX
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200 shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <p className="text-xs uppercase font-black tracking-widest text-rose-600">PDF export</p>
                                            <p className="mt-2 text-sm font-bold text-slate-900">Generate a custom PDF report</p>
                                        </div>
                                        <div className="text-sm text-slate-500">Toggle sections and strain filters before exporting.</div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        {[
                                            { key: 'summary', label: 'Site Summary' },
                                            { key: 'age', label: 'Age Distribution' },
                                            { key: 'pcr', label: 'RT-PCR Result' },
                                            { key: 'strain', label: 'Serotype/Serogroup' }
                                        ].map(section => (
                                            <label key={section.key} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={pdfOptions[section.key as keyof typeof pdfOptions]}
                                                    onChange={() => setPdfOptions(prev => ({
                                                        ...prev,
                                                        [section.key]: !prev[section.key as keyof typeof pdfOptions]
                                                    }))}
                                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                {section.label}
                                            </label>
                                        ))}
                                    </div>

                                    <div className="mt-6">
                                        <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">Serotype / Serogroup Filter</label>
                                        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 p-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                {availableStrains.map(strainName => (
                                                    <label key={strainName} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStrains.includes(strainName)}
                                                            onChange={() => {
                                                                setSelectedStrains(prev => prev.includes(strainName)
                                                                    ? prev.filter(item => item !== strainName)
                                                                    : [...prev, strainName]
                                                                );
                                                            }}
                                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <span className="truncate">{strainName}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStrains(availableStrains)}
                                                className="text-[11px] font-bold text-teal-700 hover:text-teal-900"
                                            >
                                                Select all
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStrains([])}
                                                className="text-[11px] font-bold text-slate-500 hover:text-slate-900"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-6 text-right">
                                        <button
                                            onClick={handleExportPDF}
                                            className="px-6 py-3 bg-rose-600 rounded-xl text-sm font-bold text-white hover:bg-rose-700 transition-all shadow-sm"
                                        >
                                            Download PDF
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <SummaryTable data={summaryData} />
                            
                            {summaryData.recurrentCases.length > 0 && (
                                <div className="mt-16 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                                    <button
                                        onClick={() => setShowRecurrentCases(!showRecurrentCases)}
                                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="text-left">
                                            <h3 className="text-lg font-black text-slate-900">Recurrent Episode Analytics</h3>
                                            <p className="text-sm text-slate-500 mt-1">Participants with multiple diarrheal episodes</p>
                                        </div>
                                        <svg
                                            className={`w-6 h-6 text-slate-400 transition-transform ${
                                                showRecurrentCases ? 'rotate-180' : ''
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </button>
                                    {showRecurrentCases && (
                                        <div className="border-t border-slate-200 p-6">
                                            <RecurrentCasesTable data={summaryData.recurrentCases} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {error && <div className="p-6 bg-rose-50 border-l-8 border-rose-500 text-rose-900 rounded-xl shadow-lg mt-8 font-bold">{error}</div>}
                </div>
            </main>

            <footer className="bg-slate-900 py-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Internal Laboratory System</p>
                    <div className="flex flex-wrap justify-center gap-12 mb-8">
                        <div className="text-left">
                            <p className="text-[10px] text-slate-600 font-black uppercase">Principal Investigator</p>
                            <p className="text-white font-bold">Rubhana Raqib</p>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] text-slate-600 font-black uppercase">Clinical Sponsor</p>
                            <p className="text-white font-bold">Chongqing Zhifei Biological Products</p>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] text-slate-600 font-black uppercase">System Development Supervisor</p>
                            <p className="text-white font-bold">Md. Ahsanul Haq</p>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] text-slate-600 font-black uppercase underline decoration-teal-500/50">System Developer</p>
                            <a 
                                href="https://bd.linkedin.com/in/arjon-golder" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-white font-bold hover:text-teal-400 transition-colors flex items-center gap-1"
                            >
                                Arjon Golder
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            </a>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-700 font-medium">
                        Developed and maintained by <a href="https://bd.linkedin.com/in/arjon-golder" target="_blank" rel="noopener noreferrer" className="hover:text-teal-500 transition-colors">Arjon Golder</a>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default App;
