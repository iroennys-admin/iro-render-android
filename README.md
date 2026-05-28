# 📡 IroRender

> Tu dashboard de **Render.com en Android** — ver, gestionar y deployar servicios desde el móvil, con sistema **anti-sleep** integrado vía GitHub Actions.

[![Build](https://github.com/iroennys-admin/iro-render-android/actions/workflows/build.yml/badge.svg)](https://github.com/iroennys-admin/iro-render-android/actions/workflows/build.yml)

---

## ✨ Lo que hace

### 📦 Servicios — TODO lo que ofrece la API de Render
- 🌐 **Web Services** · 📄 **Static Sites** · ⚙️ **Background Workers** · ⏰ **Cron Jobs** · 🔒 **Private Services**
- Lista filtrable por tipo, búsqueda por nombre, dot de status (live / building / failed / suspended)
- Vista detallada con acciones rápidas: **Deploy · Deploy clear cache · Restart · Suspend/Resume · Borrar**
- Para crons: **Run now**

### 🚀 Deploys
- Lista con estado, autor, commit
- Trigger nuevo deploy (con/sin cache)
- **Rollback** a un deploy anterior
- **Cancel** deploys en progreso
- Polling automático (se refresca cada 8s mientras está corriendo)

### 📜 Logs en vivo
- Stream con auto-refresh cada 5s (toggleable)
- Filtro por texto
- Resaltado de errores/warnings

### 📊 Métricas (última hora)
- CPU · Memoria · Instancias · HTTP requests · Latencia · Bandwidth

### 🛠 Gestión completa
- **Env vars**: añadir, editar, borrar, ocultar/mostrar valores
- **Secret files**: subir, editar, borrar
- **Custom domains**: añadir, verificar DNS, borrar
- **Custom headers**
- **Eventos** del servicio
- **Instancias**: scaling manual, restart por instancia
- **One-off jobs**: lanzar comandos puntuales, cancelar
- **Autoscaling**: configurar min/max + target CPU/memoria
- **Cache purge** (Web Services)

### 🆕 Crear servicios desde la app
- Form guiado: tipo, repo, branch, runtime, build/start command, región, plan
- O pega tu **render.yaml** (Blueprint) para validarlo

### 🐘 Postgres
- Lista, crear, suspender, resumir, restart, **failover**, point-in-time recovery
- Connection info (psql, internal, external) con copy al portapapeles
- Gestión de usuarios
- Exports (logical backups)

### 🔑 Key-Value (antes Redis)
- Lista, suspender, resumir, borrar

### 💿 Discos persistentes · 📋 Blueprints · 🔐 Registry credentials · 🗂 Projects · 📚 Env Groups

---

## 🔔 Anti-sleep ping system (GitHub Actions)

Los servicios free de Render **se duermen tras 15 min de inactividad**. Esta app resuelve el problema **sin depender de tu móvil**:

1. Conectas un **Personal Access Token de GitHub** (scopes: `repo`, `workflow`)
2. La app crea un **repo privado** llamado `iro-render-pings` en tu cuenta
3. Escribe ahí un workflow YAML con `cron: */N * * * *`
4. **GitHub Actions hace el ping cada N minutos, 24/7, gratis**
5. La app es el editor visual: añadir/quitar URLs, importar todas las URLs de tus web services con un botón, probar pings manualmente, lanzar el workflow ahora

> Tu móvil no necesita estar abierto. Si reinstalas la app, **carga la configuración remota** automáticamente desde el repo.

---

## 📥 Instalación

Descarga el APK desde [Releases](https://github.com/iroennys-admin/iro-render-android/releases) o del último [Actions run](https://github.com/iroennys-admin/iro-render-android/actions) → artifact `IroRender-APKs`.

## 🔐 Setup

1. Abre la app
2. Pega tu **API key de Render** ([crear aquí](https://dashboard.render.com/account/api-keys))
3. ¡Listo! Selector de workspace incluido si tienes varios.

Para activar pings:
1. Tab **🔔 Pings** → pega un GitHub PAT
2. Toca **📥 Importar de Render** (importa todos tus web services automáticamente)
3. Toca **🚀 Publicar workflow** — eso es todo.

## 🛠 Build local

```bash
git clone https://github.com/iroennys-admin/iro-render-android.git
cd iro-render-android
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 🏗 Stack

- **React 18 + TypeScript + Vite 5**
- **Capacitor 7** para empaquetar como APK Android
- **Cliente REST propio** (sin SDKs externos) con cursor pagination + rate-limit tracking
- **Sin backend propio** — comunicación directa con `api.render.com` y `api.github.com`

## 📜 License

MIT
