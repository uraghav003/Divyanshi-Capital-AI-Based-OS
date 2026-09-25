import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpDown, 
  Filter, 
  Plus, 
  Search, 
  Trash2, 
  Tag, 
  Sparkles, 
  CheckSquare, 
  Circle,
  X,
  User,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface DashboardTask {
  id: string;
  title: string;
  client: string;
  priority: PriorityLevel;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
  category: string;
  createdAt: string;
}

const DEFAULT_TASKS: DashboardTask[] = [
  {
    id: 'TASK-101',
    title: 'Urgent Income & Bank Verification for Sai Boutique OD 20L',
    client: 'Sai Boutique (Ref Aman)',
    priority: 'High',
    status: 'In Progress',
    dueDate: 'Today, 4:00 PM',
    assignedTo: 'Rahul Verma (DC015)',
    category: 'Loan Disbursal',
    createdAt: '2026-07-26T08:00:00Z'
  },
  {
    id: 'TASK-102',
    title: 'Obtain CIBIL Dispute Resolution for Loan #L0092',
    client: 'Rajesh Sharma',
    priority: 'High',
    status: 'Pending',
    dueDate: 'Today, 6:00 PM',
    assignedTo: 'Priya Singh (DC018)',
    category: 'Credit & CIBIL',
    createdAt: '2026-07-26T09:30:00Z'
  },
  {
    id: 'TASK-103',
    title: 'Follow-up with HDFC Bank RM regarding LAP Sanction Letter',
    client: 'Kapil Enterprises',
    priority: 'Medium',
    status: 'In Progress',
    dueDate: 'Tomorrow, 11:00 AM',
    assignedTo: 'Aman Deep (DC022)',
    category: 'Bank RM Coordination',
    createdAt: '2026-07-25T14:15:00Z'
  },
  {
    id: 'TASK-104',
    title: 'Collect GST Returns & 3 Years ITR for Business Loan',
    client: 'Grover Motors',
    priority: 'Medium',
    status: 'Pending',
    dueDate: 'Tomorrow, 3:00 PM',
    assignedTo: 'Vikram Malhotra (DC012)',
    category: 'Document Collection',
    createdAt: '2026-07-25T16:00:00Z'
  },
  {
    id: 'TASK-105',
    title: 'Archive Closed Disbursal Files for Q2 Audit',
    client: 'Internal Compliance',
    priority: 'Low',
    status: 'Completed',
    dueDate: 'Jul 28, 2026',
    assignedTo: 'Staff Ops',
    category: 'Audit & Records',
    createdAt: '2026-07-24T10:00:00Z'
  },
  {
    id: 'TASK-106',
    title: 'Send Digital Business Card Links to New Intake Leads',
    client: 'Marketing Intake Batch #44',
    priority: 'Low',
    status: 'Pending',
    dueDate: 'Jul 29, 2026',
    assignedTo: 'Neha Gupta (DC031)',
    category: 'Customer Onboarding',
    createdAt: '2026-07-26T07:45:00Z'
  }
];

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  High: 1,
  Medium: 2,
  Low: 3
};

