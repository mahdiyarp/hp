# ?? HesabPak »—‰«„Â »« „Ê›ﬁ?  ‰’» Ê ¬„«œÂ ‘œ!

## ? ‰’» ‘œÂ:

| „Ê—œ | ‰”ŒÂ | Ê÷⁄?  |
|------|------|-------|
| Python | 3.11.9 | ? ‰’» ‘œ |
| Node.js | 25.2.1 | ? ‰’» ‘œ |
| PostgreSQL | 15 | ? ‰’» Ê «Ã—« ‘œ |
| Git | Latest | ? ‰’» ‘œ |
| Database | hesabpak | ? «?Ã«œ ‘œ |
| Migrations | 33/33 | ?  ò„?· ‘œ |

---

## ?? çêÊ‰Â «Ã—« ò‰„ø

### **—Ê‘ 1: ›ﬁÿ Backend (FastAPI)**

```cmd
Double-click: run-backend-only.bat
```

”Å”:
- ?? API: http://localhost:8000
- ?? Docs: http://localhost:8000/docs

---

### **—Ê‘ 2: ›ﬁÿ Frontend (React)**

```cmd
Double-click: run-frontend-only.bat
```

”Å”:
- ?? Web: http://localhost:3000
- ?? Username: developer
- ?? Password: 09123506545

---

### **—Ê‘ 3: Backend + Frontend ( Ê’?Âù‘œÂ)**

```cmd
Double-click: run-all.bat
```

”Å”:
- ?? Backend: http://localhost:8000
- ?? Frontend: http://localhost:3000
- ?? Docs: http://localhost:8000/docs

---

## ?? ›«?·ùÂ«? «Ã—«??:

| ›«?· |  Ê÷?Õ |
|------|-------|
| `run-backend-only.bat` | FastAPI »— —Ê? port 8000 |
| `run-frontend-only.bat` | React »— —Ê? port 3000 |
| `run-all.bat` | Backend + Frontend |
| `start.bat` | ‘—Ê⁄ ”—?⁄ („ÊÃÊœ) |
| `manage.bat` | „œ?—?  ”—Ê?”ùÂ« |

---

## ?? «ÿ·«⁄«  Database:

```
Host:     localhost
Port:     5432
Database: hesabpak
User:     postgres
Password: postgres
```

---

## ?? «ê— œ” ? «Ã—« ò‰?œ:

### Backend:
```powershell
cd backend
python -m uvicorn app.main:app --reload
```

### Frontend:
```powershell
cd frontend
npm run dev
```

---

## ??? Troubleshooting:

### PostgreSQL ‰»«?œ œ—”  ‘—Ê⁄ ‘Êœø
```powershell
Get-Service postgresql-x64-15 | Start-Service
```

### npm install Œ?·? ”—Ê «” ø
```powershell
cd frontend
npm install --legacy-peer-deps
```

### Port «‘€«· «” ø
```powershell
#  €??— port Backend (»Â Ã«? 8000)
python -m uvicorn app.main:app --port 8001

#  €??— port Frontend
npm run dev -- --port 3001
```

---

## ?? System Info:

```
Installation Path: C:\Users\Mahdi\source\repos\mahdiyarp\hp
Python Path: C:\Users\Mahdi\AppData\Local\Programs\Python\Python311
Node Path: C:\Program Files\nodejs
PostgreSQL: C:\Program Files\PostgreSQL\15
```

---

## ?? »⁄œ?:

1. **run-backend-only.bat** ?« **run-all.bat** —« Double-click ò‰?œ
2. „—Ê—ê— ŒÊœò«— »«“ ‘Êœ
3. »« `developer` / `09123506545` Ê«—œ ‘Ê?œ
4. »—‰«„Â —« «” ›«œÂ ò‰?œ! ??

---

## ?? „‘ò· »Êœø

›«?·ùÂ«? log —« »——”? ò‰?œ:
- Backend logs: Terminal Backend
- Frontend logs: Terminal Frontend
- Database: `C:\Program Files\PostgreSQL\15\data\log`

---

**?  »—?ò! »—‰«„Â ¬„«œÂ «” ! ??**

