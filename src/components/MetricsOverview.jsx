import React from 'react';
import { Bot, Briefcase, Clock, CheckCircle } from 'lucide-react';

export default function MetricsOverview({ metrics }) {
  const items = [
    { label: 'Total Tasks Automated', value: metrics?.totalTasks || 0, icon: Bot, color: '#6366f1' },
    { label: 'Job Positions Matched', value: metrics?.activeJobsCount || 0, icon: Briefcase, color: '#06b6d4' },
    { label: 'Hours Saved (Est.)', value: `${metrics?.timeSavedHours || 0} hrs`, icon: Clock, color: '#10b981' },
    { label: 'Fleet Execution Accuracy', value: metrics?.fleetSuccessRate || '100%', icon: CheckCircle, color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, border: `1px solid ${item.color}30` }}>
              <Icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</div>
              <div className="heading-font" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{item.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
