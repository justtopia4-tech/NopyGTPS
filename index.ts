import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { join, dirname, resolve } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

let __dirname: string;
try {
  __dirname = dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}

function findTemplate(): string {
  const candidates = [
    join(__dirname, 'template', 'dashboard.html'),
    join(process.cwd(), 'template', 'dashboard.html'),
    resolve(__dirname, '..', 'template', 'dashboard.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `dashboard.html not found. __dirname=${__dirname}, cwd=${process.cwd()}, tried: ${candidates.join(', ')}`,
  );
}

let __cachedTemplate: string;
function getTemplate(): string {
  if (!__cachedTemplate) __cachedTemplate = findTemplate();
  return __cachedTemplate;
}

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

// @note static files from public folder
app.use(express.static(
  fs.existsSync(join(__dirname, 'public'))
    ? join(__dirname, 'public')
    : join(process.cwd(), 'public')
));

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
 * @note dashboard endpoint - serves login HTML page with client data
 */
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  const body = req.body;
  let clientData = '';

  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    clientData = Object.keys(body)[0];
  }

  const encodedClientData = Buffer.from(clientData).toString('base64');

  const templatePath = getTemplate();
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const htmlContent = templateContent.replace('{{ data }}', encodedClientData);

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

      res.status(200).type('text/plain').send(
        JSON.stringify({
          status: 'success',
          message: 'Account Validated.',
          token,
          url: '',
          accountType: 'growtopia',
        }),
      );
    } catch (error) {
      console.log(`[ERROR]: ${error}`);
      res.status(200).type('text/plain').send(
        JSON.stringify({
          status: 'error',
          message: 'Internal Server Error',
        }),
      );
    }
  },
);

/**
 * @note first checktoken endpoint - redirects to validate endpoint
 */
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

/**
 * @note second checktoken endpoint - validates token and returns updated token
 *
 * FIX: Saat rebuild token setelah refresh, growId & password tetap
 * preserve URL-encoding-nya agar tidak corrupt.
 */
app.all(
  '/player/growid/validate/checktoken',
  async (req: Request, res: Response) => {
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
        res.status(200).type('text/plain').send(
          JSON.stringify({
            status: 'error',
            message: 'Missing refreshToken or clientData',
          }),
        );
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

      res.status(200).type('text/plain').send(
        JSON.stringify({
          status: 'success',
          message: 'Account Validated.',
          token,
          url: '',
          accountType: 'growtopia',
          accountAge: 2,
        }),
      );
    } catch (error) {
      console.log(`[ERROR]: ${error}`);
      res.status(200).type('text/plain').send(
        JSON.stringify({
          status: 'error',
          message: 'Internal Server Error',
        }),
      );
    }
  },
);

app.use((req: Request, res: Response) => {
  console.log(`[404] ${req.method} ${req.path} | headers: ${JSON.stringify(req.headers)}`);
  res.status(404).json({ status: 'error', message: `Not found: ${req.method} ${req.path}` });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
  });
}

export default app;
