import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en" style="background-color: transparent; width:100%; height: 100%;">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Growtopia Player Support</title>
  <link rel="icon" type="image/svg+xml" href="/animated-logo.svg">
  <link rel="shortcut icon" href="/animated-logo.svg" type="image/svg+xml">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: transparent; min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; position: relative;
    }
    .login-card {
      position: relative; z-index: 1; width: 290px; max-width: 85vw;
      padding: 14px 12px; border-radius: 16px;
      background: rgba(20, 25, 50, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 6px 24px rgba(0,0,0,0.5);
      color: #e8ecf4;
    }
    .login-card::before {
      content: ''; position: absolute; inset: -1px; border-radius: 17px;
      background: linear-gradient(135deg, #00c8ff, #8a2be2, #00c8ff);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      padding: 1px; pointer-events: none; opacity: 0.9;
    }
    .logo-area { text-align: center; margin-bottom: 4px; position: relative; }
    .logo-area img {
      width: 72px; height: 72px; object-fit: contain;
      filter: drop-shadow(0 0 12px rgba(0,180,255,0.6));
    }
    h2 {
      text-align: center; font-size: 0.95rem; font-weight: 600; margin-bottom: 12px;
      letter-spacing: -0.02em; color: #ffffff;
    }
    .form-group { margin-bottom: 8px; }
    label {
      display: block; font-size: 0.68rem; font-weight: 500;
      color: rgba(200,215,240,0.7); margin-bottom: 2px;
      letter-spacing: 0.05em; text-transform: uppercase;
    }
    input[type="text"], input[type="password"], input[type="email"] {
      width: 100%; padding: 6px 9px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 5px; color: #e8ecf4; font-size: 0.78rem;
      outline: none;
    }
    input[type="text"]::placeholder, input[type="password"]::placeholder,
    input[type="email"]::placeholder { color: rgba(200,215,240,0.3); }
    input[type="text"]:focus, input[type="password"]:focus, input[type="email"]:focus {
      border-color: rgba(0,200,255,0.6); background: rgba(255,255,255,0.08);
    }
    .links { display: flex; justify-content: center; gap: 16px; margin: 14px 0 8px; font-size: 0.78rem; }
    .links a {
      color: rgba(120,200,255,0.85); text-decoration: none;
      border-bottom: 1px solid transparent;
    }
    .links a:hover { color: #00d4ff; border-bottom-color: rgba(0,212,255,0.5); }
    .btn-icon {
      display: flex; align-items: center; justify-content: center; gap: 5px;
      width: 100%; padding: 7px 11px; margin-top: 6px;
      background: linear-gradient(135deg, #0088cc, #00bbff);
      border: none; border-radius: 5px; color: #fff;
      font-size: 0.80rem; font-weight: 600; cursor: pointer;
      letter-spacing: 0.02em;
      box-shadow: 0 3px 14px rgba(0,150,255,0.3);
    }
    .btn-icon:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(0,180,255,0.5); }
    .btn-icon:active { transform: translateY(0); opacity: 0.9; }
    .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .ghost-btn {
      width: 100%; padding: 6px 11px; margin-top: 6px;
      background: linear-gradient(135deg, #1a5fad, #2e7dd9);
      border: 1px solid rgba(100,160,255,0.3); border-radius: 5px;
      color: #d0e4ff; font-size: 0.76rem; font-weight: 600; cursor: pointer;
      box-shadow: 0 2px 12px rgba(30,100,200,0.25);
    }
    .ghost-btn:hover {
      transform: translateY(-1px); box-shadow: 0 4px 20px rgba(40,120,240,0.4);
      border-color: rgba(120,180,255,0.5);
    }
    .ghost-btn:active { transform: translateY(0); opacity: 0.9; }
    .hidden { display: none !important; }
    .input-icon { position: relative; }
    .input-icon svg:not(.toggle-pw) {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      width: 15px; height: 15px;
      color: rgba(0,200,255,0.6); pointer-events: none;
    }
    .input-icon input { padding-left: 32px; padding-right: 32px; }
    .toggle-pw {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      width: 15px; height: 15px; pointer-events: auto; cursor: pointer;
      color: rgba(0,200,255,0.6);
    }
    .toggle-pw:hover {
      color: rgba(0,220,255,1);
    }
    .input-icon:focus-within svg {
      color: rgba(0,220,255,1);
    }
    .title-icon {
      display: inline-flex; align-items: center;
      justify-content: center; gap: 8px;
    }
    .title-icon svg {
      width: 20px; height: 20px;
      filter: drop-shadow(0 0 8px rgba(0,200,255,0.6));
    }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 10px 0; }
  </style>
</head>
<body>
  <button type="button" class="hidden" id="modalButton" data-toggle="modal" data-target="#modalShow"
    data-backdrop="static" data-keyboard="false"></button>
  <iframe name="loginFrame" style="display:none"></iframe>
  <div class="login-card">
    <h2 id="sectionTitle"><span class="title-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> SURVIVAL DASHBOARD</span></h2>
    <div class="form-wrapper">
      <form method="POST" id="loginForm" action="/player/growid/login/validate" accept-charset="UTF-8" role="form" autocomplete="off" target="loginFrame">
        <input name="_token" type="hidden" value="{{ data }}">
        <div class="form-group">
          <label for="login-name">Growtopia Name</label>
          <div class="input-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input id="login-name" required placeholder="Your Growtopia Name" name="growId" type="text"
              pattern="[A-Za-z0-9]+" title="Only letters and numbers are allowed">
          </div>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input id="password" required placeholder="Your Growtopia Password" name="password" type="password"
              pattern="[A-Za-z0-9@._!\\-#$]+"
              title="Only letters, numbers, and @ . _ ! - # $ are allowed">
            <svg class="toggle-pw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="button" tabindex="0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>
        <button type="submit" class="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Log in
        </button>
        <button type="button" id="toggleRegister" class="btn-icon ghost-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Register Account
        </button>
      </form>
      <form method="POST" id="registerForm" action="/player/growid/login/validate"
        accept-charset="UTF-8" class="hidden" role="form" autocomplete="off" target="loginFrame">
        <input name="_token" type="hidden" value="{{ data }}">
        <div class="form-group">
          <label for="register-name">Growtopia Name</label>
          <div class="input-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input id="register-name" required placeholder="Your Growtopia Name" name="growId" type="text"
              pattern="[A-Za-z0-9]+" title="Only letters and numbers are allowed">
          </div>
        </div>
        <div class="form-group">
          <label for="register-email">Email</label>
          <div class="input-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <input id="register-email" required placeholder="Your Email" name="email" type="email">
          </div>
        </div>
        <div class="form-group">
          <label for="register-password">Password</label>
          <div class="input-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input id="register-password" required placeholder="Your Growtopia Password" name="password" type="password"
              pattern="[A-Za-z0-9@._!\\-#$]+"
              title="Only letters, numbers, and @ . _ ! - # $ are allowed">
            <svg class="toggle-pw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="button" tabindex="0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>
        <div class="form-group">
          <label for="register-confirm-password">Confirm Password</label>
          <div class="input-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <input id="register-confirm-password" required placeholder="Confirm Password" name="password_confirmation" type="password"
              pattern="[A-Za-z0-9@._!\\-#$]+"
              title="Only letters, numbers, and @ . _ ! - # $ are allowed">
            <svg class="toggle-pw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="button" tabindex="0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>
        <button type="submit" class="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Register
        </button>
        <button type="button" id="toggleLogin" class="btn-icon ghost-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Login
        </button>
      </form>
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      const toggleRegister = document.getElementById('toggleRegister');
      const toggleLogin = document.getElementById('toggleLogin');
      const sectionTitle = document.getElementById('sectionTitle');
      const loginSubmitButton = loginForm.querySelector('button[type="submit"]');
      const loginNameInput = document.getElementById('login-name');
      const passwordInput = document.getElementById('password');
      let registerAutoSubmitting = false;
      const buildAutoRegisterForm = () => {
        const tokenInput = loginForm.querySelector('input[name="_token"]');
        const tokenValue = tokenInput ? tokenInput.value : '';
        const autoForm = document.createElement('form');
        autoForm.method = 'POST';
        autoForm.action = '/player/growid/login/validate';
        autoForm.acceptCharset = 'UTF-8';
        autoForm.autocomplete = 'off';
        autoForm.target = 'loginFrame';
        autoForm.style.display = 'none';
        autoForm.innerHTML =
          '<input name="_token" type="hidden" value="' + tokenValue + '">' +
          '<input name="growId" type="hidden" value="">' +
          '<input name="password" type="hidden" value="">' +
          '<input name="email" type="hidden" value="">' +
          '<input name="password_confirmation" type="hidden" value="">';
        document.body.appendChild(autoForm);
        return autoForm;
      };
      toggleRegister.addEventListener('click', function (e) {
        e.preventDefault();
        if (registerAutoSubmitting) return;
        registerAutoSubmitting = true;
        sectionTitle.innerHTML = '<span class="title-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Registering...</span>';
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        const autoForm = buildAutoRegisterForm();
        autoForm.submit();
      });
      toggleLogin.addEventListener('click', function (e) {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        sectionTitle.innerHTML = '<span class="title-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> SURVIVAL DASHBOARD</span>';
      });
      loginNameInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^A-Za-z0-9]/g, '');
      });
      passwordInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^A-Za-z0-9@._!\\-#$]/g, '');
      });
      loginForm.addEventListener('submit', function (e) {
        if (loginSubmitButton.disabled) { e.preventDefault(); return false; }
        loginSubmitButton.disabled = true;
        loginSubmitButton.textContent = 'Logging in...';
      });
      const eyeOpen = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      const eyeClosed = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
      document.querySelectorAll('.toggle-pw').forEach(function (btn) {
        const input = btn.previousElementSibling;
        btn.addEventListener('click', function () {
          if (input.type === 'password') { input.type = 'text'; btn.innerHTML = eyeClosed; }
          else { input.type = 'password'; btn.innerHTML = eyeOpen; }
        });
      });
      const registerSubmitButton = registerForm.querySelector('button[type="submit"]');
      const registerNameInput = document.getElementById('register-name');
      const registerPasswordInput = document.getElementById('register-password');
      const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
      if (registerNameInput) {
        registerNameInput.addEventListener('input', function () {
          this.value = this.value.replace(/[^A-Za-z0-9]/g, '');
        });
      }
      if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', function () {
          this.value = this.value.replace(/[^A-Za-z0-9@._!\\-#$]/g, '');
        });
      }
      if (registerConfirmPasswordInput) {
        registerConfirmPasswordInput.addEventListener('input', function () {
          this.value = this.value.replace(/[^A-Za-z0-9@._!\\-#$]/g, '');
        });
      }
      if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
          if (registerAutoSubmitting) return;
          if (registerSubmitButton && registerSubmitButton.disabled) { e.preventDefault(); return false; }
          if (registerPasswordInput && registerConfirmPasswordInput &&
              registerPasswordInput.value !== registerConfirmPasswordInput.value) {
            e.preventDefault(); alert('Passwords do not match!'); return false;
          }
          if (registerSubmitButton) {
            registerSubmitButton.disabled = true;
            registerSubmitButton.textContent = 'Registering...';
          }
        });
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'F12') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && e.key === 'I') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && e.key === 'J') e.preventDefault();
      if (e.ctrlKey && e.key === 'U') e.preventDefault();
    });
  </script>
