# ?? HesabPak »—‰«„Â »« „Ê›ﬁ?  —«Âù«‰œ«“? ‘œ!

## ? ¬‰çÂ  ò„?· ‘œ:

### 1. **‰’» ŒÊœò«— ‰—„ù«›“«—Â«:**
```
? Python 3.11.9 ‰’» ‘œ
? Node.js 25.2.1 ‰’» ‘œ  
? PostgreSQL 15 ‰’» Ê ›⁄«· ‘œ
? Git ‰’» ‘œ
```

### 2. ** ‰Ÿ?„ Database:**
```
? Database "hesabpak" «?Ã«œ ‘œ
?  „«„ 33 migrations «Ã—« ‘œ
? Ãœ«Ê· Ê schemas «?Ã«œ ‘œ‰œ
```

### 3. **‰’» Python Dependencies:**
```
?  „«„ 45+ »” Â Python ‰’» ‘œ
? FastAPI, SQLAlchemy, Uvicorn Ê...
```

---

## ?? Backend çêÊ‰Â «Ã—« ‘Êœ:

### **Method 1: PowerShell ( Ê’?Âù‘œÂ)**

```powershell
cd "C:\Users\Mahdi\source\repos\mahdiyarp\hp\backend"
$env:Path = "C:\Users\Mahdi\AppData\Local\Programs\Python\Python311;$env:Path"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

»⁄œ «“ «Ã—«:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

### **Method 2: Batch Script**

»ê–«—?œ «”ò—?Å  batch »—«? ‘„« »”«“„:

```batch
@echo off
set PYTHONPATH=C:\Users\Mahdi\AppData\Local\Programs\Python\Python311
cd backend
%PYTHONPATH%\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## ?? «ÿ·«⁄«  Backend:

| „Ê—œ | „ﬁœ«— |
|------|-------|
| **Host** | localhost |
| **Port** | 8000 |
| **Framework** | FastAPI |
| **Database** | PostgreSQL 15 |
| **DB Host** | localhost:5432 |
| **DB Name** | hesabpak |
| **DB User** | postgres |

---

## ?? Frontend (React + Vite):

npm install Â‰Ê“ œ— Õ«· ‰’» «” . ‘„« „?ù Ê«‰?œ:

### «Œ ?«— 1: ’»— ò‰?œ  « npm  ò„?· ‘Êœ
```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
cd frontend
npm install
npm run dev
```

### «Œ ?«— 2: «” ›«œÂ «“ ¬Å? Backend »œÊ‰ Frontend
- ›ﬁÿ Backend —« «Ã—« ò‰?œ («Å? »— —Ê? port 8000)
- «“ Postman ?« œ?ê— ò·«?‰ ùÂ« «” ›«œÂ ò‰?œ

---

## ?? œ” Ê—«  „›?œ:

### Backend —« ‘—Ê⁄ ò‰?œ:
```powershell
cd backend
python -m uvicorn app.main:app --reload
```

### Frontend —« ‘—Ê⁄ ò‰?œ (»⁄œ «“ npm install):
```powershell
cd frontend
npm run dev
```

### Database shell:
```powershell
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d hesabpak
```

### Logs Ê troubleshooting:
```powershell
# „‘«ÂœÂ migrations
cd backend
python -m alembic current

# „‘«ÂœÂ  „«„ ¬Å‘‰ùÂ«? Uvicorn
python -m uvicorn app.main:app --help
```

---

## ?? ‰ò«  „Â„:

1. **PostgreSQL »«?œ «Ã—« ‘Êœ:**
   ```powershell
   Get-Service postgresql-x64-15 | Start-Service
   ```

2. **Python Ê Node PATH:**
   Â— Terminal Ãœ?œ ‰?«“ »Â  ‰Ÿ?„ PATH œ«—œ:
   ```powershell
   $env:Path = "C:\Users\Mahdi\AppData\Local\Programs\Python\Python311;C:\Program Files\nodejs;$env:Path"
   ```

3. **API Documentation:**
   - Swagger: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

---

## ? »⁄œ?:

«ê— „?ùŒÊ«Â?œ:
1. **Frontend —« »”«“„**: «”ò—?Å  build ò‰„
2. **ŒÊœò«— startup**: ”—Ê?” Windows »”«“„
3. **Production deployment**: Docker «” ›«œÂ ò‰„

---

## ?? «ê— „‘ò·? »Êœ:

```powershell
# PostgreSQL œ— Õ«· «Ã—«ø
Get-Service postgresql-x64-15

# Backend ç? „?ùêÂø
cd backend && python -m uvicorn app.main:app

# Database OKø
python -m alembic current
```

---

**??  »—?ò! »—‰«„Â  ﬁ—?»« ¬„«œÂ «” ! «» ›ﬁÿ Backend —« «Ã—« ò‰?œ!**
