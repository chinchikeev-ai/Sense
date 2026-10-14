"""Sense tariff API. Run behind nginx on localhost; persist data outside releases."""
import base64
import hashlib
import hmac
import json
import math
import os
import sqlite3
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DATABASE = os.environ.get('SENSE_DATABASE', '/var/lib/sense/tariffs.sqlite')
AUTH = json.loads(Path(os.environ.get('SENSE_AUTH', '/etc/sense/admin.json')).read_text())
ORIGIN = os.environ.get('SENSE_ORIGIN', 'https://93.115.17.58')
METHODS = {'auto', 'rail', 'sea20', 'sea40'}
METHOD_DEFAULTS = [
    ('auto', 'Авто', 'Автомобильная доставка', 'Перевозка груза автомобильным транспортом из Китая в Россию. Маршрут согласуется под ваш груз.', ''),
    ('rail', 'ЖД', 'Железнодорожная доставка', 'Перевозка груза по железной дороге. Станции и доставка до получателя согласуются при расчёте.', ''),
    ('sea20', 'Море 20', 'Морская доставка — Море 20', 'Перевозка груза морем в 20-футовом контейнере. Порт и дальнейшая доставка подбираются под ваш маршрут.', ''),
    ('sea40', 'Море 40', 'Морская доставка — Море 40', 'Перевозка груза морем в 40-футовом контейнере. Порт и дальнейшая доставка подбираются под ваш маршрут.', ''),
]


@contextmanager
def connect():
    db = sqlite3.connect(DATABASE, timeout=15)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    Path(DATABASE).parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS delivery_methods (id TEXT PRIMARY KEY, label TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, comment TEXT NOT NULL)')
        method_fields_added = False
        method_columns = {row['name'] for row in db.execute('PRAGMA table_info(delivery_methods)')}
        for name, definition in [('days', "TEXT NOT NULL DEFAULT ''"), ('totalWeight', 'REAL'), ('totalVolume', 'REAL')]:
            if name not in method_columns:
                db.execute(f'ALTER TABLE delivery_methods ADD COLUMN {name} {definition}')
                method_fields_added = True
        db.executemany('INSERT OR IGNORE INTO delivery_methods (id,label,title,description,comment) VALUES (?,?,?,?,?)', METHOD_DEFAULTS)
        db.execute('INSERT OR IGNORE INTO settings VALUES (2,1)')
        if method_fields_added:
            db.execute('UPDATE settings SET revision=revision+1 WHERE id=2')
        db.execute('CREATE TABLE IF NOT EXISTS tariffs (method TEXT NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL, perKg REAL, perM3 REAL, days TEXT NOT NULL, PRIMARY KEY(method, origin, destination))')
        if 'deliveryCost' not in {row['name'] for row in db.execute('PRAGMA table_info(tariffs)')}:
            db.execute('ALTER TABLE tariffs ADD COLUMN deliveryCost REAL')
            db.execute('UPDATE settings SET revision=revision+1 WHERE id=1')
        if 'comment' not in {row['name'] for row in db.execute('PRAGMA table_info(tariffs)')}:
            db.execute("ALTER TABLE tariffs ADD COLUMN comment TEXT NOT NULL DEFAULT ''")
            db.execute("UPDATE tariffs SET comment='Срок: ' || CASE WHEN days='' THEN 'по согласованию' ELSE days || ' дней' END || '; вес: от 250 кг; объём: от 1 м³.'")
            db.execute('UPDATE settings SET revision=revision+1 WHERE id=1')
        if db.execute('SELECT revision FROM settings WHERE id=1').fetchone() is None:
            cities = [('Гуанчжоу', 1), ('Иу', .97), ('Шэньчжэнь', 1.05), ('Шанхай', 1.02)]
            destinations = [('Москва', 1), ('Краснодар', 1.1), ('Санкт-Петербург', 1.07), ('Новосибирск', .93), ('Челябинск', .96)]
            methods = [('auto', 1, '18–25'), ('rail', .9, '25–35'), ('sea20', .8, '35–50'), ('sea40', .8, '35–50')]
            for method, factor, days in methods:
                for origin, origin_factor in cities:
                    for destination, destination_factor in destinations:
                        multiplier = factor * origin_factor * destination_factor
                        db.execute('INSERT INTO tariffs (method,origin,destination,perKg,perM3,days,comment) VALUES (?,?,?,?,?,?,?)', (method, origin, destination, round(112 * multiplier, 2), round((167 * 112 + 4400) * multiplier, 2), days, f'Срок: {days} дней; вес: от 250 кг; объём: от 1 м³.'))
            db.execute('INSERT INTO settings VALUES (1,1)')
        if db.execute("SELECT 1 FROM tariffs WHERE method='sea' LIMIT 1").fetchone():
            for method in ('sea20', 'sea40'):
                db.execute("INSERT OR IGNORE INTO tariffs (method,origin,destination,perKg,perM3,days,deliveryCost,comment) SELECT ?,origin,destination,perKg,perM3,days,deliveryCost,comment FROM tariffs WHERE method='sea'", (method,))
            db.execute("DELETE FROM tariffs WHERE method='sea'")
            db.execute('UPDATE settings SET revision=revision+1 WHERE id=1')
        if method_fields_added:
            db.execute("UPDATE delivery_methods SET days=COALESCE((SELECT MIN(days) FROM tariffs WHERE method=delivery_methods.id),'') WHERE days=''")


