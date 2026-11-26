# Andén · Mi Transporte

Aplicación móvil en Ionic React para consultar rutas de buses, paraderos y tiempos estimados de llegada en Los Olivos. Usa una flota simulada y un asistente local para la presentación del proyecto.

## Ejecutar en Windows

1. [Descarga Anden-Ionic-Windows.zip](https://github.com/IngJair/anden-mi-transporte/releases/download/v1.0.0/Anden-Ionic-Windows.zip).
2. Haz clic derecho sobre el ZIP y elige **Extraer todo**.
3. En la carpeta **Anden**, haz doble clic en **Abrir Anden.exe**. Se abrirá la app en tu navegador. Mantén la ventana del iniciador abierta durante el uso.

El ZIP incluye el iniciador, la aplicación compilada y el código fuente. Para presentar la app, abre **Perfil → Fuente de datos y presentación → Iniciar recorrido guiado**.

## Trabajar con el código fuente

Con Node.js y pnpm instalados, ejecuta desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Para generar la versión distribuible, ejecuta `pnpm build`. La carpeta `dist` contiene la aplicación compilada. El iniciador de Windows se implementa en `Launcher.cs`.

Los viajes y favoritos se guardan en el navegador del dispositivo. El mapa de calles usa OpenStreetMap y requiere conexión para cargar las teselas.
