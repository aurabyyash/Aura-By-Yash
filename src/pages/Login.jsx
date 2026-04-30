import { useState } from 'react';
import { Eye, EyeOff, LogIn, Mail, Phone, UserPlus, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initialSignup = {
  email: '',
  password: '',
  phone: '',
  username: '',
};

const Login = () => {
  const navigate = useNavigate();
  const { login, signup, resendConfirmation } = useAuth();
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

  return (
    <main className="auth-split-page">
      <section className="auth-showcase">
        <p className="auth-showcase-copy">Aura By Yash authentication for customers and admin.</p>
        <div className="auth-rings">
          <span></span>
          <span></span>
        </div>
        <h1>Wear your<br />Aura.</h1>
        <div className="auth-device">
          <div className="auth-device-screen">
            <img src="/aurabyyash.png" alt="Aura By Yash" />
            <div className="auth-device-bars">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-top">
          <img src="/aura.png" alt="Aura By Yash" />
          <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? <UserPlus size={18} /> : <LogIn size={18} />}
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <div className="auth-form-wrap">
          <p className="section-eyebrow">{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</p>
          <h2>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>

          {mode === 'signin' ? (
            <form className="auth-form" onSubmit={handleSignin}>
              <label>
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Email"
                  value={signinData.email}
                  onChange={event => setSigninData({ ...signinData, email: event.target.value })}
                  required
                />
              </label>

              <label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={signinData.password}
                  onChange={event => setSigninData({ ...signinData, password: event.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              <button className="auth-link" type="button" onClick={handleResend}>Resend confirmation mail</button>

              <button className="auth-submit" type="submit" disabled={submitting}>
                <LogIn size={18} />
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup}>
              <label>
                <UserRound size={18} />
                <input
                  type="text"
                  placeholder="Username"
                  value={signupData.username}
                  onChange={event => setSignupData({ ...signupData, username: event.target.value })}
                  required
                />
              </label>

              <label>
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Email"
                  value={signupData.email}
                  onChange={event => setSignupData({ ...signupData, email: event.target.value })}
                  required
                />
              </label>

              <label>
                <Phone size={18} />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={signupData.phone}
                  onChange={event => setSignupData({ ...signupData, phone: event.target.value })}
                  required
                />
              </label>

              <label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={signupData.password}
                  onChange={event => setSignupData({ ...signupData, password: event.target.value })}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              <button className="auth-submit" type="submit" disabled={submitting}>
                <UserPlus size={18} />
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          {status && <p className="auth-status">{status}</p>}
          {error && <p className="auth-error">{error}</p>}
        </div>
      </section>
    </main>
  );
};

export default Login;