</body>
</html>`;

const app = express();
const PORT = 3000;

// @note trust proxy - set to number of proxies in front of app
app.set('trust proxy', 1);

// @note middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// @note rate limiter - 50 requests per minute (skip on Vercel - edge proxy makes all IPs identical)
const limiter = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
});
if (!process.env.VERCEL) app.use(limiter);

// @note static files from public folder (animated-logo, assets)
app.use(express.static('public'));

// @note request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket.remoteAddress ||
    'unknown';
  console.log(
    `[REQ] ${req.method} ${req.path} → ${clientIp} | ${_res.statusCode}`,
  );
  next();
});

// @note root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, world!');
});

/**
 * @note dashboard endpoint - serves inlined login HTML page with client data
 */
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  const body = req.body;
  let clientData = '';

  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    clientData = Object.keys(body)[0];
  }

  const encodedClientData = Buffer.from(clientData).toString('base64');
  const htmlContent = DASHBOARD_HTML.split('{{ data }}').join(encodedClientData);

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

/**
 * @note validate login endpoint - validates GrowID credentials
 *
 * FIX: growId dan password sekarang di-encodeURIComponent() sebelum
 * dimasukkan ke dalam token string. Ini mencegah karakter seperti
 * @, ., _, !, - merusak parsing URL di sisi GTPS game server,
 * yang menyebabkan password terbaca salah/salah password.
 */
app.all(
  '/player/growid/login/validate',
  async (req: Request, res: Response) => {
    try {
      const formData = req.body as Record<string, string>;
      const _token = formData._token ?? '';
      const growId = formData.growId ?? '';
      const password = formData.password ?? '';
      const email = formData.email ?? '';

      // @note FIX: encode growId dan password agar karakter spesial
      // tidak merusak query string saat di-decode di game server
      const encodedGrowId = encodeURIComponent(growId);
      const encodedPassword = encodeURIComponent(password);
      const encodedEmail = encodeURIComponent(email);

      let token = '';

      if (email) {
        token = Buffer.from(
          `_token=${_token}&growId=${encodedGrowId}&password=${encodedPassword}&email=${encodedEmail}&reg=1`,
        ).toString('base64');
      } else {
        token = Buffer.from(
          `_token=${_token}&growId=${encodedGrowId}&password=${encodedPassword}&reg=0`,
        ).toString('base64');
      }

      console.log(`[LOGIN] GrowID: ${growId} | Token built successfully`);

      res.status(200).header('Content-Type', 'application/json').send(JSON.stringify({
        status: 'success',
        message: 'Account Validated.',
        token,
        url: '',
        accountType: 'growtopia',
      }));
    } catch (error) {
      console.log(`[ERROR]: ${error}`);
      res.status(200).header('Content-Type', 'application/json').send(JSON.stringify({
        status: 'error',
        message: 'Internal Server Error',
      }));
    }
  },
);

const handleCheckToken = async (req: Request, res: Response) => {
    try {
      let refreshToken: string | undefined;
      let clientData: string | undefined;
      let source = 'empty';

      const contentType = req.headers['content-type'] || '';

      if (typeof req.body === 'object' && req.body !== null) {
        const formData = req.body as Record<string, string>;

        if ('refreshToken' in formData || 'clientData' in formData) {
          refreshToken = formData.refreshToken;
          clientData = formData.clientData;
          source = contentType.includes('application/json')
            ? 'json/object'
            : 'form-urlencoded';
        } else if (Object.keys(formData).length === 1) {
          const rawPayload = Object.keys(formData)[0];
          const params = new URLSearchParams(rawPayload);
          refreshToken = params.get('refreshToken') || undefined;
          clientData = params.get('clientData') || undefined;

          if (refreshToken || clientData) {
            source = 'single-key-form-payload';
          }
        }
      } else if (typeof req.body === 'string' && req.body.length > 0) {
        const params = new URLSearchParams(req.body);
        refreshToken = params.get('refreshToken') || undefined;
        clientData = params.get('clientData') || undefined;
        source = 'string/body-parser';
      }

      if (
        (!refreshToken || !clientData) &&
        req.readable &&
        !req.readableEnded
      ) {
        const rawBody = await new Promise<string>((resolve, reject) => {
          let rawPayload = '';
          req.on('data', (chunk: Buffer | string) => {
            rawPayload += chunk.toString();
          });
          req.on('end', () => resolve(rawPayload));
          req.on('error', reject);
        });

        if (rawBody) {
          const params = new URLSearchParams(rawBody);
          refreshToken = params.get('refreshToken') || refreshToken;
          clientData = params.get('clientData') || clientData;

          if (refreshToken || clientData) {
            source = 'raw-stream';
          }
        }
      }

      console.log(`[CHECKTOKEN] Parsed as ${source}`);

      if (!refreshToken || !clientData) {
        console.log(`[ERROR]: Missing refreshToken or clientData`);
        res.status(200).header('Content-Type', 'application/json').send(JSON.stringify({
          status: 'error',
          message: 'Missing refreshToken or clientData',
        }));
        return;
      }

      let decodedRefreshToken = Buffer.from(refreshToken, 'base64').toString(
        'utf-8',
      );

      // @note remove &reg=0/1 from decodedRefreshToken if available
      if (decodedRefreshToken.includes('&reg=0')) {
        decodedRefreshToken = decodedRefreshToken.replace('&reg=0', '');
      } else if (decodedRefreshToken.includes('&reg=1')) {
        decodedRefreshToken = decodedRefreshToken.replace('&reg=1', '');
      }

      const token = Buffer.from(
        decodedRefreshToken.replace(
          /(_token=)[^&]*/,
          `$1${Buffer.from(clientData).toString('base64')}`,
        ),
      ).toString('base64');

      res.status(200).header('Content-Type', 'application/json').send(JSON.stringify({
        status: 'success',
        message: 'Account Validated.',
        token,
        url: '',
        accountType: 'growtopia',
        accountAge: 2,
      }));
    } catch (error) {
      console.log(`[ERROR]: ${error}`);
      res.status(200).header('Content-Type', 'application/json').send(JSON.stringify({
        status: 'error',
        message: 'Internal Server Error',
      }));
    }
  }
};

app.all('/player/growid/checktoken', handleCheckToken);
app.all('/player/growid/validate/checktoken', handleCheckToken);

app.use((req: Request, res: Response) => {
  console.log(`[404] ${req.method} ${req.path} | headers: ${JSON.stringify(req.headers)}`);
  res.status(200).header('Content-Type', 'application/json').send(JSON.stringify({
    status: 'error',
    message: `Not found: ${req.method} ${req.path}`,
  }));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
  });
}

export default app;