def read_tariffs(db):
    return {'revision': db.execute('SELECT revision FROM settings WHERE id=1').fetchone()[0], 'rows': [dict(row) for row in db.execute('SELECT * FROM tariffs ORDER BY method, origin, destination')], 'methods': read_methods(db)['rows']}


def read_methods(db):
    return {'revision': db.execute('SELECT revision FROM settings WHERE id=2').fetchone()[0], 'rows': [dict(db.execute('SELECT * FROM delivery_methods WHERE id=?', (item[0],)).fetchone()) for item in METHOD_DEFAULTS]}


def validate_methods(payload):
    rows = payload.get('rows')
    if type(payload.get('revision')) is not int or not isinstance(rows, list) or len(rows) != len(METHODS):
        raise ValueError('Заполните все способы доставки.')
    result, seen = [], set()
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get('id'), str) or row['id'] not in METHODS or row['id'] in seen:
            raise ValueError('Проверьте способы доставки.')
        clean = {'id': row['id']}
        for key, limit in [('label', 40), ('title', 120), ('description', 2000), ('comment', 1000), ('days', 100)]:
            value = row.get(key, '')
            if not isinstance(value, str) or len(value) > limit or any(ord(c) < 32 and c not in '\n\r' for c in value):
                raise ValueError('Проверьте длину и содержание текстов.')
            clean[key] = value.strip()
        if not clean['label'] or not clean['title']:
            raise ValueError('Название и заголовок обязательны.')
        for key in ('totalWeight', 'totalVolume'):
            value = row.get(key)
            if value is not None and (type(value) not in (float, int) or not math.isfinite(value) or not 0 <= value <= 1000000000):
                raise ValueError('Общая масса и объём должны быть неотрицательными числами или пустыми.')
            clean[key] = value
        seen.add(row['id'])
        result.append(clean)
    return result


def validate(payload):
    rows = payload.get('rows')
    if type(payload.get('revision')) is not int or not isinstance(rows, list) or not 1 <= len(rows) <= 2000:
        raise ValueError('Нужны версия таблицы и от 1 до 2000 строк.')
    result, seen = [], set()
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get('method'), str) or row.get('method') not in METHODS:
            raise ValueError('Неизвестный тип доставки.')
        clean = {'method': row['method']}
        for key in ('origin', 'destination', 'days'):
            value = row.get(key, '')
            if not isinstance(value, str) or len(value) > 100 or any(ord(c) < 32 for c in value):
                raise ValueError('Проверьте названия городов и срок доставки.')
            clean[key] = value.strip()
        if not clean['origin'] or not clean['destination']:
            raise ValueError('Заполните оба города.')
        comment = row.get('comment', '')
        if not isinstance(comment, str) or len(comment) > 1000 or any(ord(c) < 32 and c not in '\n\r' for c in comment):
            raise ValueError('Комментарий должен быть текстом не длиннее 1000 символов.')
        clean['comment'] = comment.strip()
        for key in ('perKg', 'perM3', 'deliveryCost'):
            value = row.get(key)
            if value is not None and (type(value) not in (float, int) or not math.isfinite(value) or not 0 <= value <= 100000000):
                raise ValueError('Ставки должны быть неотрицательными числами или пустыми.')
            clean[key] = None if value is None else round(value, 2)
        unique = (clean['method'], clean['origin'], clean['destination'])
        if unique in seen:
            raise ValueError('Для одного типа доставки и маршрута допускается только одна строка.')
        seen.add(unique)
        result.append(clean)
    return result


