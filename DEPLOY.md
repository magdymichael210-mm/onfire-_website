# Deploy Guide

This project is a Node.js/Express app with a MySQL database.

## Server Requirements

- Ubuntu VPS or any Node.js hosting that supports a persistent Node process
- Node.js 20 LTS or newer
- MySQL 8 or compatible
- Nginx, if you want to connect a domain and HTTPS

## Render Setup

Render can run the Node.js web app directly, but this project uses MySQL and local file uploads.

Recommended Render setup:

- Web Service for the Node.js app
- Private MySQL service on Render, or an external MySQL provider
- Paid Web Service with a Persistent Disk if you need uploaded videos/images to survive redeploys

Free Render web services have an ephemeral filesystem, so files uploaded to `uploads` can disappear after restarts or redeploys.

### Option A: Create From `render.yaml`

1. Push this project to GitHub.
2. In Render, click `New` > `Blueprint`.
3. Select the GitHub repository.
4. Render will read `render.yaml`.
5. Fill the secret environment variables when prompted:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `ADMIN_EMAIL`
6. Create/import the MySQL database separately and run `database.sql`.

### Option B: Manual Web Service

In Render, create `New` > `Web Service`:

- Runtime: `Node`
- Build Command: `npm ci`
- Start Command: `npm start`
- Environment Variables:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `DB_HOST=your_mysql_host`
  - `DB_USER=your_mysql_user`
  - `DB_PASSWORD=your_mysql_password`
  - `DB_NAME=onfire_db`
  - `DB_PORT=3306`
  - `JWT_SECRET=long_random_secret`
  - `ADMIN_EMAIL=admin@example.com`

### MySQL On Render

Render supports MySQL as a private service backed by a Persistent Disk. Create it from Render's MySQL template or as a Docker private service, then use its internal host and port in the web service environment variables.

For this app, `DB_HOST` should be the MySQL private hostname shown by Render, and `DB_PORT` is usually `3306`.

### Uploads On Render

If you keep storing uploads on the server filesystem, add a Persistent Disk to the web service and mount it so uploaded files are preserved. A later code change can move `uploads` to a disk path such as `/var/data/uploads`.

## Files To Upload

Upload the project files except:

- `node_modules`
- `.env`

Keep `uploads` if it already contains user videos/images you want online.

## Production Setup On Ubuntu

```bash
sudo apt update
sudo apt install -y nodejs npm mysql-server nginx
sudo npm install -g pm2
```

Copy the project to the server:

```bash
scp -r ./website user@SERVER_IP:/var/www/website
```

On the server:

```bash
cd /var/www/website
npm ci --omit=dev
cp .env.example .env
nano .env
```

Set the real database password and a long random `JWT_SECRET`.

Create/import the database:

```bash
mysql -u root -p < database.sql
```

Start the app:

```bash
pm2 start server.js --name website
pm2 save
pm2 startup
```

## Nginx Reverse Proxy

Create `/etc/nginx/sites-available/website`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 600M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/website /etc/nginx/sites-enabled/website
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Quick Checks

```bash
pm2 logs website
curl http://127.0.0.1:3000/api/test
```
