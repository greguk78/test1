# Portfolio fotografa: Kinetic · Flythrough · Focus

Trzy wersje strony portfolio dla fotografa lotnictwa i motoryzacji. Wszystkie korzystają z tych samych zdjęć:

| Wersja | Adres | Na czym polega |
|---|---|---|
| **Kinetic** | `/kinetic/` | Odważna typografia rozciągająca się pod kursorem, pasek serii reagujący na przewijanie, galeria jadąca w poziomie |
| **Flythrough** | `/flythrough/` | Przewijanie to lot przez zdjęcia zawieszone w 3D, z wysokościomierzem |
| **Focus** | `/focus/` | Strona działa jak aparat: ostrość podąża za kursorem, kliknięcie robi „zdjęcie”, na dole są prawdziwe dane EXIF |

Zdjęcia są czytane prosto z folderu na dysku albo z udziału na NAS. Serwer sam odczytuje EXIF (czas, przysłona, ISO, ogniskowa, aparat, obiektyw) i robi zmniejszone wersje, żeby strona ładowała się szybko. Dopóki folder jest pusty, strony pokazują przykładowe grafiki.

---

## 1. Uruchomienie na MacBooku (testy)

Potrzebny jest **Node.js 18 lub nowszy** (https://nodejs.org, wersja LTS). Potem w Terminalu:

```bash
cd ścieżka/do/projektu
npm install        # tylko za pierwszym razem
npm start
```

Otwórz w przeglądarce **http://localhost:4321/** i wybierz wersję. Terminal pokaże też adres w sieci lokalnej (np. `http://192.168.1.15:4321/`), pod którym stronę zobaczysz na telefonie w tym samym Wi-Fi.

Zatrzymanie serwera: `Ctrl + C`.

## 2. Gdzie wrzucić zdjęcia

Domyślnie do folderu `photos/` w projekcie. Układ: **kategoria → seria → zdjęcia**.

```
photos/
  lotnictwo/
    Radom Air Show 2026/
      DSC01234.jpg
      DSC01240.jpg
      seria.json          ← opcjonalny opis serii
    nocne-operacje-epkk/
  motoryzacja/
    Track day Tor Poznań/
```

- **Nazwa folderu serii staje się tytułem.** Można pisać ze spacjami, wielkimi literami i polskimi znakami („Radom Air Show 2026”). Nazwa w stylu `radom-air-show-2026` też zadziała i zamieni się na „Radom air show 2026”.
- Liczba na początku nazwy ustala kolejność i nie trafia do tytułu, np. `01-radom-air-show`.
- Obsługiwane formaty to JPG, PNG, WebP, AVIF i TIFF. Pliki RAW (ARW, CR3, NEF) i HEIC trzeba najpierw wyeksportować do JPG, np. z Lightrooma.
- Najlepiej eksportować z zachowaniem metadanych EXIF, bo wtedy strona pokaże ustawienia aparatu.
- Po dodaniu zdjęć wystarczy odświeżyć stronę. Nie trzeba restartować serwera.
- Sprawdzenie, co widzi skaner: `npm run scan`

### Opis serii: `seria.json` (opcjonalnie)

Plik w folderze serii. Każde pole można pominąć:

```json
{
  "title": "Radom Air Show 2026",
  "place": "Radom-Sadków, EPRA",
  "date": "2026-08-23",
  "description": "Dwa dni pokazów i jedno okno światła po 18:30.",
  "cover": "DSC01240.jpg",
  "highlights": ["DSC01240.jpg", "DSC01234.jpg"],
  "order": 1
}
```

- `cover` to zdjęcie okładkowe serii.
- `highlights` to zdjęcia, które trafią na stronę główną (do galerii Kinetic, lotu Flythrough i wizjera Focus). Bez tego pola wybierane są pierwsze 3 zdjęcia serii (ustawienie `highlightsPerSeries`).
- `order` ustala kolejność serii. Bez niego najnowsze serie są pierwsze (według daty z EXIF).

Przykład jest w pliku `photos/przyklad-seria.json`.

## 3. Twoje dane: `portfolio.config.json`

Tu ustawiasz imię, opis, e-mail, Instagram, sprzęt i folder ze zdjęciami:

```json
{
  "name": "Adam Nowak",
  "wordmark": "NOWAK",
  "email": "kontakt@twojadomena.pl",
  "photosDir": "./photos",
  "port": 4321,
  "highlightsPerSeries": 3,
  "maxHighlights": 18
}
```

`wordmark` to duży napis na górze wersji Kinetic. Bez tego pola używane jest nazwisko.

## 4. Zdjęcia z NAS

Najprostszy układ: **NAS przechowuje zdjęcia, a MacBook lub serwer Ubuntu uruchamia stronę.** Na NAS utwórz udział, np. `Portfolio`, z opisanym wyżej układem folderów.

### Na Macu

1. Finder → **Idź → Połącz z serwerem…** (`⌘K`) → `smb://ADRES-NAS/Portfolio`
2. Udział pojawi się jako `/Volumes/Portfolio`.
3. W `portfolio.config.json` ustaw `"photosDir": "/Volumes/Portfolio"` i uruchom `npm start`.

Bez zmiany pliku: `PHOTOS_DIR=/Volumes/Portfolio npm start`

### Na Ubuntu Server

```bash
sudo apt install cifs-utils
sudo mkdir -p /mnt/nas/portfolio
# plik z hasłem do NAS (tylko do odczytu przez roota)
sudo sh -c 'printf "username=UZYTKOWNIK\npassword=HASLO\n" > /etc/nas-portfolio.cred && chmod 600 /etc/nas-portfolio.cred'
# linia w /etc/fstab (montowanie przy starcie, tylko do odczytu):
//ADRES-NAS/Portfolio  /mnt/nas/portfolio  cifs  credentials=/etc/nas-portfolio.cred,ro,iocharset=utf8,uid=1000,_netdev  0  0
sudo mount -a
```

Potem `"photosDir": "/mnt/nas/portfolio"`.

Serwer pomija systemowe foldery NAS (`@eaDir`, `#recycle`, foldery zaczynające się od kropki).

## 5. Wersja na stałe: Ubuntu Server

Są dwie możliwości.

**A) Serwer Node (tryb na żywo):** nowe zdjęcia na NAS pojawiają się na stronie same.

