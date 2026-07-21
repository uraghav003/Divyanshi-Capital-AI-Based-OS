import React, { useState, useEffect } from 'react';
import { 
  Github, 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  RefreshCw, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode2, 
  Send,
  Lock,
  Globe,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface GitStatus {
  branch: string;
  dirty: boolean;
  statusRaw: string;
  commits: Array<{ hash: string; subject: string }>;
  remotes: string;
  config: {
    username: string;
    email: string;
    repoUrl: string;
    hasToken: boolean;
  };
}

export function GitHubIntegration({ user }: { user: any }) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  
  // Config form states
  const [showConfig, setShowConfig] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/git/status');
      const result = await res.json();
      if (result.ok && result.data) {
        setStatus(result.data);
        setUsername(result.data.config.username || user.name || '');
        setEmail(result.data.config.email || user.email || '');
        setRepoUrl(result.data.config.repoUrl || '');
        if (!result.data.config.repoUrl) {
          setShowConfig(true); // Auto expand config if none exists
        }
      } else {
        toast.error('Failed to retrieve Git status.');
      }
    } catch (err: any) {
      console.error('Git status retrieve error:', err);
      toast.error('Could not connect to git local server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('config');
    try {
      const res = await apiFetch('/api/git/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, repoUrl, token })
      });
      const result = await res.json();
      if (result.ok) {
        toast.success('Git remote and credentials saved successfully.');
        setShowConfig(false);
        setToken(''); // clear token input field for security
        fetchStatus();
      } else {
        toast.error(result.error || 'Failed to update configuration.');
      }
    } catch (err: any) {
      toast.error('Error saving git configuration.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePull = async () => {
    setActionLoading('pull');
    try {
      const res = await apiFetch('/api/git/fetch-pull', { method: 'POST' });
      const result = await res.json();
      if (result.ok) {
        toast.success('Successfully synced latest updates from GitHub!');
        fetchStatus();
      } else {
        toast.error(result.error || 'Pull failed. Make sure you have configured correct credentials.');
      }
    } catch (err) {
      toast.error('Network error during pull operation.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCommitPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message.');
      return;
    }
    setActionLoading('push');
    try {
      const res = await apiFetch('/api/git/commit-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage })
      });
      const result = await res.json();
      if (result.ok) {
        toast.success(result.message || 'Committed and pushed to GitHub successfully!');
        setCommitMessage('');
        fetchStatus();
      } else {
        toast.error(result.error || 'Push failed. Please check remote URL or PAT Token.');
      }
    } catch (err) {
      toast.error('Network error during push operation.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 text-white max-w-5xl mx-auto p-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-brand-orange/10 rounded-xl border border-brand-orange/20 text-brand-orange">
            <Github size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans tracking-tight">GitHub Repository Sync</h2>
            <p className="text-xs text-gray-400 font-sans mt-0.5">Push latest updates directly from the live panel and pull recent revisions.</p>
          </div>
        </div>
        
        <div className="flex gap-2.5">
          <Button 
            onClick={fetchStatus} 
            disabled={loading || !!actionLoading}
            variant="outline"
            className="bg-navy-950 hover:bg-navy-900 text-gray-300 border-white/5 rounded-xl text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Check Status
          </Button>
          <Button 
            onClick={() => setShowConfig(!showConfig)}
            variant="outline"
            className={`border-white/5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${showConfig ? 'bg-brand-orange text-navy-950 font-bold border-brand-orange hover:bg-brand-orange/90' : 'bg-navy-950 hover:bg-navy-900 text-gray-300'}`}
          >
            <Settings size={14} />
            Configure Repo
          </Button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="bg-navy-900/60 p-6 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Settings className="text-brand-orange" size={18} />
              <h3 className="font-sans font-bold text-sm">Git & GitHub Remote Setup</h3>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">github-config.json</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Git Username</label>
                <Input 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Upendra Raghav"
                  className="bg-navy-950/80 border-white/5 text-white placeholder-gray-600 rounded-xl focus:border-brand-orange"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Git Email</label>
                <Input 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. u.raghav003@gmail.com"
                  className="bg-navy-950/80 border-white/5 text-white placeholder-gray-600 rounded-xl focus:border-brand-orange"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 flex items-center justify-between">
                <span>Repository URL</span>
                <span className="text-[10px] text-gray-500 font-normal">HTTPS format required</span>
              </label>
              <Input 
                value={repoUrl} 
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="e.g. https://github.com/upendraraghav/divyanshi-capital-crm.git"
                className="bg-navy-950/80 border-white/5 text-white placeholder-gray-600 rounded-xl focus:border-brand-orange"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <Lock size={12} className="text-gold-500" />
                <span>GitHub Personal Access Token (PAT)</span>
              </label>
              <Input 
                type="password"
                value={token} 
                onChange={(e) => setToken(e.target.value)}
                placeholder={status?.config?.hasToken ? "•••••••••••••••••••••••• (Saved. Leave blank to keep current)" : "Paste GitHub PAT token for push/pull permissions"}
                className="bg-navy-950/80 border-white/5 text-white placeholder-gray-600 rounded-xl focus:border-brand-orange"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                Generate a token under your GitHub Settings → Developer Settings → Personal Access Tokens (Classic) with <code className="bg-white/5 px-1 rounded text-gray-300">repo</code> scope enabled to allow pushing directly from this dashboard.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button 
                type="button"
                onClick={() => setShowConfig(false)}
                className="bg-transparent border border-white/5 hover:bg-white/5 text-gray-400 rounded-xl text-xs h-10 px-4"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={actionLoading === 'config'}
                className="bg-brand-orange hover:bg-brand-orange/90 text-navy-950 font-bold rounded-xl text-xs h-10 px-6 flex items-center gap-1.5"
              >
                {actionLoading === 'config' ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Updating Remote...
                  </>
                ) : (
                  'Save & Authorize Remote'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Sync Actions, Changes, Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Repository Meta & Quick Sync actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-navy-900 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm tracking-tight border-b border-white/5 pb-2.5 flex items-center gap-2">
              <GitBranch size={16} className="text-brand-orange" />
              Repository Intel
            </h3>

            {status ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs bg-navy-950 p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 font-sans">Active Branch:</span>
                  <div className="flex items-center gap-1 font-mono text-brand-orange font-bold">
                    <GitBranch size={13} />
                    {status.branch}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-navy-950 p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 font-sans">Remote Server:</span>
                  <div className="font-mono text-gray-300 flex items-center gap-1.5 max-w-[140px] truncate" title={status.config?.repoUrl || 'No remote'}>
                    <Globe size={13} className="text-sky-400" />
                    {status.config?.repoUrl ? status.config.repoUrl.replace('https://github.com/', '') : 'None Set'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-navy-950 p-3 rounded-xl border border-white/5">
                  <span className="text-gray-400 font-sans">Repo State:</span>
                  {status.dirty ? (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} />
                      Uncommitted Changes
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Clean Repo
                    </span>
                  )}
                </div>

                <div className="border-t border-white/5 pt-3.5 space-y-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-medium">Remote Synchronization</p>
                  
                  <Button
                    onClick={handlePull}
                    disabled={!!actionLoading || !status.config.repoUrl}
                    className="w-full h-11 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange font-bold border border-brand-orange/20 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {actionLoading === 'pull' ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        Fetching Updates...
                      </>
                    ) : (
                      <>
                        <GitPullRequest size={15} />
                        Fetch & Pull Latest Updates
                      </>
                    )}
                  </Button>
                  {!status.config.repoUrl && (
                    <p className="text-[10px] text-amber-500 text-center">Please configure a remote repository to sync updates.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-gray-500">
                <RefreshCw className="animate-spin text-brand-orange" size={24} />
                <span className="text-xs">Analyzing workspace...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Local Changes (Diff) & Commit panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Commit & Stage Panel */}
          <div className="bg-navy-900 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm tracking-tight border-b border-white/5 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCode2 size={16} className="text-brand-orange" />
                Workspace Changes & Commit
              </span>
              {status?.dirty && (
                <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  Pending Commit
                </span>
              )}
            </h3>

            {status?.dirty ? (
              <form onSubmit={handleCommitPush} className="space-y-4">
                <div className="bg-navy-950 border border-white/5 rounded-xl p-3 max-h-48 overflow-y-auto">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-2">Modified & Untracked Files</p>
                  <pre className="font-mono text-xs text-amber-400/90 whitespace-pre-wrap leading-relaxed">
                    {status.statusRaw}
                  </pre>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">Commit Message</label>
                  <div className="relative">
                    <Input 
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Describe what changed (e.g. Fixed CRM sync boundary or updated lead pipeline)"
                      className="bg-navy-950 border-white/5 text-white placeholder-gray-600 rounded-xl pr-10 focus:border-brand-orange h-11"
                    />
                    <GitCommit size={16} className="absolute right-3.5 top-3.5 text-gray-500" />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={actionLoading === 'push' || !status.config.repoUrl}
                    className="bg-brand-orange hover:bg-brand-orange/90 text-navy-950 font-sans font-bold rounded-xl text-xs h-11 px-6 flex items-center gap-2 transition-all shadow-md shadow-brand-orange/10"
                  >
                    {actionLoading === 'push' ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        Pushing to Github...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Stage, Commit & Push Updates
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="bg-navy-950/60 rounded-xl border border-white/5 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm">Workspace Perfectly Synchronized</h4>
                  <p className="text-xs text-gray-500 mt-1">There are no modified or untracked files in your workspace. You're up to date!</p>
                </div>
                
                {status?.config?.repoUrl && (
                  <Button
                    onClick={handleCommitPush}
                    disabled={actionLoading === 'push'}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs h-10 px-4 mt-2 inline-flex items-center gap-1.5 font-semibold"
                  >
                    <Send size={13} />
                    Force Remote Push Verification
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Commit History Log */}
          <div className="bg-navy-900 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-sans font-bold text-sm tracking-tight border-b border-white/5 pb-2.5 flex items-center gap-2">
              <GitCommit size={16} className="text-brand-orange" />
              Recent Commit Logs
            </h3>

            {status?.commits && status.commits.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {status.commits.map((commit, index) => (
                  <div key={commit.hash} className="flex items-center gap-3 bg-navy-950/70 hover:bg-navy-950 p-3 rounded-xl border border-white/5 transition-all">
                    <span className="font-mono text-xs text-gold-500 font-bold bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded-md shrink-0">
                      {commit.hash}
                    </span>
                    <span className="text-xs text-gray-300 font-sans truncate" title={commit.subject}>
                      {commit.subject}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No recent commits found or unable to trace history.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
