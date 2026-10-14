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


def read_tariffs(db):
    return {'revision': db.execute('SELECT revision FROM settings WHERE id=1').fetchone()[0], 'rows': [dict(row) for row in db.execute('SELECT * FROM tariffs ORDER BY method, origin, destination')]}


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
        elif path in ('/api/tariffs', '/api/admin/tariffs'):
            if '/admin/' in path and not self.authorized():
                self.reply(401, {'error': 'Войдите для редактирования.'})
                return
            with connect() as db:
                db.execute('BEGIN')
                self.reply(200, read_tariffs(db))
        else:
            self.reply(404, {'error': 'Страница не найдена.'})

    def do_PUT(self):
        if self.path != '/api/admin/tariffs':
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
            rows = validate(payload)
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                revision = db.execute('SELECT revision FROM settings WHERE id=1').fetchone()[0]
                if payload['revision'] != revision:
                    self.reply(409, {'error': 'Таблица изменена в другой вкладке. Сохраните свои правки отдельно и перезагрузите страницу.'})
                    return
                db.execute('DELETE FROM tariffs')
                db.executemany('INSERT INTO tariffs (method,origin,destination,perKg,perM3,days,deliveryCost,comment) VALUES (:method,:origin,:destination,:perKg,:perM3,:days,:deliveryCost,:comment)', rows)
                db.execute('UPDATE settings SET revision=revision+1 WHERE id=1')
                response = read_tariffs(db)
            self.reply(200, response)
        except (ValueError, json.JSONDecodeError) as exc:
            self.reply(400, {'error': str(exc)})
        except sqlite3.Error:
            self.reply(503, {'error': 'Не удалось сохранить тарифы. Попробуйте ещё раз.'})


if __name__ == '__main__':
    initialize()
    ThreadingHTTPServer(('127.0.0.1', 18120), Handler).serve_forever()
