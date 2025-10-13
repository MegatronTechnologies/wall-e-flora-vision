import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  AdminUser,
  RoleOption,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from '@/integrations/supabase/admin';
import { UserPlus, Edit, Trash2, Search, Filter, ArrowUpDown, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

const SuperAdminPanel = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<{
    id?: string;
    email: string;
    full_name: string;
    role: RoleOption;
  }>({
    email: '',
    full_name: '',
    role: 'user',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleOption>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [authRequired, setAuthRequired] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    logger.debug('SuperAdminPanel', 'Loading users from Supabase');
    try {
      const result = await fetchAdminUsers();
      setUsers(result);
      setAuthRequired(false);
      logger.info('SuperAdminPanel', `Fetched ${result.length} users`);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
        logger.warn('SuperAdminPanel', 'Authentication required to load users');
        setAuthRequired(true);
      } else {
        logger.error('SuperAdminPanel', 'Failed to load admin users', error);
        toast({
          title: t('common.error', { defaultValue: 'Xəta baş verdi' }),
          description: t('admin.loadError', { defaultValue: 'İstifadəçilər yüklənmədi' }),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    logger.info('SuperAdminPanel', 'Mounting super admin panel');
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, roleFilter, searchTerm]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredUsers, sortDirection]);

  const summary = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((user) => user.role === 'superadmin').length;
    const userCount = users.filter((user) => user.role === 'user').length;
    return { total, adminCount, userCount };
  }, [users]);

  const handleToggleSort = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const roleOptions: Array<'all' | RoleOption> = ['all', 'user', 'superadmin'];

  const resetForm = () => {
    setFormState({
      id: undefined,
      email: '',
      full_name: '',
      role: 'user',
    });
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const openCreateModal = () => {
    logger.debug('SuperAdminPanel', 'Opening create user modal');
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    logger.debug('SuperAdminPanel', 'Opening edit user modal', user.id);
    setFormState({
      id: user.id,
      email: user.email,
      full_name: user.full_name ?? '',
      role: user.role,
    });
    setPassword('');
    setConfirmPassword('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    logger.debug('SuperAdminPanel', formState.id ? 'Updating user' : 'Creating user', formState);
    if (authRequired) {
      logger.warn('SuperAdminPanel', 'Cannot save user without authentication');
      toast({
        title: t('common.error'),
        description: t('admin.authRequired'),
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    if (!formState.id && password.length < 6) {
      logger.warn('SuperAdminPanel', 'Password validation failed');
      toast({
        title: t('common.error'),
        description: t('auth.passwordTooShort'),
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    if (!formState.id && password !== confirmPassword) {
      logger.warn('SuperAdminPanel', 'Password confirmation mismatch');
      toast({
        title: t('common.error'),
        description: t('auth.passwordMismatch'),
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }
    try {
      const payload = {
        email: formState.email.trim(),
        full_name: formState.full_name.trim() || null,
        role: formState.role,
      };

      let updated: AdminUser;
      if (formState.id) {
        updated = await updateAdminUser({ id: formState.id, ...payload });
        setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
        logger.info('SuperAdminPanel', 'User updated', updated.id);
        toast({
          title: t('admin.updateSuccess'),
          description: t('admin.updateSuccessDesc'),
        });
      } else {
        updated = await createAdminUser({ ...payload, password });
        setUsers((prev) => [updated, ...prev]);
        logger.info('SuperAdminPanel', 'User created', updated.id);
        toast({
          title: t('admin.createSuccess'),
          description: t('admin.createSuccessDesc'),
        });
      }

      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      logger.error('SuperAdminPanel', 'Failed to save user', error);
      toast({
        title: t('common.error', { defaultValue: 'Xəta baş verdi' }),
        description: t('admin.saveError'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    logger.warn('SuperAdminPanel', 'Deleting user', deleteTarget.id);
    try {
      if (authRequired) {
        logger.warn('SuperAdminPanel', 'Cannot delete user without authentication');
        toast({
          title: t('common.error'),
          description: t('admin.authRequired'),
          variant: 'destructive',
        });
        setDeleting(false);
        setDeleteTarget(null);
        return;
      }
      await deleteAdminUser(deleteTarget.id);
      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id));
      logger.info('SuperAdminPanel', 'User deleted', deleteTarget.id);
      toast({
        title: t('admin.deleteSuccess'),
        description: t('admin.deleteSuccessDesc'),
      });
    } catch (error) {
      logger.error('SuperAdminPanel', 'Failed to delete user', error);
      toast({
        title: t('common.error', { defaultValue: 'Xəta baş verdi' }),
        description: t('admin.deleteError'),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
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
              
              <Button
                className="bg-primary hover:bg-primary/90 gap-2"
                onClick={openCreateModal}
                disabled={authRequired}
              >
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

            {authRequired && (
              <Card className="border-destructive text-destructive p-4">
                <p className="font-semibold">{t('admin.authRequired')}</p>
                <p className="text-sm text-muted-foreground">{t('admin.authHelp')}</p>
              </Card>
            )}

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
                      disabled={authRequired}
                    />
                  </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value as 'all' | RoleOption)}
                    disabled={authRequired}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t('admin.allRoles')} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option === 'all' ? t('admin.allRoles') : t(`admin.roles.${option}`)}
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
                disabled={authRequired}
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
                    <TableHead>{t('admin.email')}</TableHead>
                    <TableHead>{t('admin.role')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('admin.dateCreated')}</TableHead>
                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('common.loading')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sortedUsers.length > 0 ? (
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
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                user.role === 'superadmin'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {t(`admin.roles.${user.role}`)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-secondary hover:text-primary"
                                  aria-label={t('admin.edit')}
                                  onClick={() => openEditModal(user)}
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
                                  onClick={() => setDeleteTarget(user)}
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

      {/* Create / Edit dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            logger.debug('SuperAdminPanel', 'Closing user form dialog');
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formState.id ? t('admin.editUserTitle') : t('admin.createUserTitle')}
            </DialogTitle>
            <DialogDescription>
              {formState.id ? t('admin.editUserSubtitle') : t('admin.createUserSubtitle')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('admin.email')}</Label>
              <Input
                id="email"
                type="email"
                required
                    value={formState.email}
                    onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                    disabled={saving}
                  />
                </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">{t('admin.fullName')}</Label>
                  <Input
                    id="full_name"
                    value={formState.full_name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, full_name: event.target.value }))}
                    disabled={saving}
                  />
                </div>

            {!formState.id && (
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('admin.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={saving}
                      placeholder={t('admin.passwordPlaceholder')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs uppercase"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={t('admin.togglePassword')}
                    >
                      {showPassword ? t('admin.hide') : t('admin.show')}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">{t('admin.confirmPassword')}</Label>
                  <Input
                    id="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={saving}
                    placeholder={t('admin.passwordPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('admin.passwordHint')}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">{t('admin.role')}</Label>
              <Select
                value={formState.role}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, role: value as RoleOption }))}
                disabled={saving}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={t('admin.role')} />
                </SelectTrigger>
                <SelectContent>
                  {( ['user', 'superadmin'] as RoleOption[] ).map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`admin.roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
                {t('modal.close')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {formState.id ? t('admin.saveChanges') : t('admin.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            logger.debug('SuperAdminPanel', 'Closing delete confirmation dialog');
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.deleteConfirmDesc', { email: deleteTarget?.email ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteTarget(null)}>
              {t('modal.close')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('admin.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminPanel;
