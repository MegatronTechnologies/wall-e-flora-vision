import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Edit, Trash2 } from 'lucide-react';

const SuperAdminPanel = () => {
  const { t } = useTranslation();

  const mockUsers = [
    {
      id: 'U001',
      name: 'Aydın Sulxayev',
      email: 'aydin@megtech.az',
      role: 'Admin',
      dateCreated: '2024-12-01',
    },
    {
      id: 'U002',
      name: 'Nihat Muradli',
      email: 'nihat@megtech.az',
      role: 'Admin',
      dateCreated: '2024-12-01',
    },
    {
      id: 'U003',
      name: 'Test User',
      email: 'test@example.com',
      role: 'User',
      dateCreated: '2025-01-10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-bold">{t('admin.title')}</h1>
              
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <UserPlus className="h-5 w-5" />
                {t('admin.create')}
              </Button>
            </div>

            {/* Users Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-secondary/50">
                    <TableHead>{t('admin.userId')}</TableHead>
                    <TableHead>{t('admin.name')}</TableHead>
                    <TableHead>{t('admin.email')}</TableHead>
                    <TableHead>{t('admin.role')}</TableHead>
                    <TableHead>{t('admin.dateCreated')}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="hover:bg-secondary/30"
                    >
                      <TableCell className="font-mono font-semibold text-primary">
                        {user.id}
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'Admin'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.dateCreated}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-secondary hover:text-primary"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
