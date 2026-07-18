# Brisacoral Kart — Diseño del MVP

## Objetivo

Construir un juego de karts arcade 3D original que se ejecute en el navegador. Al abrirlo, el jugador entra directamente a una cuenta atrás breve y compite contra cuatro rivales en un circuito cerrado. La prioridad es una conducción satisfactoria, especialmente el drift con mini-turbo, manteniendo 60 FPS en un portátil normal.

## Alcance

El MVP incluye:

- Three.js estable mediante npm, Vite, JavaScript modular y pnpm.
- Un circuito tropical cerrado con parrilla, meta y tres vueltas.
- Un kart controlable y cuatro rivales autónomos.
- Física arcade, drift, mini-turbo y colisiones sencillas.
- Cámara en tercera persona con seguimiento amortiguado.
- Cuenta atrás, cronómetro, posición, vuelta, velocidad y carga de turbo.
- Pantalla final de clasificación únicamente después de que el núcleo sea estable.

Las cajas de objetos y proyectiles quedan fuera del núcleo. Solo se añadirán si conducción, carrera y rendimiento cumplen primero sus criterios.

## Dirección creativa

El mundo se llama **Archipiélago Brisacoral**. Una carretera de asfalto azul grisáceo conecta islotes sobre agua turquesa. El recorrido contiene una recta costera larga, curvas enlazadas, una horquilla alrededor de una formación coralina y un puente corto.

La paleta principal es:

- Cielo Brisa: `#84D8D1`
- Agua Laguna: `#28BFC1`
- Asfalto Marea: `#405A66`
- Coral Solar: `#FF765F`
- Arena Clara: `#F7D58B`
- Palma Lima: `#75C94B`

El kart protagonista tendrá carrocería turquesa, chasis oscuro y un conductor con casco de pez globo. Los rivales usarán siluetas comunes y colores diferenciados, con pequeños accesorios originales. La firma visual serán el agua animada y las velas triangulares que marcan el sentido de la pista.

La escena usará formas low-poly, materiales planos, niebla azul, luz hemisférica y una luz direccional. Las sombras se limitarán al área cercana al jugador y podrán degradarse según rendimiento.

## Enfoque técnico

Se usará física arcade propia sobre una spline central. No se incorporará un motor físico generalista. La spline será la fuente compartida para generar la carretera, colocar barreras, consultar límites, medir progreso, dirigir la IA y contar vueltas.

Este enfoque reduce dependencias, mantiene resultados predecibles y permite afinar por separado velocidad longitudinal, deslizamiento lateral, dirección, fricción y rebote.

## Arquitectura

- `src/main.js`: creación de sistemas, bucle principal y coordinación.
- `src/scene/GameScene.js`: renderer, escena, luces, niebla, entorno y cámara.
- `src/track/Track.js`: spline, carretera, barreras, meta y consultas espaciales.
- `src/kart/PlayerKart.js`: entrada, movimiento arcade, modelo y colisiones.
- `src/kart/DriftSystem.js`: estado de drift, carga, niveles y turbo.
- `src/race/RivalAI.js`: control autónomo mediante puntos adelantados.
- `src/race/RaceManager.js`: cuenta atrás, vueltas, posiciones, tiempos y final.
- `src/ui/HUD.js`: indicadores de carrera.
- `src/effects/KartEffects.js`: humo y chispas opcionales tras estabilizar el núcleo.

Cada módulo expone una interfaz pequeña y evita acceder directamente al estado interno de otros módulos. `main.js` actualiza los sistemas en orden y pasa datos explícitos.

## Flujo de arranque

La aplicación construye el mundo tras un fondo negro breve. El jugador y los rivales aparecen en la parrilla; la cámara ya está colocada. Se muestra `3`, `2`, `1`, `¡YA!` y se habilitan simultáneamente todos los controles. No existe menú inicial ni se requiere un clic.

Si la pestaña pierde foco, se limpian las teclas activas. Si WebGL no puede iniciarse, se muestra un mensaje de compatibilidad en lugar de una pantalla vacía.

## Pista y límites

La carretera será una cinta procedural construida desde una curva Catmull-Rom cerrada. Las muestras de la spline proporcionan centro, tangente, normal horizontal y ancho local.

El circuito tendrá anchura suficiente para adelantamientos de dos o tres karts. El kart puede usar los bordes, pero cruzar el límite aplica corrección progresiva, rebote moderado y pérdida de velocidad. La superficie exterior aplica más fricción. Las barreras visibles coinciden con los límites usados por la conducción.

## Conducción arcade

La simulación limita el paso de tiempo para evitar saltos al perder fotogramas. El estado del kart separa velocidad longitudinal y lateral.

- Acelerar aumenta gradualmente la velocidad hasta un máximo.
- Frenar reduce velocidad con más fuerza y habilita una marcha atrás lenta.
- La dirección depende de la velocidad: evita giros sobre el sitio y pierde sensibilidad a velocidad máxima.
- La fricción longitudinal permite avanzar brevemente al soltar el acelerador.
- La fricción lateral normal estabiliza el kart; al derrapar se reduce para conservar inercia.
- La orientación visual interpola el rumbo físico y añade inclinación moderada en curvas.

