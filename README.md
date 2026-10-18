# Plato

App web instalable (PWA) para llevar tu plan nutricional: diario de comidas, macros objetivo, plato interactivo y recetario simple. Sin build, sin dependencias: son archivos estáticos.

## Foto + texto (todo dentro de la app)
En *Plato → Foto*: escribís qué comiste, la app arma los ingredientes y, si sumás una foto, mide cuánto ocupa cada parte del plato (calibrado con el diámetro real del plato) para estimar los gramos. No usa claves ni variables de entorno: nada sale del teléfono. Es una estimación; después afinás los gramos en el Plato.

## Subir a Vercel

**Opción A: arrastrar y soltar (la más rápida)**
1. Entrá a vercel.com → *Add New… → Project*.
2. Si te pide un repositorio, usá la opción de subir la carpeta con la CLI (Opción B), o creá un repo en GitHub con estos archivos.

**Opción B: CLI**
```bash
cd plato
npx vercel        # primera vez: responde las preguntas (framework: Other, sin build)
npx vercel --prod # publica en producción
```

**Opción C: GitHub**
1. Subí esta carpeta a un repositorio.
2. En Vercel: *Add New → Project → Import* ese repo.
3. Framework Preset: **Other**. Build Command: vacío. Output Directory: vacío (raíz).

## Instalar en el iPhone
1. Abrí la URL de Vercel en **Safari**.
2. Compartir → **Agregar a inicio**.
3. Usá la app desde el ícono. Los datos viven en el teléfono (hacé un respaldo desde Ajustes → Respaldo de vez en cuando).

## Actualizar
Cuando cambies archivos, subí el número de `VERSION` en `sw.js` (por ejemplo `plato-v2`) para que el iPhone descargue la versión nueva.

## Estructura
- `index.html`, `css/styles.css`
- `js/foods.js`: alimentos y macros por 100 g
- `js/recipes.js`: recetario (179 recetas)
- `js/store.js`: datos, objetivos y sugerencias
- `js/parse.js`: entiende el texto del plato (“milanesa de pollo con puré y ensalada”) → ingredientes
- `js/vision.js`: mide porciones en la foto (varita/pincel/zonas sugeridas) — todo en el teléfono, sin servidor ni IA externa
- `js/ui.js`, `js/app.js`: interfaz
- `sw.js`, `manifest.webmanifest`, `icons/`: instalación y modo offline
