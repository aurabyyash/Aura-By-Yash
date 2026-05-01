import { useState } from 'react';
import { Eye, EyeOff, Mail, Phone, UserPlus, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initialSignup = {
  email: '',
  password: '',
  phone: '',
  username: '',
};

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithProvider, signup, resendConfirmation } = useAuth();
  const [mode, setMode] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [signinData, setSigninData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState(initialSignup);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignin = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setSubmitting(true);

    try {
      const user = await login(signinData);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setSubmitting(true);

    try {
      const result = await signup(signupData);
      setSignupData(initialSignup);

      if (result.session) {
        navigate('/');
        return;
      }

      setStatus('Confirmation mail sent. Confirm your email to unlock checkout.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setStatus('');
    setSubmitting(true);

    try {
      await resendConfirmation(signupData.email || signinData.email);
      setStatus('Confirmation mail sent again.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProviderLogin = (provider) => {
    setError('');
    setStatus(`Redirecting to ${provider === 'google' ? 'Google' : 'Apple'}...`);

    try {
      loginWithProvider(provider);
    } catch (err) {
      setError(err.message);
      setStatus('');
    }
  };

  return (
    <main className="auth-ride-page">
      <header className="auth-ride-header">
        <Link to="/" className="auth-ride-brand">Aura</Link>
      </header>

      <section className="auth-ride-shell">
        <div className="auth-ride-card">
          <div className="auth-ride-mode">
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Login</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
          </div>

          <h1>{mode === 'signin' ? "What's your phone number or email?" : 'Create your Aura account'}</h1>

          {mode === 'signin' ? (
            <form className="auth-ride-form" onSubmit={handleSignin}>
              <label className="auth-ride-field">
                <span>Email or phone</span>
                <input
                  type="text"
                  placeholder="Enter phone number or email"
                  value={signinData.email}
                  onChange={event => setSigninData({ ...signinData, email: event.target.value })}
                  required
                />
              </label>

              <label className="auth-ride-field auth-password-field">
                <span>Password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={signinData.password}
                  onChange={event => setSigninData({ ...signinData, password: event.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              <button className="auth-ride-submit" type="submit" disabled={submitting}>
                {submitting ? 'Continuing...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form className="auth-ride-form" onSubmit={handleSignup}>
              <label className="auth-ride-field">
                <span>Username</span>
                <UserRound size={18} />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={signupData.username}
                  onChange={event => setSignupData({ ...signupData, username: event.target.value })}
                  required
                />
              </label>

              <label className="auth-ride-field">
                <span>Email</span>
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Enter email"
                  value={signupData.email}
                  onChange={event => setSignupData({ ...signupData, email: event.target.value })}
                  required
                />
              </label>

              <label className="auth-ride-field">
                <span>Phone</span>
                <Phone size={18} />
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={signupData.phone}
                  onChange={event => setSignupData({ ...signupData, phone: event.target.value })}
                  required
                />
              </label>

              <label className="auth-ride-field auth-password-field">
                <span>Password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create password"
                  value={signupData.password}
                  onChange={event => setSignupData({ ...signupData, password: event.target.value })}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              <button className="auth-ride-submit" type="submit" disabled={submitting}>
                <UserPlus size={18} />
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="auth-ride-divider"><span>or</span></div>

          <button className="auth-social-btn" type="button" onClick={() => handleProviderLogin('google')}>
            <span className="auth-google-mark">G</span>
            Continue with Google
          </button>
          <button className="auth-social-btn" type="button" onClick={() => handleProviderLogin('apple')}>
            <span className="auth-apple-mark">A</span>
            Continue with Apple
          </button>

          {mode === 'signin' && (
            <button className="auth-ride-link" type="button" onClick={handleResend}>
              Resend confirmation mail
            </button>
          )}

          <p className="auth-ride-legal">
            By continuing, you agree to Aura By Yash account messages, order updates, and checkout verification.
          </p>

          {status && <p className="auth-status">{status}</p>}
          {error && <p className="auth-error">{error}</p>}
        </div>
      </section>
    </main>
  );
};

export default Login;
