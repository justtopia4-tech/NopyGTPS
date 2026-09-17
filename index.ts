import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// @note trust proxy - set to number of proxies in front of app
app.set('trust proxy', 1);

// @note middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// @note rate limiter - 50 requests per minute
const limiter = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
});
app.use(limiter);

// @note static files from public folder
app.use(express.static(path.join(process.cwd(), 'public')));

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
 * @note dynamically load server list from candidate config paths in real-time
 * checks both game server database config and local dashboard config,
 * prioritizing the most recently modified file so changes in config.json are instant.
 */
function getServerList(): Array<{ name: string; port: number }> {
  const candidatePaths = [
    path.join(process.cwd(), '..', 'MagicalPS', 'MagicalPS', 'Core', 'x64', 'Release', 'database', 'config.json'),
    path.join(process.cwd(), '..', 'MagicalPS', 'Core', 'x64', 'Release', 'database', 'config.json'),
    path.join(process.cwd(), '..', 'Core', 'x64', 'Release', 'database', 'config.json'),
    path.join(process.cwd(), '..', 'Release', 'database', 'config.json'),
    'C:\\Users\\Administrator\\Downloads\\MagicalPS\\MagicalPS\\Core\\x64\\Release\\database\\config.json',
    path.join(process.cwd(), 'database', 'config.json'),
    path.join(process.cwd(), '..', 'database', 'config.json'),
    path.join(process.cwd(), 'config.json'),
  ];

  const existingFiles: Array<{ path: string; mtime: number }> = [];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        existingFiles.push({ path: p, mtime: stat.mtimeMs });
      }
    } catch {
      // ignore
    }
  }

  // Sort by newest modified time
  existingFiles.sort((a, b) => b.mtime - a.mtime);

  for (const item of existingFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(item.path, 'utf-8'));
      const servers = parsed.SERVERS || parsed.servers;
      if (Array.isArray(servers) && servers.length > 0) {
        // Automatically keep local config.json in sync if another config was newer
        const localConfigPath = path.join(process.cwd(), 'config.json');
        if (path.resolve(item.path) !== path.resolve(localConfigPath) && fs.existsSync(localConfigPath)) {
          try {
            fs.writeFileSync(localConfigPath, JSON.stringify({ servers }, null, 2), 'utf-8');
          } catch {}
        }
        return servers;
      }
    } catch {
      // ignore
    }
  }

  return [
    { name: 'Glow', port: 55000 },
    { name: 'MarioPS', port: 17091 },
    { name: 'NexusPS', port: 17092 },
  ];
}

/**
 * @note api endpoint to inspect servers in real time
 */
app.get('/api/servers', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    servers: getServerList(),
  });
});

/**
 * @note dashboard endpoint - serves login HTML page with client data
 * @param req - express request with optional body data
 * @param res - express response
 */
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  const body = req.body;
  let clientData = '';

  // @note body comes as { "key1|val1\nkey2|val2\n...": "" }
  // @note the actual data is in the first key, pipe-delimited with \n separators
  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    clientData = Object.keys(body)[0];
  }

  // @note convert clientData to base64 string without JSON quotes
  const encodedClientData = Buffer.from(clientData).toString('base64');

  // @note read dashboard template and replace placeholder
  const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');

  // @note read server list dynamically in real-time
  const serverList = getServerList();
  const defaultServer = serverList.length > 0 ? serverList[0].name : '';
  const exampleNames = serverList.map((s) => s.name).slice(0, 2).join(', ');
  const serverPlaceholder = `Nama Server${exampleNames ? ` (contoh: ${exampleNames})` : ''} *`;

  const serverDatalistHtml = serverList
    .map(
      (s) =>
        `<option value="${s.name}">`,
    )
    .join('\n');

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  let htmlContent = templateContent
    .replace('{{ data }}', encodedClientData)
    .replaceAll('{{ defaultServer }}', defaultServer)
    .replaceAll('{{ serverPlaceholder }}', serverPlaceholder)
    .replaceAll('{{ serverDatalist }}', serverDatalistHtml);

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

/**
 * @note validate login endpoint - validates GrowID credentials
 * @param req - express request with growId, password, _token
 * @param res - express response with token
 */
app.all(
  '/player/growid/login/validate',
  async (req: Request, res: Response) => {
    try {
      const formData = req.body as Record<string, string>;
      const _token = formData._token;
      const growId = formData.growId;
      const password = formData.password;
      const email = formData.email;
      const serverList = getServerList();
      const defaultServer = serverList.length > 0 ? serverList[0].name : '1';
      const server = formData.server || defaultServer;

      let token = '';
      if (email) {
        token = Buffer.from(
          `_token=${_token}&growId=${growId}&password=${password}&email=${email}&server=${server}&reg=1`,
        ).toString('base64');
      } else {
        token = Buffer.from(
          `_token=${_token}&growId=${growId}&password=${password}&server=${server}&reg=0`,
        ).toString('base64');
      }

      res.send(
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
      res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
      });
    }
  },
);

/**
 * @note first checktoken endpoint - redirects to validate endpoint
 * @param req - express request with refreshToken and clientData
 * @param res - express response with updated token
 */
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

/**
 * @note second checktoken endpoint - validates token and returns updated token
 * @param req - express request with refreshToken and clientData
 * @param res - express response with updated token
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
        res.status(200).json({
          status: 'error',
          message: 'Missing refreshToken or clientData',
        });
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

      res.send(
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
      res.status(200).json({
        status: 'error',
        message: 'Internal Server Error',
      });
    }
  },
);

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
