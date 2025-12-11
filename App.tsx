
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { SummaryTable } from './components/SummaryTable';
import { processFiles } from './services/dataProcessor';
import { exportToPDF, exportToXLSX } from './services/exporter';
import type { SummaryData } from './types';

const App: React.FC = () => {
    const [participantFile, setParticipantFile] = useState<File | null>(null);
    const [diarrheaFile, setDiarrheaFile] = useState<File | null>(null);
    const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [reportGeneratedAt, setReportGeneratedAt] = useState<Date | null>(null);

    const handleGenerateReport = useCallback(async () => {
        if (!participantFile || !diarrheaFile) {
            setError("Please upload both files.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSummaryData(null);
        setReportGeneratedAt(null);

        try {
            const data = await processFiles(participantFile, diarrheaFile);
            setSummaryData(data);
            setReportGeneratedAt(new Date());
        } catch (e) {
            if (e instanceof Error) {
                setError(`An error occurred: ${e.message}. Please check file formats and content.`);
            } else {
                setError("An unknown error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [participantFile, diarrheaFile]);
    
    const handleExportPDF = useCallback(() => {
        if (summaryData && reportGeneratedAt) {
            exportToPDF(summaryData, reportGeneratedAt);
        }
    }, [summaryData, reportGeneratedAt]);

    const handleExportXLSX = useCallback(() => {
        if (summaryData && reportGeneratedAt) {
            exportToXLSX(summaryData, reportGeneratedAt);
        }
    }, [summaryData, reportGeneratedAt]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
            {/* Professional Header with Gradient */}
            <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md border-b border-slate-700">
                <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-teal-900/50 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wider uppercase mb-4">
                        Protocol No: PR-24079
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-3">
                        Clinical Trial Data Dashboard
                    </h1>
                    <p className="text-slate-300 text-lg md:text-xl font-light max-w-4xl mx-auto">
                        Phase III clinical trial of the S. Flexneri–S. Sonnei bivalent conjugate vaccine
                    </p>
                </div>
            </header>
            
            <main className="py-10 flex-grow">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    
                    {/* Control Panel Card */}
                    <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 mb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <FileUpload 
                                id="participants-file"
                                title="Participant Information" 
                                description="XLSX with columns: 'Site Name', 'Randomization Number', 'Visit Name', 'Actual Date', 'Age'"
                                onFileSelect={setParticipantFile}
                            />
                            <FileUpload 
                                id="diarrhea-file"
                                title="Diarrheal Events" 
                                description="CSV or XLSX with columns: 'Rand# ID', 'Collection Date', 'Result', 'Shigella Strain', 'RT-PCR', 'Age'"
                                onFileSelect={setDiarrheaFile}
                            />
                        </div>
                        
                        <div className="text-center border-t border-slate-100 pt-6">
                            <button
                                onClick={handleGenerateReport}
                                disabled={!participantFile || !diarrheaFile || isLoading}
                                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing Data...
                                    </>
                                ) : 'Generate Analysis Report'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-md shadow-sm" role="alert">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="font-bold text-sm">Processing Error</p>
                                    <p className="text-sm mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {summaryData && !isLoading && (
                        <div className="mt-12 animate-fade-in">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-200">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Analysis Results</h2>
                                    {reportGeneratedAt && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            Dataset generated: <span className="font-medium text-slate-700">{reportGeneratedAt.toLocaleString()}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex space-x-3 mt-4 sm:mt-0">
                                    <button
                                        onClick={handleExportXLSX}
                                        className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
                                    >
                                        <svg className="mr-2 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        Download Excel
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
                                    >
                                        <svg className="mr-2 h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                                        </svg>
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                            <SummaryTable data={summaryData} />
                        </div>
                    )}

                    {!summaryData && !isLoading && !error && (
                        <div className="mt-12 text-center">
                            <div className="inline-block p-8 bg-white rounded-lg border-2 border-dashed border-slate-200">
                                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-slate-900">No Data Generated</h3>
                                <p className="mt-1 text-sm text-slate-500">Upload participant and event files above to begin.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-center space-y-3 text-sm text-slate-400 text-center">
                        <p className="font-semibold text-slate-300">&copy; 2025 Immunibiology, Nutritional and Toxicology Lab. All rights reserved.</p>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                            <span>Principal Investigator: <span className="text-white">Rubhana Raqib</span></span>
                            <span className="hidden sm:inline text-slate-600">|</span>
                            <span>Sponsor: <span className="text-white">Chongqing Zhifei Biological Products Co., Ltd</span></span>
                        </div>
                        <p className="text-xs mt-2">
                            Developed & Maintained by{' '}
                            <a 
                                href="https://bd.linkedin.com/in/arjon-golder" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-teal-400 hover:text-teal-300 hover:underline font-medium transition-colors"
                            >
                                Arjon
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
