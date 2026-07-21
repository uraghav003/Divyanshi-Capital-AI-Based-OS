import { apiFetch } from "@/lib/api";
import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { 
  Bell, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Clock,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/types';

export function GenieAlerts() {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await apiFetch("/api/dc/query-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "genie_alerts" }) });
        const result = await res.json();
        if (result.ok) {
          setAlerts(result.data || []);
        }
      } catch (err) {
        console.error("Failed to load alerts", err);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur opacity-40 animate-pulse"></div>
              <Bell className="w-8 h-8 text-orange-500 relative z-10" />
            </div>
            <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">Genie Alerts</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-2 ml-11">Proactive intelligence and system notifications</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card className="bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl border-gray-100 dark:border-navy-800 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 dark:bg-navy-800 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-blue-500 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Loading Alerts...</h3>
              <p className="text-gray-500 dark:text-gray-400">Genie is fetching your latest notifications.</p>
            </CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card className="bg-white/50 dark:bg-navy-900/50 backdrop-blur-xl border-gray-100 dark:border-navy-800 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 dark:bg-navy-800 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
              <p className="text-gray-500 dark:text-gray-400">Genie has no active alerts for you right now.</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert, index) => (
             <motion.div
              key={alert.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-gray-100 dark:border-navy-800">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className={cn(
                      "w-full md:w-2"
                    )} />
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{alert.title}</h3>
                        </div>
                        <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.timestamp || "Just now"}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
