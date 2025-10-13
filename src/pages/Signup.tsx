import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/Navbar';
import { Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    logger.info('SignupPage', 'Rendered signup page');
  }, []);

  const handleSignup = (event: React.FormEvent) => {
    event.preventDefault();
    logger.debug('SignupPage', 'Attempting signup', { email });

    if (!name || !email || !password) {
      logger.warn('SignupPage', 'Missing signup fields', { nameProvided: Boolean(name), emailProvided: Boolean(email) });
      toast({
        title: t('common.error'),
        description: t('auth.signupMissing', { defaultValue: 'Bütün sahələri doldurun.' }),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      logger.warn('SignupPage', 'Password too short');
      toast({
        title: t('common.error'),
        description: t('auth.passwordTooShort', { defaultValue: 'Parol ən azı 6 simvoldan ibarət olmalıdır.' }),
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.info('SignupPage', 'Signup successful, redirecting to dashboard', email);
      navigate('/dashboard');
    } catch (error) {
      logger.error('SignupPage', 'Unexpected error while signing up', error);
      toast({
        title: t('common.error'),
        description: t('auth.genericError', { defaultValue: 'Something went wrong while logging in.' }),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Bot className="h-16 w-16 text-primary mx-auto" />
              </motion.div>
              <h1 className="text-3xl font-bold">{t('signup')}</h1>
              <p className="text-muted-foreground">Join Wall-E</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('contact.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border-border focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('contact.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border focus:border-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                {t('signup')}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                {t('login')}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
