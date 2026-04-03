# Svenska kokböcker (PDF)

Lägg upp till **50** PDF-filer med svenska recept i denna mapp. Kör sedan:

```bash
npm run ingest
```

Indexet sparas i `data/recipe-embeddings.json` och används av Recept-RAG på sidan /recept.

## Var hittar man verkliga svenska kokböcker som PDF?

- **Project Runeberg** – Klassiska svenska böcker (public domain):  
  https://runeberg.org/katalog.html (sök t.ex. "kokbok", "mat")
- **Kungliga biblioteket (Kb)** – Svenska böcker, många digitaliserade:  
  https://www.kb.se/
- **Europeana** – Europeiska arkiv, inkl. svenska kokböcker:  
  https://www.europeana.eu/
- **Google Books** – Sök "svensk kokbok" och filtrera på böcker med fri förhandsgranskning.
- **Wikimedia Commons / Wikisource** – Enstaka recept och kokböcker i public domain.

Se till att du har rätt att använda PDF:erna (public domain eller egen licens). Max 50 böcker i denna mapp.