class Handler(BaseHTTPRequestHandler):
    server_version = 'Sense'

    def reply(self, status, payload=None):
        content = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else b''
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        if status == 401:
            self.send_header('WWW-Authenticate', 'Basic realm="Sense tariffs", charset="UTF-8"')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def authorized(self):
        try:
            scheme, encoded = self.headers.get('Authorization', '').split(' ', 1)
            if scheme.lower() != 'basic':
                return False
            user, password = base64.b64decode(encoded, validate=True).decode().split(':', 1)
            digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(AUTH['salt']), AUTH['iterations']).hex()
            return hmac.compare_digest(user.encode(), AUTH['user'].encode()) and hmac.compare_digest(digest, AUTH['hash'])
        except (ValueError, UnicodeError):
            return False

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path == '/api/auth':
            self.reply(200 if self.authorized() else 401)
        elif path in ('/api/tariffs', '/api/admin/tariffs', '/api/methods', '/api/admin/methods'):
            if '/admin/' in path and not self.authorized():
                self.reply(401, {'error': 'Войдите для редактирования.'})
                return
            with connect() as db:
                db.execute('BEGIN')
                self.reply(200, read_methods(db) if path.endswith('/methods') else read_tariffs(db))
        else:
            self.reply(404, {'error': 'Страница не найдена.'})

    def do_PUT(self):
        if self.path not in ('/api/admin/tariffs', '/api/admin/methods'):
            self.reply(404)
            return
        if not self.authorized():
            self.reply(401, {'error': 'Войдите для редактирования.'})
            return
        if self.headers.get('Origin') not in (None, ORIGIN):
            self.reply(403, {'error': 'Недопустимый источник запроса.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 512000:
                raise ValueError('Слишком большой запрос.')
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Некорректные данные.')
            editing_methods = self.path.endswith('/methods')
            rows = validate_methods(payload) if editing_methods else validate(payload)
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                settings_id = 2 if editing_methods else 1
                revision = db.execute('SELECT revision FROM settings WHERE id=?', (settings_id,)).fetchone()[0]
                if payload['revision'] != revision:
                    self.reply(409, {'error': 'Таблица изменена в другой вкладке. Сохраните свои правки отдельно и перезагрузите страницу.'})
                    return
                if editing_methods:
                    db.executemany('UPDATE delivery_methods SET label=:label,title=:title,description=:description,comment=:comment,days=:days,totalWeight=:totalWeight,totalVolume=:totalVolume WHERE id=:id', rows)
                else:
                    db.execute('DELETE FROM tariffs')
                    db.executemany('INSERT INTO tariffs (method,origin,destination,perKg,perM3,days,deliveryCost,comment) VALUES (:method,:origin,:destination,:perKg,:perM3,:days,:deliveryCost,:comment)', rows)
                db.execute('UPDATE settings SET revision=revision+1 WHERE id=?', (settings_id,))
                response = read_methods(db) if editing_methods else read_tariffs(db)
            self.reply(200, response)
        except (ValueError, json.JSONDecodeError) as exc:
            self.reply(400, {'error': str(exc)})
        except sqlite3.Error:
            self.reply(503, {'error': 'Не удалось сохранить тарифы. Попробуйте ещё раз.'})


if __name__ == '__main__':
    initialize()
    ThreadingHTTPServer(('127.0.0.1', 18120), Handler).serve_forever()
