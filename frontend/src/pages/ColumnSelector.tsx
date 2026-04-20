import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ColumnSelector: React.FC = () => {
  const [columns, setColumns] = useState<string[]>([]);
  const [protectedAttribute, setProtectedAttribute] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedColumns = localStorage.getItem('columns');
    const detectedProtected = localStorage.getItem('detected_protected_attributes');
    const detectedTarget = localStorage.getItem('detected_label_column');

    if (storedColumns) {
      setColumns(JSON.parse(storedColumns));
    } else {
      navigate('/');
    }

    if (detectedProtected) {
      const parsed = JSON.parse(detectedProtected);
      if (parsed.length > 0) setProtectedAttribute(parsed[0]);
    }
    if (detectedTarget) {
      setTargetColumn(detectedTarget);
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!protectedAttribute || !targetColumn) {
      setError('Please select both a protected attribute and a target column.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    const sessionId = localStorage.getItem('session_id');

    try {
      const response = await axios.post('http://localhost:8080/api/analyze/', {
        session_id: sessionId,
        protected_attributes: [protectedAttribute],
        label_column: targetColumn,
      });

      localStorage.setItem('analysis_results', JSON.stringify(response.data));
      localStorage.setItem('protected_attribute', protectedAttribute);
      localStorage.setItem('target_column', targetColumn);
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail?.[0]?.msg || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center p-4 md:p-12 relative z-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex justify-center items-center">
        <div className="w-[800px] h-[800px] bg-primary-container/5 rounded-full blur-[120px] opacity-50"></div>
      </div>

      <div className="w-full max-w-4xl z-10">
        <div className="mb-8 md:mb-12 border-l-2 border-primary-container pl-4 md:pl-6 space-y-4">
          <h1 className="font-headline text-3xl md:text-5xl font-bold tracking-tight text-on-surface">Data Configuration</h1>
          <p className="font-body text-on-surface-variant text-base md:text-lg max-w-2xl">
            Select the sensitive attribute to evaluate for bias and the target prediction column.
          </p>
        </div>

        <div className="bg-surface-container-high rounded-xl p-6 md:p-12 shadow-2xl border border-outline-variant/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8 md:mb-12">
            {/* Protected Attribute Selector */}
            <div className="space-y-4">
              <label className="block font-headline text-xs uppercase tracking-widest text-on-surface-variant opacity-70" htmlFor="protected-attribute">Protected Attribute</label>
              <div className="relative group">
                <select 
                  className="w-full bg-surface-container-lowest text-on-surface border-0 border-b border-outline-variant/30 px-4 py-4 focus:ring-0 focus:border-primary-container transition-colors font-mono text-lg rounded-t-sm appearance-none" 
                  id="protected-attribute"
                  value={protectedAttribute}
                  onChange={(e) => setProtectedAttribute(e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b9cbb9%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem top 50%',
                    backgroundSize: '0.65rem auto'
                  }}
                >
                  <option value="" disabled>Select attribute...</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-primary-container scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left duration-300"></div>
              </div>
            </div>

            {/* Target Column Selector */}
            <div className="space-y-4">
              <label className="block font-headline text-xs uppercase tracking-widest text-on-surface-variant opacity-70" htmlFor="target-column">Target Column</label>
              <div className="relative group">
                <select 
                  className="w-full bg-surface-container-lowest text-on-surface border-0 border-b border-outline-variant/30 px-4 py-4 focus:ring-0 focus:border-primary-container transition-colors font-mono text-lg rounded-t-sm appearance-none" 
                  id="target-column"
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b9cbb9%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem top 50%',
                    backgroundSize: '0.65rem auto'
                  }}
                >
                  <option value="" disabled>Select target...</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-primary-container scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left duration-300"></div>
              </div>
            </div>
          </div>

          {error && <p className="text-error mb-6 font-mono text-center text-xs">{error}</p>}

          <div className="pt-8 border-t border-outline-variant/20 flex justify-end">
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full md:w-auto bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-fixed px-8 py-4 text-lg font-headline font-bold tracking-tight rounded-md hover:shadow-xl transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {isAnalyzing ? 'Processing...' : 'Analyze Bias'}
              <span className={`material-symbols-outlined transition-transform ${isAnalyzing ? 'animate-spin' : 'group-hover:translate-x-1'}`}>
                {isAnalyzing ? 'sync' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ColumnSelector;
