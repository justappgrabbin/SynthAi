"""Resonance Network social bridge for the supplied Synthia Computer.
Python stdlib + SQLite, no npm/Acode/runtime downloads. Local or LAN test server.
The York v11 resident and world modules are retained intact inside public/index.html.
"""
from __future__ import annotations
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
from contextlib import contextmanager
import time
from datetime import datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

HERE = Path(__file__).resolve().parent
PUBLIC = HERE / 'public'
DATA = Path(os.environ.get('RESONANCE_DATA_DIR', str(HERE / 'data'))).resolve()
MAX_MEDIA = 5 * 1024 * 1024
DB_LOCK = threading.RLock()

def init_database():
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / 'uploads').mkdir(exist_ok=True)
    with db() as con:
        con.executescript('''
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
          salt TEXT NOT NULL, secret TEXT NOT NULL, bio TEXT DEFAULT '', created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(
          token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS posts(
          id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
          kind TEXT NOT NULL, content TEXT NOT NULL, image_url TEXT DEFAULT '',
          project_id INTEGER, hypothesis TEXT DEFAULT '', method TEXT DEFAULT '', created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS comments(
          id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL REFERENCES posts(id),
          user_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS likes(
          user_id INTEGER NOT NULL REFERENCES users(id), post_id INTEGER NOT NULL REFERENCES posts(id),
          PRIMARY KEY(user_id,post_id));
        CREATE TABLE IF NOT EXISTS follows(
          follower_id INTEGER NOT NULL REFERENCES users(id), target_id INTEGER NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL, PRIMARY KEY(follower_id,target_id));
        CREATE TABLE IF NOT EXISTS projects(
          id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL REFERENCES users(id),
          title TEXT NOT NULL, description TEXT NOT NULL, needs TEXT DEFAULT '',
          created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS members(
          project_id INTEGER NOT NULL REFERENCES projects(id), user_id INTEGER NOT NULL REFERENCES users(id),
          joined_at TEXT NOT NULL, PRIMARY KEY(project_id,user_id));
        CREATE TABLE IF NOT EXISTS messages(
          id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER NOT NULL REFERENCES users(id),
          recipient_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS observations(
          id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL REFERENCES posts(id),
          user_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TEXT NOT NULL);
        ''')

@contextmanager
def db():
    con=sqlite3.connect(DATA / 'resonance.sqlite3', timeout=10)
    con.row_factory=sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()

def utcnow(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def public_user(row): return {'id':row['id'],'name':row['name'],'bio':row['bio'] or ''}
def digest_password(password, salt):return hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),240000).hex()
def reject_empty(s, maxlength=3000):
    if not isinstance(s,str) or not s.strip() or len(s)>maxlength: raise ValueError('A valid nonempty value is required')
    return s.strip()

def current_user(handler):
    cookies=SimpleCookie()
    try:cookies.load(handler.headers.get('Cookie',''))
    except Exception:return None
    m=cookies.get('resonance_session')
    if not m:return None
    key=hashlib.sha256(m.value.encode()).hexdigest()
    with db() as con:
        return con.execute('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?', (key,int(time.time()))).fetchone()

