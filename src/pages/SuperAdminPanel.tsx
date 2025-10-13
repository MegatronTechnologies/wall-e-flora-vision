import { useMemo, useState } from 'react';
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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserPlus, Edit, Trash2, Search, Filter, ArrowUpDown } from 'lucide-react';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Admin' | 'User'>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return mockUsers.filter((user) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [mockUsers, roleFilter, searchTerm]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const dateA = new Date(a.dateCreated).getTime();
      const dateB = new Date(b.dateCreated).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredUsers, sortDirection]);

  const summary = useMemo(() => {
    const total = mockUsers.length;
    const adminCount = mockUsers.filter((user) => user.role === 'Admin').length;
    const userCount = mockUsers.filter((user) => user.role !== 'Admin').length;
    return { total, adminCount, userCount };
  }, [mockUsers]);

  const handleToggleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const roleOptions: Array<'all' | 'Admin' | 'User'> = ['all', 'Admin', 'User'];

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

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">{t('admin.totalUsers')}</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">{t('admin.adminsCount')}</p>
                <p className="text-2xl font-bold text-primary">{summary.adminCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">{t('admin.usersCount')}</p>
                <p className="text-2xl font-bold">{summary.userCount}</p>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.searchPlaceholder')}
                    className="pl-9"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value as 'all' | 'Admin' | 'User')}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t('admin.allRoles')} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === 'all' ? t('admin.allRoles') : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={handleToggleSort}
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortDirection === 'asc' ? t('admin.sortOldest') : t('admin.sortNewest')}
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
                    <TableHead className="hidden sm:table-cell">{t('admin.dateCreated')}</TableHead>
                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {sortedUsers.length > 0 ? (
                      sortedUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
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
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {user.dateCreated}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-secondary hover:text-primary"
                                  aria-label={t('admin.edit')}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('admin.edit')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={t('admin.delete')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('admin.delete')}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </motion.tr>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          {t('admin.emptyState')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TooltipProvider>
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
