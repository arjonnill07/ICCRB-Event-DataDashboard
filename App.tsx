
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

    const handleGenerateReport = useCallback(async () => {
        if (!participantFile || !diarrheaFile) {
            setError("Please upload both files.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSummaryData(null);

        try {
            const data = await processFiles(participantFile, diarrheaFile);
            setSummaryData(data);
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
        if (summaryData) {
            exportToPDF(summaryData);
        }
    }, [summaryData]);

    const handleExportXLSX = useCallback(() => {
        if (summaryData) {
            exportToXLSX(summaryData);
        }
    }, [summaryData]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 antialiased">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold leading-tight text-gray-900">
                        Clinical Trial Data Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Upload participant and diarrheal event data to generate a summary report.
                    </p>
                </div>
            </header>
            
            <main className="py-10">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white p-8 rounded-lg shadow-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <FileUpload 
                                id="participants-file"
                                title="Participant Information" 
                                description="XLSX with columns: 'Site Name', 'Randomization Number', 'Visit Name', 'Actual Date'"
                                onFileSelect={setParticipantFile}
                            />
                            <FileUpload 
                                id="diarrhea-file"
                                title="Diarrheal Events" 
                                description="CSV or XLSX with columns: 'Rand# ID', 'Collection Date', 'Result'"
                                onFileSelect={setDiarrheaFile}
                            />
                        </div>
                        
                        <div className="text-center">
                            <button
                                onClick={handleGenerateReport}
                                disabled={!participantFile || !diarrheaFile || isLoading}
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : 'Generate Report'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {summaryData && !isLoading && (
                        <div className="mt-12">
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-semibold text-gray-800">Analysis Results</h2>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleExportXLSX}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Export to XLSX
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Export to PDF
                                    </button>
                                </div>
                            </div>
                            <SummaryTable data={summaryData} />
                        </div>
                    )}

                    {!summaryData && !isLoading && !error && (
                        <div className="mt-12 text-center text-gray-500">
                            <div className="bg-white p-8 rounded-lg shadow">
                                <h3 className="text-lg font-medium text-gray-900">Waiting for Data</h3>
                                <p className="mt-2 text-sm">Upload both participant and event files, then click "Generate Report" to see the analysis.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
