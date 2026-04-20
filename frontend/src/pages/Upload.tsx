import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Upload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8080/api/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { session_id, meta } = response.data;
      const { all_columns, detected_protected_attributes, detected_label_column } = meta;
      
      const columnNames = all_columns.map((c: any) => c.name);

      localStorage.setItem('session_id', session_id);
      localStorage.setItem('columns', JSON.stringify(columnNames));
      localStorage.setItem('detected_protected_attributes', JSON.stringify(detected_protected_attributes || []));
      localStorage.setItem('detected_label_column', detected_label_column || '');
      
      navigate('/configure');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Upload failed. Please check if the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center p-4 md:p-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-container/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-3xl relative z-10 flex flex-col items-center">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="font-headline text-3xl md:text-5xl font-bold tracking-tight text-on-surface mb-4">Initialize Analysis</h1>
          <p className="text-on-surface-variant text-base md:text-lg max-w-xl mx-auto px-4">Upload your dataset to begin the forensic audit for bias and fairness metrics.</p>
          {error && <p className="text-error mt-4 font-mono text-sm">{error}</p>}
        </div>

        <div 
          className={`w-full bg-surface-container-high rounded-xl p-0.5 md:p-1 relative group cursor-pointer hover:shadow-xl transition-all duration-300 ${isDragging ? 'shadow-2xl' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={`bg-surface-container-lowest rounded-lg border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center py-16 md:py-24 px-4 md:px-8 text-center min-h-[300px] md:min-h-[400px] ${isDragging ? 'border-primary-container bg-surface-container-lowest/80' : 'border-outline-variant/30 group-hover:border-primary-container/50'}`}>
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-6 shadow-lg">
              <span className={`material-symbols-outlined text-3xl md:text-4xl transition-colors ${isUploading ? 'animate-bounce text-primary-container' : 'text-primary-container'}`}>
                {isUploading ? 'sync' : 'cloud_upload'}
              </span>
            </div>
            <h2 className="font-headline text-xl md:text-2xl font-semibold text-on-surface mb-2 px-2">
              {isUploading ? 'Forensic processing...' : 'Drop your CSV dataset here'}
            </h2>
            <p className="text-on-surface-variant text-xs md:text-sm mb-8 font-mono opacity-60">Supports hiring, loan, medical datasets</p>
            
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" accept=".csv" />
            
            <button className="bg-transparent border border-outline hover:border-primary-container text-on-surface hover:text-primary-container px-6 py-3 font-headline text-xs md:text-sm tracking-wider uppercase transition-all">
              Browse Files
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 text-on-surface-variant bg-surface-container px-4 py-2 rounded-lg border border-outline-variant/20 max-w-[90vw]">
          <span className="material-symbols-outlined text-sm shrink-0">lock</span>
          <span className="text-[10px] md:text-xs font-mono truncate">Data is processed in temporary memory. No persistent storage.</span>
        </div>
      </div>
    </main>
  );
};

export default Upload;