export function TaskPriorityQueue() {
  const [tasks, setTasks] = useState<DashboardTask[]>(() => {
    try {
      const stored = localStorage.getItem('dc_dashboard_tasks');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load tasks from local storage", e);
    }
    return DEFAULT_TASKS;
  });

  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'priority-desc' | 'priority-asc' | 'date-newest' | 'title'>('priority-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('High');
  const [newCategory, setNewCategory] = useState('Loan Processing');
  const [newDueDate, setNewDueDate] = useState('Today, 5:00 PM');
  const [newAssignedTo, setNewAssignedTo] = useState('Self / Assigned Team');

  useEffect(() => {
    try {
      localStorage.setItem('dc_dashboard_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.warn("Failed to save tasks to local storage", e);
    }
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Task title is required');
      return;
    }

    const newTask: DashboardTask = {
      id: `TASK-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle.trim(),
      client: newClient.trim() || 'General Intake',
      priority: newPriority,
      status: 'Pending',
      dueDate: newDueDate || 'Today',
      assignedTo: newAssignedTo || 'Staff Ops',
      category: newCategory || 'Operations',
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    toast.success('Task Added', {
      description: `"${newTask.title}" set with ${newTask.priority} Priority.`
    });

    // Reset Form
    setNewTitle('');
    setNewClient('');
    setNewPriority('High');
    setIsAddModalOpen(false);
  };

  const handleStatusToggle = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus: TaskStatus = t.status === 'Completed' ? 'Pending' : t.status === 'Pending' ? 'In Progress' : 'Completed';
        toast.info(`Task status updated to ${nextStatus}`);
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handlePriorityChange = (id: string, newP: PriorityLevel) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        toast.success(`Priority updated to ${newP}`, {
          description: `Task "${t.title}" reordered in priority queue.`
        });
        return { ...t, priority: newP };
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.error('Task removed from queue');
  };

  // Filter & Sort Logic
  const filteredAndSortedTasks = tasks
    .filter(task => {
      // Priority filter
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
      // Status filter
      if (statusFilter !== 'All' && task.status !== statusFilter) return false;
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          task.client.toLowerCase().includes(q) ||
          task.category.toLowerCase().includes(q) ||
          task.assignedTo.toLowerCase().includes(q) ||
          task.id.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority-desc') {
        // High (1) -> Medium (2) -> Low (3)
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      if (sortBy === 'priority-asc') {
        // Low (3) -> Medium (2) -> High (1)
        return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // date-newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const highCount = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;
  const mediumCount = tasks.filter(t => t.priority === 'Medium' && t.status !== 'Completed').length;
  const lowCount = tasks.filter(t => t.priority === 'Low' && t.status !== 'Completed').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  return (
    <Card className="border-none shadow-sm rounded-3xl p-6 bg-white dark:bg-navy-900 flex flex-col">
      <CardHeader className="px-0 pt-0 pb-6 border-b border-gray-100 dark:border-navy-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-sans font-bold flex items-center gap-2 dark:text-white">
                <Tag className="text-brand-orange" size={20} />
                Task Priority & Dispatch Queue
              </CardTitle>
              <Badge variant="outline" className="rounded-lg bg-orange-50 dark:bg-brand-orange/10 text-brand-orange border-none font-mono text-[10px] font-bold">
                {tasks.length} Total
              </Badge>
            </div>
            <CardDescription className="dark:text-gray-400 mt-1">
              State-based priority filtering and importance-based sorting engine
            </CardDescription>
          </div>

          {/* Quick Add Button */}
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-navy-900 hover:bg-navy-800 dark:bg-white dark:text-navy-900 text-white rounded-2xl h-10 px-4 font-bold text-xs gap-2 shadow-sm shrink-0"
          >
            <Plus size={16} />
            New Priority Task
          </Button>
        </div>

        {/* Priority Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <button 
            onClick={() => setPriorityFilter(priorityFilter === 'High' ? 'All' : 'High')}
            className={cn(
              "p-3 rounded-2xl border transition-all text-left flex items-center justify-between",
              priorityFilter === 'High' 
                ? "bg-rose-50 dark:bg-rose-500/20 border-rose-500 ring-2 ring-rose-500/20" 
                : "bg-gray-50/50 dark:bg-navy-950/50 border-gray-100 dark:border-navy-800 hover:border-rose-300"
            )}
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={12} /> High Priority
              </p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{highCount}</p>
            </div>
            <span className="text-xs text-rose-500 font-mono font-bold">P1</span>
          </button>

          <button 
            onClick={() => setPriorityFilter(priorityFilter === 'Medium' ? 'All' : 'Medium')}
            className={cn(
              "p-3 rounded-2xl border transition-all text-left flex items-center justify-between",
              priorityFilter === 'Medium' 
                ? "bg-amber-50 dark:bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/20" 
                : "bg-gray-50/50 dark:bg-navy-950/50 border-gray-100 dark:border-navy-800 hover:border-amber-300"
            )}
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Clock size={12} /> Medium Priority
              </p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{mediumCount}</p>
            </div>
            <span className="text-xs text-amber-500 font-mono font-bold">P2</span>
          </button>

          <button 
            onClick={() => setPriorityFilter(priorityFilter === 'Low' ? 'All' : 'Low')}
            className={cn(
              "p-3 rounded-2xl border transition-all text-left flex items-center justify-between",
              priorityFilter === 'Low' 
                ? "bg-emerald-50 dark:bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/20" 
                : "bg-gray-50/50 dark:bg-navy-950/50 border-gray-100 dark:border-navy-800 hover:border-emerald-300"
            )}
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Layers size={12} /> Low Priority
              </p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{lowCount}</p>
            </div>
            <span className="text-xs text-emerald-500 font-mono font-bold">P3</span>
          </button>

          <button 
            onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'All' : 'Completed')}
            className={cn(
              "p-3 rounded-2xl border transition-all text-left flex items-center justify-between",
              statusFilter === 'Completed' 
                ? "bg-blue-50 dark:bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/20" 
                : "bg-gray-50/50 dark:bg-navy-950/50 border-gray-100 dark:border-navy-800 hover:border-blue-300"
            )}
          >
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Completed
              </p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{completedCount}</p>
            </div>
            <span className="text-xs text-blue-500 font-mono font-bold">Done</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-0 pt-6 space-y-4">
        {/* Filter and Controls Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/70 dark:bg-navy-950/40 p-3 rounded-2xl border border-gray-100 dark:border-navy-850">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search tasks by title, client, or assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-xl pl-9 pr-3 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange dark:text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-xl px-2.5 h-9">
              <Filter size={14} className="text-gray-400" />
              <span className="text-[10px] font-mono text-gray-400 uppercase">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | 'All')}
                className="bg-transparent text-xs font-bold text-gray-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="All" className="dark:bg-navy-900">All Priorities</option>
                <option value="High" className="dark:bg-navy-900 text-rose-600 font-bold">High (P1)</option>
                <option value="Medium" className="dark:bg-navy-900 text-amber-600 font-bold">Medium (P2)</option>
                <option value="Low" className="dark:bg-navy-900 text-emerald-600 font-bold">Low (P3)</option>
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-xl px-2.5 h-9">
              <CheckSquare size={14} className="text-gray-400" />
              <span className="text-[10px] font-mono text-gray-400 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'All')}
                className="bg-transparent text-xs font-bold text-gray-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="All" className="dark:bg-navy-900">All Statuses</option>
                <option value="Pending" className="dark:bg-navy-900">Pending</option>
                <option value="In Progress" className="dark:bg-navy-900">In Progress</option>
                <option value="Completed" className="dark:bg-navy-900">Completed</option>
              </select>
            </div>

            {/* Sort Order Dropdown */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-800 rounded-xl px-2.5 h-9">
              <ArrowUpDown size={14} className="text-brand-orange" />
              <span className="text-[10px] font-mono text-gray-400 uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-gray-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="priority-desc" className="dark:bg-navy-900">Highest Importance First</option>
                <option value="priority-asc" className="dark:bg-navy-900">Lowest Importance First</option>
                <option value="date-newest" className="dark:bg-navy-900">Newest Created</option>
                <option value="title" className="dark:bg-navy-900">Title A-Z</option>
              </select>
            </div>

            {/* Reset Filters Button if Active */}
            {(priorityFilter !== 'All' || statusFilter !== 'All' || searchQuery.trim() !== '') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPriorityFilter('All');
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
                className="h-9 px-2.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Task List Render */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedTasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center bg-gray-50/50 dark:bg-navy-950/30 rounded-2xl border border-dashed border-gray-200 dark:border-navy-800 p-6"
              >
                <Tag size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No tasks match your filter criteria</p>
                <p className="text-xs text-gray-400 mt-1">Try switching priority tabs or clearing your search filters.</p>
              </motion.div>
            ) : (
              filteredAndSortedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group",
                    task.status === 'Completed' 
                      ? "bg-gray-50/60 dark:bg-navy-950/40 border-gray-100 dark:border-navy-850 opacity-75"
                      : task.priority === 'High'
                      ? "bg-white dark:bg-navy-900 border-rose-200 dark:border-rose-900/40 hover:shadow-md hover:border-rose-300"
                      : task.priority === 'Medium'
                      ? "bg-white dark:bg-navy-900 border-amber-200 dark:border-amber-900/40 hover:shadow-md hover:border-amber-300"
                      : "bg-white dark:bg-navy-900 border-gray-100 dark:border-navy-800 hover:shadow-md hover:border-emerald-300"
                  )}
                >
                  {/* Left: Checkbox & Main Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleStatusToggle(task.id)}
                      title={`Mark as ${task.status === 'Completed' ? 'Pending' : 'Completed'}`}
                      className="mt-0.5 shrink-0 text-gray-400 hover:text-emerald-500 transition-colors"
                    >
                      {task.status === 'Completed' ? (
                        <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle size={20} className="hover:text-emerald-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        <Badge className={cn(
                          "rounded-md border-none font-mono text-[9px] font-black uppercase tracking-wider py-0.5 px-2",
                          task.priority === 'High' ? "bg-rose-500 text-white shadow-sm shadow-rose-500/20" :
                          task.priority === 'Medium' ? "bg-amber-500 text-white" :
                          "bg-emerald-500 text-white"
                        )}>
                          {task.priority === 'High' && <AlertTriangle size={10} className="mr-1 inline" />}
                          {task.priority} Priority
                        </Badge>

                        {/* Status Badge */}
                        <Badge variant="outline" className={cn(
                          "rounded-md border-none text-[9px] font-bold py-0.5 px-2 font-mono",
                          task.status === 'Completed' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
                          task.status === 'In Progress' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" :
                          "bg-gray-100 dark:bg-navy-800 text-gray-500"
                        )}>
                          {task.status}
                        </Badge>

                        {/* Category */}
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                          &bull; {task.category}
                        </span>
                      </div>

                      <h4 className={cn(
                        "font-bold text-sm text-gray-900 dark:text-white leading-snug",
                        task.status === 'Completed' && "line-through text-gray-400 dark:text-gray-500"
                      )}>
                        {task.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          <User size={12} className="text-gray-400" />
                          <strong className="text-gray-700 dark:text-gray-300">{task.client}</strong>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock size={12} className="text-gray-400" />
                          Due: {task.dueDate}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          Assignee: {task.assignedTo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 border-gray-100 dark:border-navy-800">
                    {/* Change Priority Quick Dropdown */}
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-lg px-2 py-1">
                      <span className="text-[9px] font-mono text-gray-400 uppercase">Set Priority:</span>
                      <select
                        value={task.priority}
                        onChange={(e) => handlePriorityChange(task.id, e.target.value as PriorityLevel)}
                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
                      >
                        <option value="High" className="dark:bg-navy-900 text-rose-600 font-bold">High</option>
                        <option value="Medium" className="dark:bg-navy-900 text-amber-600 font-bold">Medium</option>
                        <option value="Low" className="dark:bg-navy-900 text-emerald-600 font-bold">Low</option>
                      </select>
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="rounded-lg h-8 w-8 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-navy-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-navy-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-navy-800 pb-4">
              <div className="flex items-center gap-2">
                <Tag className="text-brand-orange" size={20} />
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create Priority Task</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4 pt-2">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  Task Description / Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verify Income Docs for OD 20 LAC"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-2 h-10 text-xs font-bold text-gray-800 dark:text-white focus:ring-1 focus:ring-brand-orange"
                  >
                    <option value="High" className="text-rose-600 font-bold">High Priority (P1)</option>
                    <option value="Medium" className="text-amber-600 font-bold">Medium Priority (P2)</option>
                    <option value="Low" className="text-emerald-600 font-bold">Low Priority (P3)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Loan Disbursal"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                  Client / Lead Info
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sai Boutique / Rajesh Kumar"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                    Due Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Today, 5:00 PM"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Verma (DC015)"
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-navy-950 border border-gray-200 dark:border-navy-800 rounded-xl px-3 h-10 text-xs focus:ring-1 focus:ring-brand-orange dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl h-11 border-gray-200 dark:border-navy-800"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl h-11 font-bold shadow-lg shadow-brand-orange/20"
                >
                  Add Task
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </Card>
  );
}
