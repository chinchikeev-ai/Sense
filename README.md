# Sense

Static delivery website with a Python standard-library tariff API and SQLite storage.

Public site: `https://93.115.17.58/Sense/`.
Internal tariff editor: `https://93.115.17.58/Sense/admin.html` (HTTP Basic authentication over HTTPS).

## Pricing

Each delivery method and origin/destination pair has separate RUB/kg and RUB/m³ rates and a delivery time. The calculator shows weight × RUB/kg and volume × RUB/m³, using the larger available amount as a preliminary estimate. Empty rates display “По запросу”. No fixed fee is added. Initial values are approximate: the previous demo constants 112 RUB/kg and 167 × 112 + 4400 RUB/m³, adjusted by city and delivery-method factors. Replace them with commercial rates in the editor.

## VPS layout

- Website: `/var/www/sense/current`, symlink to an immutable release directory.
- API: `/opt/sense/api/server.py`, service `sense-tariffs.service`, listening on `127.0.0.1:18120`.
- Database: `/var/lib/sense/tariffs.sqlite`. Keep this directory when updating the site; it contains edited tariffs.
- Authentication: `/etc/sense/admin.json` (PBKDF2-SHA256 hash, user, salt, iterations). Credentials are never committed.
- Nginx: `/etc/nginx/sites-available/sense-ip`; certificate: `/etc/letsencrypt/live/sense-ip/`.

The API seeds 60 demo routes only when the database has never been initialized. Editing replaces the table in a transaction and uses a revision number to reject concurrent overwrites. Back up the database using SQLite's backup API before administrative changes or server maintenance.

The website assets are `index.html`, `calculator.html`, `order.html`, `app.js`, `style.css`, `hero.jpg`, `admin.html`, and `admin.js`. Deploy `server.py` separately from the public website root. Restart the API after updating its source; activate the website release after the API starts successfully. Existing certbot scheduling and the Nginx reload hook renew the IP certificate automatically.