La cámara calcula una posición objetivo detrás y por encima del kart y la interpola con amortiguación independiente de FPS. También suaviza el punto de mirada y amplía ligeramente el campo de visión con la velocidad.

## Drift y mini-turbo

El drift se inicia al mantener `Shift` y girar por encima de una velocidad mínima. Mientras está activo, aumenta la autoridad de giro, disminuye el agarre lateral y permite contravolante. La carga solo avanza si existe giro y deslizamiento efectivos.

Estados:

1. Sin carga: humo blanco.
2. Azul: turbo corto al soltar, con chispas azules.
3. Naranja: turbo más fuerte y largo, con chispas naranjas.

Soltar `Shift` consume el nivel alcanzado y aplica aceleración adicional con duración limitada. Una colisión fuerte reduce la carga; perder velocidad o dejar de girar cancela progresivamente el drift. El turbo no elimina el control del kart ni atraviesa barreras.

## Rivales

Habrá cuatro rivales. Cada uno seguirá un punto objetivo adelantado sobre la spline, desplazado lateralmente para evitar una fila perfecta. La distancia de anticipación aumenta con la velocidad y la IA reduce aceleración según la curvatura próxima.

Pequeñas diferencias de velocidad y reacción crearán adelantamientos. Un ajuste moderado basado en distancia al jugador mantendrá el grupo competitivo, sin teletransportes ni cambios bruscos. Las mismas reglas de pista y colisión se aplican a todos los karts.

## Colisiones entre karts

Cada kart usa un radio horizontal sencillo. Cuando dos radios se solapan, se separan en la normal de contacto, intercambian un impulso pequeño y pierden algo de velocidad. Se limita el impulso para impedir lanzamientos o vibración continua.

## Carrera

Cada participante guarda vueltas completadas, progreso normalizado sobre la spline y tiempo. La meta solo cuenta si se cruza en el sentido correcto y el kart ha recorrido suficiente circuito desde el cruce anterior.

La posición se ordena por vueltas completadas y después por progreso. La carrera termina cuando el jugador completa la tercera vuelta; se congelan los resultados y se muestra la clasificación. Los rivales que aún no terminan reciben un tiempo estimado solo para cerrar la tabla final.

## HUD

El HUD permanece compacto y no tapa la pista:

- Velocidad en la esquina inferior derecha.
- Barra de mini-turbo junto al velocímetro, con cambios azul y naranja.
- Posición grande en la esquina superior derecha.
- Vuelta y cronómetro en la esquina superior izquierda.
- Cuenta atrás centrada con animación breve y legible.

Los textos usan alto contraste, contorno oscuro y tamaños adaptables. El HUD informa del estado; no incluye botones ni paneles de menú.

## Rendimiento y adaptación

El objetivo es 60 FPS en un portátil normal. Se limitarán el número de triángulos, luces, sombras y partículas. El agua usará un material animado sencillo, sin reflejos en tiempo real. La niebla ocultará el final visible del circuito y reducirá la necesidad de detalle lejano.

La resolución del renderer se limitará a un `devicePixelRatio` razonable. Si el promedio de FPS permanece bajo, el juego reducirá primero resolución de sombras y después desactivará sombras dinámicas, sin cambiar la jugabilidad.

## Entregas y verificación

### Capa 1 — Escena, pista y conducción

- Construir entorno, circuito, kart, controles y cámara.
- Completar manualmente dos vueltas en ambos sentidos de teclado.
- Verificar que la cámara no oscila y que los límites no permiten abandonar la pista.
- Entregar instrucciones de prueba antes de continuar.

### Capa 2 — Drift y mini-turbo

- Añadir los estados de drift y los dos niveles de carga.
- Probar ambos niveles en recta y curva.
- Confirmar que soltar el drift produce un empujón controlable.
- Confirmar que una colisión no produce velocidades fuera de rango.

### Capa 3 — Rivales

- Añadir cuatro rivales y colisiones entre karts.
- Observar tres vueltas sin intervención.
- Confirmar que ningún rival abandona la pista y que hay adelantamientos.

### Capa 4 — Carrera y HUD

- Añadir cuenta atrás, vueltas, posición, cronómetro y final.
- Verificar una carrera completa de tres vueltas.
- Comprobar salida simultánea, cambios de posición y clasificación.

### Bonus condicionado

Si las cuatro capas mantienen el objetivo de rendimiento, añadir humo y chispas. La pantalla final de clasificación forma parte del cierre de carrera; cajas de objetos y proyectiles solo se considerarán después.

## Definición de terminado

El MVP está terminado cuando abrir la página inicia una carrera sin menú; el jugador puede completar tres vueltas contra cuatro rivales; conducción, drift y turbo responden de forma consistente; los límites y colisiones son estables; HUD y clasificación son correctos; y el juego mantiene fluidez cercana a 60 FPS en hardware objetivo.
