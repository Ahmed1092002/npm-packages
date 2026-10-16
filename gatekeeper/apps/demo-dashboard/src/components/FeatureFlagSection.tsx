import { ToggleLeft, ToggleRight, Flag, Sparkles } from 'lucide-react';
import { Feature } from '@ahmedtamer/gatekeeper-react';

interface FeatureFlagSectionProps {
  flags: Record<string, boolean>;
  onToggleFlag: (key: string) => void;
}

export const FeatureFlagSection: React.FC<FeatureFlagSectionProps> = ({ flags, onToggleFlag }) => {
  const flagsList = [
    {
      key: 'new-dashboard',
      title: 'Modern Dashboard Layout',
      description: 'Activates modernized sidebar navigation, live charts, and KPI summary ribbons.',
    },
    {
      key: 'export-reports',
      title: 'Export Reports (CSV)',
      description:
        'Unlocks CSV download capabilities on reports pages (both frontend button and backend endpoint).',
    },
    {
      key: 'beta-analytics',
      title: 'Beta Analytics & Insights',
      description: 'Experimental telemetry widgets providing predictive user churn modeling.',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <Flag className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-white text-sm">Feature Flags Engine</h3>
            <p className="text-xs text-slate-400">
              Interactive flag toggles evaluated via{' '}
              <code className="text-indigo-300 font-mono">useFeatureFlag()</code> &{' '}
              <code className="text-indigo-300 font-mono">&lt;Feature&gt;</code>
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
          Live Client-Side & Server Synchronization
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {flagsList.map((f) => {
          const isEnabled = Boolean(flags[f.key]);
          return (
            <div
              key={f.key}
              className={`p-4 rounded-lg border transition-all ${
                isEnabled
                  ? 'bg-indigo-950/20 border-indigo-500/30 shadow-sm shadow-indigo-500/5'
                  : 'bg-slate-950/40 border-slate-800 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-indigo-300 font-medium block">
                    {f.key}
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-1">{f.title}</h4>
                </div>

                <button
                  onClick={() => onToggleFlag(f.key)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Toggle feature flag"
                >
                  {isEnabled ? (
                    <ToggleRight className="w-7 h-7 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-2 line-clamp-2">{f.description}</p>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reactive Feature Demonstration Component */}
      <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
        <Feature
          flag="beta-analytics"
          fallback={
            <div className="p-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-lg text-slate-400 flex items-center space-x-2">
              <span className="text-slate-500">Feature Guard Notice:</span>
              <span>
                The <code>beta-analytics</code> widget is currently disabled. Toggle the switch
                above to activate it.
              </span>
            </div>
          }
        >
          <div className="p-3 bg-gradient-to-r from-indigo-950/40 to-blue-950/40 border border-indigo-500/40 rounded-lg text-indigo-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>
                <strong>&lt;Feature flag=&quot;beta-analytics&quot;&gt;:</strong> Beta ML Predictive
                Engine is active!
              </span>
            </div>
            <span className="text-[11px] bg-indigo-500/20 border border-indigo-400/40 px-2 py-0.5 rounded text-indigo-300">
              Live React Render
            </span>
          </div>
        </Feature>
      </div>
    </div>
  );
};
