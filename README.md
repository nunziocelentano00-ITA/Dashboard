# Rendiconti social

Rendicontazione digitale dei contenuti social per i clienti.
Sito statico pensato per **GitHub Pages**: niente server e niente build. I dati sono cifrati con AES-256.

| Pagina | Indirizzo | A chi serve |
|---|---|---|
| Admin (CRM) | `/admin/` | Solo a te, con password |
| Pagina cliente | `/cliente/?c=<slug>#k=<segreto>` | Al cliente, con link personale **e PIN** |

## Come funziona

- **Tutti i dati sono cifrati** nella cartella `data/`, quindi anche con il repo pubblico nessuno li legge.
  - `data/db.enc` contiene la contabilità completa. È cifrato con la tua password admin.
  - `data/c/<slug>.enc` contiene solo ciò che vede il cliente, senza note interne. La sua chiave si apre solo con **link + PIN**.
  - `data/m/<id>.enc` contiene le immagini delle bozze e delle copertine, cifrate con la chiave del cliente.
- Il segreto del link sta dopo `#k=`, parte dell'indirizzo che il browser non invia mai al server.
  Il PIN (4–8 cifre) lo scegli o generi dall'admin. Senza PIN il link da solo non apre nulla.
- Cambiare PIN non richiede di ricifrare le immagini. **Rigenera link** invece cambia tutte le chiavi.
- Il PIN protegge da chi riceve il link per sbaglio (inoltri, screenshot).
  Chi ha il link e un computer molto potente potrebbe però provare tutti i PIN di 6 cifre.
  Per questo è meglio mandare link e PIN su canali diversi.
- Nell'admin le modifiche si salvano subito sul dispositivo. Il tasto **Pubblica** fa un unico commit sul repo tramite l'API di GitHub, e GitHub Pages aggiorna il sito in 1–2 minuti.
- **Contabilità.**
  - Ogni contenuto ha un prezzo, IVA inclusa.
  - I pagamenti si registrano nel registro.
  - Residuo = totale − pagato.
  - I pagamenti coprono i contenuti dal più vecchio al più recente, così ogni contenuto risulta *Saldato*, *Parziale* o *Da saldare*.

## Primo avvio

1. Apri `https://<utente>.github.io/<repo>/admin/`.
2. Scegli la password admin. **Non si può recuperare.**
3. Collega GitHub con un *fine-grained token*:
   - Repository access: solo questo repo
   - Permissions: **Contents → Read and write**
4. Aggiungi contenuti e pagamenti, poi premi **Pubblica**.
5. Da *Impostazioni* del cliente, copia link e PIN e mandali al cliente, meglio su canali diversi.

## Anteprima locale

Senza installare nulla, perché Perl è già incluso in macOS:

```
perl tools/preview-server.pl 8080
```

Poi apri `http://localhost:8080/admin/`.
In anteprima "Pubblica" non tocca GitHub: scrive in `.preview/data/`, cartella esclusa da git.

## Struttura

```
index.html          pagina neutra (nessun dato)
admin/index.html    area admin
cliente/index.html  pagina cliente
assets/core.js      cifratura, contabilità, Instagram, API GitHub
assets/admin.*      CRM
assets/client.*     rendiconto cliente
data/               dati cifrati (creata dal primo "Pubblica")
```

Il rendiconto non è un documento fiscale. Le fatture restano quelle emesse tramite SdI.
