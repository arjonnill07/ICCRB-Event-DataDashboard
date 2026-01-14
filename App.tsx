
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { SummaryTable } from './components/SummaryTable';
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
    
    const handleExportPDF = () => summaryData && reportGeneratedAt && exportToPDF(summaryData, reportGeneratedAt);
    const handleExportXLSX = () => summaryData && reportGeneratedAt && exportToXLSX(summaryData, reportGeneratedAt);
    const handleExportDetailed = () => summaryData && exportDetailedToXLSX(summaryData, selectedExportSite);

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
                                <StatCard title="Data Integrity" value={summaryData.unmappedEvents === 0 ? "100%" : `${Math.max(0, 100 - (summaryData.unmappedEvents/summaryData.totals.totalDiarrhealEvents*100)).toFixed(1)}%`} color={summaryData.unmappedEvents === 0 ? "text-emerald-600" : "text-orange-500"} subValue={`${summaryData.unmappedEvents} Unlinked Records`} />
                            </div>

                            {summaryData.unmappedEvents > 0 && (
                                <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm flex items-center">
                                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z" /></svg>
                                    <strong>Data Discrepancy Found:</strong> {summaryData.unmappedEvents} events use IDs not found in the Enrollment file. Site attribution for these was pulled from the event log directly.
                                </div>
                            )}

                             <div className="flex flex-col sm:flex-row justify-between items-end mb-8 gap-6">
                                <div className="flex-1">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Clinical Summary Report</h2>
                                    <p className="text-sm text-slate-500 mt-1 font-medium italic">Snapshot: {reportGeneratedAt?.toLocaleString()}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Export Scope</label>
                                        <select 
                                            value={selectedExportSite} 
                                            onChange={(e) => setSelectedExportSite(e.target.value)}
                                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer shadow-sm"
                                        >
                                            <option value="All Sites">All Sites Combined</option>
                                            {summaryData.sites.map(s => (
                                                <option key={s.siteName} value={s.siteName}>{s.siteName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-5">
                                        <button onClick={handleExportDetailed} className="flex items-center px-5 py-2.5 bg-teal-600 rounded-lg text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-sm">
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 00-4-4H5m14 6l-3-3m3 3l3-3m-3 3V10" /></svg> 
                                            Detailed XLSX Report
                                        </button>
                                        <button onClick={handleExportXLSX} className="flex items-center px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:text-emerald-600 transition-all hover:border-emerald-200 shadow-sm">
                                            <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> 
                                            Excel Summary
                                        </button>
                                        <button onClick={handleExportPDF} className="flex items-center px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:text-rose-600 transition-all hover:border-rose-200 shadow-sm">
                                            <svg className="w-4 h-4 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> 
                                            PDF Summary
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <SummaryTable data={summaryData} />
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