class Handler(BaseHTTPRequestHandler):
    server_version='SynthiaResonance/0.1'
    def log_message(self,format,*args):
        if os.environ.get('RESONANCE_VERBOSE'):super().log_message(format,*args)
    def respond(self,code,data,headers=None):
        blob=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(blob)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.end_headers();self.wfile.write(blob)
    def error(self,status,msg):self.respond(status,{'error':msg})
    def read_json(self,limit=1024*1024):
        if 'application/json' not in self.headers.get('Content-Type',''):raise ValueError('Expected JSON')
        length=int(self.headers.get('Content-Length','0'))
        if length<1 or length>limit:raise ValueError('Request size invalid')
        return json.loads(self.rfile.read(length))
    def authenticated(self):
        u=current_user(self)
        if not u:self.error(401,'Sign in to continue')
        return u
    def cookie(self,token,maxage):
        # HttpOnly cookie shared by the Computer and Network on the same origin.
        secure='; Secure' if self.headers.get('X-Forwarded-Proto')=='https' else ''
        return f'resonance_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={maxage}{secure}'
    def do_GET(self):
        path=unquote(urlsplit(self.path).path);qs=parse_qs(urlsplit(self.path).query)
        try:
            if path=='/api/health':return self.respond(200,{'ok':True,'mode':'persistent social + original computer','database':'sqlite'})
            if path=='/api/auth/me':
                u=current_user(self)
                return self.respond(200,{'user':public_user(u) if u else None})
            if path.startswith('/api/'):
                u=self.authenticated()
                if u is None:return
                uid=u['id']
                with DB_LOCK,db() as con:
                    if path=='/api/posts':
                        rows=con.execute('''SELECT p.*,u.name, (SELECT count(*) FROM likes l WHERE l.post_id=p.id) likes,
                          EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=?) liked,
                          (SELECT count(*) FROM comments c WHERE c.post_id=p.id) comments_count
                          FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 100''',(uid,)).fetchall()
                        return self.respond(200,{'posts':[dict(x) for x in rows]})
                    if m:=re.fullmatch(r'/api/posts/(\d+)/comments',path):
                        rows=con.execute('SELECT c.*,u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.id', (int(m[1]),)).fetchall()
                        return self.respond(200,{'comments':[dict(x) for x in rows]})
                    if path=='/api/people':
                        rows=con.execute('SELECT id,name,bio FROM users WHERE id!=? ORDER BY id DESC LIMIT 100',(uid,)).fetchall()
                        following={x[0] for x in con.execute('SELECT target_id FROM follows WHERE follower_id=?',(uid,)).fetchall()}
                        return self.respond(200,{'people':[{**dict(x),'following':x['id'] in following} for x in rows]})
                    if path=='/api/projects':
                        rows=con.execute('''SELECT p.*,u.name owner_name,(SELECT count(*) FROM members m WHERE m.project_id=p.id) members,
                           EXISTS(SELECT 1 FROM members m WHERE m.project_id=p.id AND m.user_id=?) joined FROM projects p
                           JOIN users u ON u.id=p.owner_id ORDER BY p.id DESC''',(uid,)).fetchall()
                        return self.respond(200,{'projects':[dict(x) for x in rows]})
                    if path=='/api/messages':
                        target=int((qs.get('with') or ['0'])[0])
                        rows=con.execute('''SELECT m.*,u.name sender_name FROM messages m JOIN users u ON u.id=m.sender_id
                          WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?) ORDER BY m.id ASC LIMIT 300''',(uid,target,target,uid)).fetchall()
                        return self.respond(200,{'messages':[dict(x) for x in rows]})
                    if m:=re.fullmatch(r'/api/experiments/(\d+)/results',path):
                        rows=con.execute('SELECT o.*,u.name FROM observations o JOIN users u ON u.id=o.user_id WHERE post_id=? ORDER BY id',(int(m[1]),)).fetchall()
                        return self.respond(200,{'results':[dict(x) for x in rows]})
                return self.error(404,'API route not found')
            # Public static files. Never expose data/ or original sources.
            rel=path.lstrip('/') or 'index.html'
            file=(PUBLIC/rel).resolve()
            if not file.is_relative_to(PUBLIC.resolve()) or not file.is_file():return self.error(404,'File not found')
            blob=file.read_bytes()
            content_type=mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
            if file.suffix=='.js':content_type='text/javascript'
            self.send_response(200);self.send_header('Content-Type',content_type);self.send_header('Content-Length',str(len(blob)))
            self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(blob)
        except (ValueError,TypeError,OverflowError) as e:self.error(400,str(e))
        except Exception as e:
            self.error(500,'Server error')
            if os.environ.get('RESONANCE_VERBOSE'):raise
    def do_POST(self):
        path=unquote(urlsplit(self.path).path)
        try:
            if path in ['/api/auth/register','/api/auth/login']:
                data=self.read_json();email=reject_empty(data.get('email',''),254).lower()
                password=reject_empty(data.get('password',''),128)
                if '@' not in email or len(password)<8:raise ValueError('Enter a valid email and a password of at least 8 characters')
                with DB_LOCK,db() as con:
                    if path.endswith('register'):
                        name=reject_empty(data.get('name',''),60);salt=secrets.token_hex(16)
                        try:
                            con.execute('INSERT INTO users (name,email,salt,secret,created_at) VALUES (?,?,?,?,?)', (name,email,salt,digest_password(password,salt),utcnow()))
                        except sqlite3.IntegrityError:return self.error(409,'An account with this email already exists')
                    u=con.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
                    if not u or not hmac.compare_digest(u['secret'],digest_password(password,u['salt'])):return self.error(401,'Wrong email or password')
                    token=secrets.token_urlsafe(32)
                    con.execute('INSERT INTO sessions VALUES (?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),u['id'],int(time.time())+60*60*24*30))
                    return self.respond(200,{'user':public_user(u)},{'Set-Cookie':self.cookie(token,60*60*24*30)})
            if path=='/api/auth/logout':
                cookies=SimpleCookie();cookies.load(self.headers.get('Cookie',''))
                with DB_LOCK,db() as con:
                    if v:=cookies.get('resonance_session'):
                        con.execute('DELETE FROM sessions WHERE token_hash=?',(hashlib.sha256(v.value.encode()).hexdigest(),))
                return self.respond(200,{'ok':True},{'Set-Cookie':self.cookie('',0)})
            u=self.authenticated()
            if u is None:return
            uid=u['id']
            if path=='/api/media':
                media_type=self.headers.get('Content-Type','').split(';')[0]
                if media_type not in ['image/png','image/jpeg','image/webp','image/gif']:return self.error(415,'Please choose PNG, JPEG, GIF or WebP')
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=MAX_MEDIA:return self.error(413,'Image must be 5 MB or smaller')
                content=self.rfile.read(length)
                signatures={'image/png':content.startswith(b'\x89PNG\r\n\x1a\n'),'image/jpeg':content.startswith(b'\xff\xd8\xff'),'image/gif':content.startswith((b'GIF87a',b'GIF89a')),'image/webp':content.startswith(b'RIFF') and content[8:12]==b'WEBP'}
                if not signatures[media_type]:return self.error(415,'Image contents did not match the file type')
                ext={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp'}[media_type]
                filename=secrets.token_hex(15)+'.'+ext
                (DATA/'uploads'/filename).write_bytes(content)
                return self.respond(201,{'url':'/uploads/'+filename})
            data=self.read_json()
            with DB_LOCK,db() as con:
                if path=='/api/posts':
                    kind=data.get('kind','post')
                    if kind not in ('post','project','experiment','request'):raise ValueError('Invalid post type')
                    content=reject_empty(data.get('content',''))
                    image_url=data.get('image_url','')
                    if not isinstance(image_url,str) or (image_url and not re.fullmatch(r'/uploads/[a-f0-9]{30}\.(png|jpg|gif|webp)',image_url)):raise ValueError('Invalid image')
                    hypothesis=str(data.get('hypothesis',''))[:600]
                    method=str(data.get('method',''))[:1200]
                    project_id=None
                    if kind=='project':
                        title=reject_empty(data.get('title',''),100)
                        needs=str(data.get('needs',''))[:250]
                        cursor=con.execute('INSERT INTO projects (owner_id,title,description,needs,created_at) VALUES (?,?,?,?,?)',(uid,title,content,needs,utcnow()))
                        project_id=cursor.lastrowid
                        con.execute('INSERT INTO members VALUES (?,?,?)',(project_id,uid,utcnow()))
                    c=con.execute('INSERT INTO posts(user_id,kind,content,image_url,project_id,hypothesis,method,created_at) VALUES (?,?,?,?,?,?,?,?)',(uid,kind,content,image_url,project_id,hypothesis,method,utcnow()))
                    return self.respond(201,{'post_id':c.lastrowid,'project_id':project_id})
                if m:=re.fullmatch(r'/api/posts/(\d+)/comments',path):
                    pid=int(m[1]);content=reject_empty(data.get('content',''),1000)
                    if not con.execute('SELECT id FROM posts WHERE id=?',(pid,)).fetchone():return self.error(404,'Post not found')
                    c=con.execute('INSERT INTO comments(post_id,user_id,content,created_at) VALUES (?,?,?,?)',(pid,uid,content,utcnow()))
                    return self.respond(201,{'comment_id':c.lastrowid})
                if m:=re.fullmatch(r'/api/posts/(\d+)/like',path):
                    pid=int(m[1]);
                    if not con.execute('SELECT id FROM posts WHERE id=?',(pid,)).fetchone():return self.error(404,'Post not found')
                    old=con.execute('SELECT 1 FROM likes WHERE user_id=? AND post_id=?',(uid,pid)).fetchone()
                    if old:con.execute('DELETE FROM likes WHERE user_id=? AND post_id=?',(uid,pid))
                    else:con.execute('INSERT INTO likes VALUES (?,?)',(uid,pid))
                    return self.respond(200,{'liked':not bool(old)})
                if m:=re.fullmatch(r'/api/users/(\d+)/follow',path):
                    target=int(m[1])
                    if target==uid:raise ValueError('Cannot follow yourself')
                    if not con.execute('SELECT id FROM users WHERE id=?',(target,)).fetchone():return self.error(404,'Person not found')
                    old=con.execute('SELECT 1 FROM follows WHERE follower_id=? AND target_id=?',(uid,target)).fetchone()
                    if old:con.execute('DELETE FROM follows WHERE follower_id=? AND target_id=?',(uid,target))
                    else:con.execute('INSERT INTO follows VALUES (?,?,?)',(uid,target,utcnow()))
                    return self.respond(200,{'following':not bool(old)})
                if m:=re.fullmatch(r'/api/projects/(\d+)/join',path):
                    pid=int(m[1])
                    if not con.execute('SELECT id FROM projects WHERE id=?',(pid,)).fetchone():return self.error(404,'Project not found')
                    con.execute('INSERT OR IGNORE INTO members VALUES (?,?,?)',(pid,uid,utcnow()))
                    return self.respond(200,{'joined':True})
                if path=='/api/messages':
                    target=int(data.get('to',0));content=reject_empty(data.get('content',''),2000)
                    if target==uid or not con.execute('SELECT id FROM users WHERE id=?',(target,)).fetchone():raise ValueError('Choose another registered person')
                    c=con.execute('INSERT INTO messages(sender_id,recipient_id,content,created_at) VALUES (?,?,?,?)',(uid,target,content,utcnow()))
                    return self.respond(201,{'message_id':c.lastrowid})
                if m:=re.fullmatch(r'/api/experiments/(\d+)/results',path):
                    pid=int(m[1]);content=reject_empty(data.get('content',''),1600)
                    if not con.execute("SELECT id FROM posts WHERE id=? AND kind='experiment'",(pid,)).fetchone():return self.error(404,'Experiment not found')
                    c=con.execute('INSERT INTO observations(post_id,user_id,content,created_at) VALUES (?,?,?,?)',(pid,uid,content,utcnow()))
                    return self.respond(201,{'result_id':c.lastrowid})
            return self.error(404,'API route not found')
        except (ValueError,TypeError,OverflowError,json.JSONDecodeError) as e:self.error(400,str(e))
        except Exception as e:
            self.error(500,'Server error')
            if os.environ.get('RESONANCE_VERBOSE'):raise

    # Serve actual uploaded images from the private data directory, not arbitrary files.
    def serve_upload(self,filename):
        if not re.fullmatch('[a-f0-9]{30}\\.(png|jpg|gif|webp)',filename):return self.error(404,'Not found')
        path=DATA/'uploads'/filename
        if not path.is_file():return self.error(404,'Not found')
        blob=path.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(str(path))[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(blob)));self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(blob)

# Wrap GET for media without duplicating API dispatch.
_original_get=Handler.do_GET
def _serve_get(self):
    p=unquote(urlsplit(self.path).path)
    if p.startswith('/uploads/'):return self.serve_upload(p.rsplit('/',1)[-1])
    return _original_get(self)
Handler.do_GET=_serve_get

def serve(host='127.0.0.1',port=8787):
    init_database()
    httpd=ThreadingHTTPServer((host,port),Handler)
    print(f'Synthia Resonance Computer running at http://{host}:{httpd.server_port}',flush=True)
    httpd.serve_forever()

if __name__=='__main__':
    serve(os.environ.get('HOST','127.0.0.1'),int(os.environ.get('PORT','8787')))
