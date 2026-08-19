import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Send, FileText, CheckCircle, Sparkles, Filter, ExternalLink } from 'lucide-react';

export default function JobHunterTab({ jobs, onSearchJobs, onApplyJob }) {
  const [query, setQuery] = useState('AI Engineer');
  const [location, setLocation] = useState('Remote');
  const [minSalary, setMinSalary] = useState('150000');
  const [isSearching, setIsSearching] = useState(false);
  const [activeCoverLetter, setActiveCoverLetter] = useState(null);
  const [appliedJobTitle, setAppliedJobTitle] = useState('');

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    await onSearchJobs(query, location, minSalary);
    setTimeout(() => setIsSearching(false), 2600);
  };

  const handleApplyClick = async (job) => {
    const result = await onApplyJob(job.id);
    if (result && result.coverLetter) {
      setActiveCoverLetter(result.coverLetter);
      setAppliedJobTitle(`${job.title} at ${job.company}`);
    }
  };

  return (
    <div>
      {/* Top Search & Filter Bar */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles style={{ color: 'var(--accent-cyan)' }} size={20} />
          <h2 className="heading-font" style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Job Hunter & Scraper Configuration</h2>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) gap(12px)', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Target Role (e.g. AI Engineer)"
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px 10px 36px', color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="Location (e.g. Remote)"
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px 10px 36px', color: 'white', outline: 'none' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={minSalary} 
              onChange={(e) => setMinSalary(e.target.value)} 
              placeholder="Min Salary ($)"
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px 10px 36px', color: 'white', outline: 'none' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSearching} style={{ height: '42px' }}>
            {isSearching ? <span className="animate-pulse-slow">Running Scraper...</span> : <><Send size={16} /> Launch Job Agent</>}
          </button>
        </form>
      </div>

      {/* Cover Letter Modal / Output */}
      {activeCoverLetter && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderColor: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
              <CheckCircle size={20} />
              <h3 className="heading-font" style={{ fontWeight: 700 }}>Tailored Application Package Ready for {appliedJobTitle}</h3>
            </div>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActiveCoverLetter(null)}>Close</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}>
            {activeCoverLetter}
          </pre>
        </div>
      )}

      {/* Job Listings Grid */}
      <h3 className="heading-font" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Matched Job Positions</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {jobs.map((job) => (
          <div key={job.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <h4 className="heading-font" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>{job.title}</h4>
                <span className="mono-font" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {job.matchScore}% MATCH
                </span>
                {job.status === 'applied' && (
                  <span className="badge badge-running">APPLIED</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <span><strong>{job.company}</strong></span>
                <span>•</span>
                <span>{job.location}</span>
                <span>•</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 500 }}>{job.salary}</span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {job.tags.map((tag, idx) => (
                  <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {job.status === 'applied' ? (
                <button className="btn btn-secondary" disabled style={{ opacity: 0.7 }}>
                  <CheckCircle size={14} /> Application Submitted
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => handleApplyClick(job)}>
                  <FileText size={14} /> Auto-Prepare & Apply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
