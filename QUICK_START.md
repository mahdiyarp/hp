# HesabPak Quick Start Guide

## ?? ÓÑ?Ú ÊÑ?ä ÑÇå (3 ÏŞ?Şå)

### **Çã 1: PowerShell ÑÇ ÈåÚäæÇä Administrator ÈÇÒ ˜ä?Ï**
```powershell
Windows + X  ?  PowerShell (Admin)
```

### **Çã 2: Ç?ä ÏÓÊæÑ ÑÇ ÇÌÑÇ ˜ä?Ï**
```powershell
cd C:\Users\Mahdi\source\repos\mahdiyarp\hp
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
.\setup-docker.ps1
```

### **Çã 3: ÕÈÑ ˜ä?Ï ÊÇ Ê˜ã?á ÔæÏ** ?
(Çæá?ä ÈÇÑ 5-15 ÏŞ?Şå Øæá ã?˜ÔÏ)

---

## ? ÈÚÏ ÇÒ äÕÈ

| å ˜ÇÑ ˜ä?ã | á?ä˜ |
|-----------|------|
| ?? ÑÇÈØ ˜ÇÑÈÑ? | http://localhost:3000 |
| ?? ãÓÊäÏÇÊ API | http://localhost:8000/docs |
| ?? äÇã ˜ÇÑÈÑ? | developer |
| ?? ÑãÒ ÚÈæÑ | 09123506545 |

---

## ?? ÇÑ ÎØÇ ÏÇÏ

**ÇÑ ÇÓ˜Ñ?Ê äÇãæİŞ ÈæÏ:**

```powershell
# ÏÓÊæÑÇÊ ÏÓÊ?
docker compose down
docker system prune -a
docker compose up -d --build
```

---

## ?? ÏÓÊæÑÇÊ ãİ?Ï

```powershell
# ãÔÇåÏå áÇåÇ
docker compose logs -f

# ãÊæŞİ ˜ÑÏä ÓÑæ?ÓåÇ
docker compose down

# ÔÑæÚ ãÌÏÏ
docker compose restart

# æÖÚ?Ê ÓÑæ?ÓåÇ
docker compose ps
```

---

**? ÊãÇã! ÈÑäÇãå ÂãÇÏå ÇÓÊ! ??**
