
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
    id: string;
    title: string;
    description: string;
    onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ id, title, description, onFileSelect }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = useCallback((files: FileList | null) => {
        if (files && files.length > 0) {
            const file = files[0];
            setFileName(file.name);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
            <label
                htmlFor={id}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex-grow flex flex-col justify-center px-6 pt-8 pb-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 group
                    ${isDragging 
                        ? 'border-teal-500 bg-teal-50' 
                        : fileName 
                            ? 'border-teal-200 bg-teal-50/30 hover:bg-teal-50/50' 
                            : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
                    }`}
            >
                <div className="space-y-2 text-center">
                    <div className={`mx-auto h-12 w-12 flex items-center justify-center rounded-full transition-colors ${isDragging || fileName ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500'}`}>
                        {fileName ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <UploadIcon className="h-6 w-6" />
                        )}
                    </div>
                    
                    <div className="text-sm text-slate-600">
                        {fileName ? (
                             <p className="font-semibold text-teal-700 break-all">{fileName}</p>
                        ) : (
                            <>
                                <span className="font-medium text-teal-600 hover:text-teal-500">Upload a file</span>
                                <span className="text-slate-400"> or drag and drop</span>
                            </>
                        )}
                    </div>
                    {!fileName && <p className="text-xs text-slate-400 px-4 leading-relaxed">{description}</p>}
                </div>
                <input
                    id={id}
                    name={id}
                    type="file"
                    accept=".csv,.xlsx"
                    className="sr-only"
                    onChange={(e) => handleFileChange(e.target.files)}
                />
            </label>
        </div>
    );
};
