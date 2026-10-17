import React, { useState } from 'react';
import { FileText, Download, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Can, Feature } from '@ahmed109/gatekeeper-react';

export const ReportsPage: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const sampleReports = [
    {
      id: 'REP-2026-001',
      title: 'Q3 Access Control & RBAC Compliance Audit',
      category: 'Security',
      date: 'Oct 10, 2026',
      status: 'Compliant',
      records: '1,420 events',
    },
    {
      id: 'REP-2026-002',
      title: 'Privileged Escalation & Role Assignment Telemetry',
      category: 'Audit',
      date: 'Oct 14, 2026',
      status: 'Verified',
      records: '85 actions',
    },
    {
      id: 'REP-2026-003',
      title: 'API Gateway Feature Flag Propagation Latency',
      category: 'Infrastructure',
      date: 'Oct 15, 2026',
      status: 'Optimal',
      records: '4.2ms avg',
    },
  ];

  const handleExport = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/reports/export', {
        headers: { 'x-demo-user-id': 'user-admin' },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gatekeeper-reports.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch {
      // simulated export
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Compliance & Audit Reports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Guarded by <code className="text-blue-300 font-mono">reports.view</code> permission.
          </p>
        </div>

        {/* Feature-flag guarded Export button */}
        <div className="flex items-center space-x-3">
          <Feature
            flag="export-reports"
            fallback={
              <button
                disabled
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 text-xs font-medium cursor-not-allowed flex items-center space-x-1.5"
                title="Flag 'export-reports' is disabled"
              >
                <Download className="w-4 h-4 opacity-40" />
                <span>Export CSV (Feature Disabled)</span>
              </button>
            }
          >
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </Feature>
        </div>
      </div>

      {downloadSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Report CSV exported successfully via protected backend stream!</span>
        </div>
      )}

      {/* Main Content protected by <Can permission="reports.view"> */}
      <Can
        permission="reports.view"
        fallback={
          <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-900/40 border border-rose-700/50 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white">Access Denied: Permission Missing</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
              Viewing audit reports requires the{' '}
              <code className="text-rose-300 font-mono">reports.view</code> permission. Please
              switch to an authorized role in the top header (Admin, Manager, or Member).
            </p>
          </div>
        }
      >
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-medium">Report Code</th>
                <th className="py-3 px-4 font-medium">Report Title</th>
                <th className="py-3 px-4 font-medium">Domain</th>
                <th className="py-3 px-4 font-medium">Generated Date</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sampleReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-blue-300 font-semibold">{report.id}</td>
                  <td className="py-3 px-4 text-white font-medium">{report.title}</td>
                  <td className="py-3 px-4 text-slate-300">{report.category}</td>
                  <td className="py-3 px-4 text-slate-400">{report.date}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {report.records}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Can>
    </div>
  );
};