```bash
git clone … /opt/portfolio && cd /opt/portfolio
npm install --omit=dev
sudo cp deploy/portfolio.service /etc/systemd/system/
sudo systemctl enable --now portfolio
```

Przed `enable` sprawdź w `deploy/portfolio.service` ścieżki i użytkownika.

**B) Statyczna kopia + nginx:** nie wymaga Node na serwerze. Po każdej zmianie zdjęć trzeba przebudować.

```bash
npm run build          # tworzy folder dist/ (strony + zmniejszone zdjęcia + dane)
npm run preview        # podgląd zbudowanej wersji na http://localhost:4321/
```

Folder `dist/` skopiuj na serwer, np. `rsync -a dist/ serwer:/var/www/portfolio/`. Przykładowa konfiguracja nginx jest w `deploy/nginx.conf`. Taki sam folder `dist/` możesz też wrzucić na dowolny hosting albo na NAS, jeśli ma wbudowany serwer WWW.

**Hosting bezpośrednio na NAS:** zależy od modelu i wersji systemu NAS. Jeśli NAS ma serwer WWW albo obsługuje kontenery, wystarczy skopiować tam `dist/` (opcja B). Jeśli nie, zostaw NAS jako magazyn zdjęć, a stronę uruchamiaj na Ubuntu lub Macu.

> Pliki w `deploy/` to szablony. Nie zostały przetestowane na prawdziwym serwerze, więc sprawdź ścieżki przed użyciem.

## 6. Przydatne polecenia

| Polecenie | Co robi |
|---|---|
| `npm start` | serwer na żywo, czyta zdjęcia z `photosDir` |
| `npm run scan` | pokazuje znalezione serie, zdjęcia i EXIF |
| `npm run build` | statyczna wersja w `dist/` |
| `npm run preview` | podgląd folderu `dist/` |
| `PORT=8080 npm start` | inny port |

## Uwagi

- Kroje pisma ładują się z Google Fonts. Bez internetu strony działają, ale z zastępczymi krojami.
- Zmniejszone kopie zdjęć trafiają do `.cache/`. Ten folder można w każdej chwili usunąć.
- Twoje zdjęcia nie są wysyłane do gita. Folder `photos/` jest w `.gitignore`.
- Efekty zależne od myszy (rozciąganie liter, ostrość pod kursorem) na telefonie zastępują gesty: przesunięcie palcem i stuknięcie.
