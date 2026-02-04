import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const LoginPage = () => {
  const [loginType, setLoginType] = useState<'admin' | 'user' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      
      if (loginType === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Enter your email first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to send reset email');
    }
  };

  if (!loginType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="card-elevated p-5 sm:p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full hero-gradient flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
            </div>
            
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
              Select how you want to login
            </p>

            <div className="grid gap-3 sm:gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-auto py-4 sm:py-6 flex items-center gap-3 sm:gap-4 justify-start px-4 sm:px-6 hover:border-primary hover:bg-primary/5"
                onClick={() => setLoginType('admin')}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-foreground text-sm sm:text-base">Admin Login</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Manage library & members</p>
                </div>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-auto py-4 sm:py-6 flex items-center gap-3 sm:gap-4 justify-start px-4 sm:px-6 hover:border-primary hover:bg-primary/5"
                onClick={() => setLoginType('user')}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-foreground text-sm sm:text-base">Member Login</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">View attendance & fees</p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button 
          onClick={() => setLoginType(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to options
        </button>

        <div className="card-elevated p-5 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full ${loginType === 'admin' ? 'bg-primary/10' : 'bg-accent/20'} flex items-center justify-center mx-auto mb-3 sm:mb-4`}>
              {loginType === 'admin' ? (
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              ) : (
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-accent-foreground" />
              )}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              {loginType === 'admin' ? 'Admin Login' : 'Member Login'}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
              />
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-primary" 
              size="lg"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {loginType === 'user' && (
            <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
              Don't have an account? Contact the library admin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
