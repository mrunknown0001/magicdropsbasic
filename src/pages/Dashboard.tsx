import React from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Briefcase, CheckSquare, FileText, 
  TrendingUp, Clock, CalendarClock 
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();

  // Statistikdaten (in einer realen Anwendung würden diese aus der API abgerufen)
  const stats = [
    { 
      title: isAdmin() ? 'Mitarbeiter' : 'Abgeschlossene Aufträge',
      value: isAdmin() ? '24' : '18',
      change: '+12%',
      icon: isAdmin() ? <Users size={20} /> : <CheckSquare size={20} />
    },
    { 
      title: 'Aktive Aufträge',
      value: isAdmin() ? '42' : '3',
      change: '+8%',
      icon: <Briefcase size={20} />
    },
    { 
      title: isAdmin() ? 'Vertragsvorlagen' : 'Dokumente',
      value: isAdmin() ? '8' : '15',
      change: '+2',
      icon: <FileText size={20} />
    },
    { 
      title: isAdmin() ? 'Auftragswert' : 'Stunden diesen Monat',
      value: isAdmin() ? '€12.450' : '64h',
      change: '+22%',
      icon: isAdmin() ? <TrendingUp size={20} /> : <Clock size={20} />
    }
  ];

  // Anstehende Termine/Aufgaben
  const upcomingTasks = [
    { id: 1, title: 'Auftragsabnahme #1082', date: 'Heute, 15:30 Uhr', priority: 'high' },
    { id: 2, title: 'Team-Meeting', date: 'Morgen, 10:00 Uhr', priority: 'medium' },
    { id: 3, title: 'Vertragsunterzeichnung', date: 'Übermorgen, 14:00 Uhr', priority: 'medium' },
    { id: 4, title: 'Schulung', date: '12.07.2025, 09:00 Uhr', priority: 'low' }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Willkommen zurück, {user?.name}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Hier ist ein Überblick über {isAdmin() ? 'Ihr Unternehmen' : 'Ihre Aktivitäten'}.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <CalendarClock className="inline-block mr-1" size={16} />
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {stats.map((stat, index) => (
          <motion.div key={index} variants={item}>
            <Card className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-accent/10 text-accent">
                    {stat.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                      <p className="ml-2 text-sm font-medium text-green-600">{stat.change}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Anstehende Termine</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.ul 
              className="divide-y divide-gray-200 dark:divide-gray-700"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {upcomingTasks.map((task) => (
                <motion.li key={task.id} className="py-3" variants={item}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      task.priority === 'high' ? 'bg-red-500' : 
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{task.date}</p>
                    </div>
                    <button className="text-sm text-accent hover:text-accent/80">Details</button>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isAdmin() ? 'Neueste Aktivitäten' : 'Meine Aufträge'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Platzhalter für Aktivitäts-Feed oder Auftragsübersicht */}
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {isAdmin() 
                  ? 'Hier werden die neuesten Aktivitäten Ihrer Mitarbeiter angezeigt.' 
                  : 'Hier sehen Sie Ihre aktuellen Aufträge und deren Status.'}
              </p>
              <div className="h-48 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">Daten werden geladen...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;