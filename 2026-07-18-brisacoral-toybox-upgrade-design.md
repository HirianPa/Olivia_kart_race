# Brisacoral Kart — Diseño de la mejora Tropical Toy-Box

## Objetivo

Transformar el MVP actual en una carrera arcade más dinámica, expresiva y visualmente coherente con un juego portátil comercial, manteniendo personajes y mundo originales. La mejora debe añadir decisiones frecuentes, feedback fuerte y variedad entre vueltas sin sacrificar controles sencillos ni el objetivo de 60 FPS.

## Dirección elegida

La dirección artística es **Tropical Toy-Box**: formas redondeadas tipo juguete, colores tropicales limpios, materiales mates con brillos controlados, siluetas claras y efectos exagerados. La referencia a Nintendo DS define únicamente un suelo de calidad, legibilidad y densidad visual; no se copiarán personajes, circuitos, sonidos, objetos ni interfaces de Nintendo.

## Problema de jugabilidad actual

La carrera tiene conducción, drift, rivales y HUD, pero ofrece pocas decisiones después de dominar la trazada. El entorno tiene poca actividad, los karts carecen de animación secundaria y el feedback de velocidad, impacto y turbo es débil.

También existe un fallo reproducible: al golpear frontalmente una barrera con el poste centrado bajo el frontal, el kart puede quedar corregido repetidamente sobre el mismo límite y no responder a aceleración ni reversa.

## Bucle de carrera mejorado

Cada tramo debe ofrecer al menos una decisión entre trazada, riesgo o recompensa. La carrera combina:

- Conducción y drift existentes, con mayor feedback.
- Cajas sorpresa distribuidas en líneas que obligan a elegir carril.
- Monedas solares en trazadas rápidas y alternativas.
- Rampas con impulso de aterrizaje.
- Placas de corriente que aceleran a cualquier corredor.
- Rebufo al seguir de cerca a un rival.
- Objetos ofensivos y defensivos con lectura clara.

La interfaz conserva pocos controles: conducción, `Shift` para drift/acrobacia y `Espacio` para usar el objeto actual.

## Objetos

Cada kart puede llevar un único objeto. Las cajas desaparecen al recogerse y reaparecen después de unos segundos.

### Burbuja turbo

Aplica un impulso inmediato de intensidad intermedia. Puede combinarse con un mini-turbo, pero la velocidad total permanece limitada. Su animación infla una burbuja translúcida detrás del kart antes de estallar en una estela turquesa.

### Perla coralina

Proyectil que avanza sobre la pista durante un tiempo limitado. Al alcanzar un kart sin escudo, provoca un giro breve, pérdida de velocidad y expulsión de monedas. Solo puede existir un proyectil activo por corredor.

### Escudo concha

Rodea el kart durante varios segundos o hasta bloquear un impacto. No empuja rivales ni aumenta velocidad. El impacto bloqueado genera una onda visual clara.

La selección favorece ligeramente defensa o turbo para quienes van detrás, sin garantizar resultados ni teletransportar corredores.

## Monedas solares

El contador se limita a diez. Cada moneda aumenta muy ligeramente la velocidad máxima; el beneficio completo es perceptible pero no decisivo. Un golpe fuerte expulsa hasta tres monedas como objetos visuales temporales. Las monedas expulsadas pueden recogerse de nuevo.

## Rampas, saltos y placas

Las rampas usan una trayectoria vertical arcade separada de la posición sobre la pista. El kart conserva control horizontal moderado en el aire. Pulsar `Shift` cerca del aterrizaje activa una acrobacia y concede un impulso corto al tocar suelo.

Las placas de corriente ocupan zonas visibles del asfalto y aplican turbo tanto al jugador como a la IA. No requieren botón.

## Rebufo

Permanecer detrás de un rival, dentro de un cono estrecho y a distancia corta, carga una ráfaga. El HUD muestra líneas crecientes alrededor del kart. Salir del cono reduce la carga gradualmente. Completarla concede un impulso breve.

## Corrección antibloqueo

El sistema de límites distinguirá movimiento hacia la barrera y movimiento de escape. En un contacto frontal:

1. Colocará el kart ligeramente dentro del límite, no exactamente sobre él.
2. Eliminará solo la componente de velocidad que apunta hacia fuera.
3. Añadirá una pequeña componente tangencial de rebote para evitar equilibrio perpendicular.
4. Permitirá siempre reversa o giro de recuperación.
5. Si el contacto persiste más de 0.6 segundos con velocidad casi nula, aplicará una separación interior adicional y alineará parcialmente el kart con la tangente más cercana.

La recuperación no atravesará barreras ni teletransportará el kart a otra parte del circuito.

## IA y director de carrera

Los rivales recogen cajas y monedas si están cerca de su trazada. Usan turbo en rectas, escudo al detectar peligro y perla cuando hay un rival delante. La lógica usa temporizadores y geometría simple, no planificación compleja.

`RaceDirector` ajusta probabilidades de objetos según posición y distancia del grupo. No modifica directamente velocidad ni posición. El objetivo es mantener interacción sin ocultar la habilidad de conducción.

## Transformación visual

### Circuito

- Bordes pintados, marcas direccionales y franjas de superficie diferenciadas.
- Arco de salida, túnel coralino, molinos de viento y formaciones rocosas como hitos.
- Agua con ondas geométricas, espuma costera y brillo solar barato.
- Palmeras con balanceo, banderines, globos-pez y embarcaciones animadas.
- Rampas, placas, cajas y monedas integradas en el lenguaje Tropical Toy-Box.
- Capas de fondo y niebla para profundidad.

### Karts y conductores

- Carrocerías más redondeadas mediante primitivas superpuestas.
- Ruedas giratorias y orientables.
- Suspensión visual, inclinación y rebote al aterrizar.
- Brazos y cabeza del conductor reaccionan al giro, turbo e impacto.
- Cada rival conserva color propio y obtiene un accesorio de silueta distinto.

### Feedback

- Humo al acelerar y polvo sobre arena.
- Chispas azules y naranjas durante drift.
- Estela, destello y líneas de velocidad en turbo.
- Onda de impacto, monedas expulsadas y giro controlado al recibir un objeto.
- Sacudida de cámara corta con intensidad limitada.
- Animación del HUD al cambiar posición, recoger moneda o recibir objeto.

## Audio

`AudioSystem` generará sonidos breves mediante Web Audio: motor por capas, derrape, turbo, recogida, uso de objeto, golpe, salto y cuenta atrás. El audio se activará con la primera pulsación del usuario para respetar las políticas del navegador. Existirá control global de volumen interno y el juego funcionará aunque audio no esté disponible.

## Arquitectura

- `src/kart/AntiStuckSystem.js`: estado de contacto y recuperación.
- `src/items/ItemSystem.js`: cajas, inventarios y selección ponderada.
- `src/items/ProjectileSystem.js`: movimiento e impacto de perlas.
- `src/track/TrackFeatures.js`: monedas, rampas y placas.
- `src/effects/KartEffects.js`: pools de humo, polvo, chispas y estelas.
- `src/kart/KartAnimator.js`: ruedas, suspensión y conductor.
- `src/audio/AudioSystem.js`: síntesis y reproducción.
- `src/race/RaceDirector.js`: probabilidades y ritmo de objetos.
- `src/scene/ToyBoxEnvironment.js`: decoración y animación ambiental.

Los sistemas intercambian eventos (`collect`, `use`, `hit`, `jump`, `land`, `boost`) y snapshots pequeños. Los módulos visuales no escriben física directamente.

## Rendimiento

- Pools fijos para partículas, proyectiles y monedas expulsadas.
- Geometrías y materiales compartidos.
- Un proyectil máximo por corredor.
- Sin reflejos, postprocesado multipaso ni luces dinámicas adicionales.
- Calidad adaptativa: reducir primero partículas y sombras.
- Objetivo de 60 FPS en un portátil normal y resolución limitada por `devicePixelRatio`.

## Manejo de fallos

- Si Web Audio falla, la carrera continúa silenciosa.
- Si un pool se agota, se omite el efecto más antiguo sin crear objetos nuevos.
- Los objetos fuera de pista o agotados se reciclan.
- Todo estado temporal usa límites y temporizadores para evitar valores infinitos.
- Perder foco limpia controles y no consume accidentalmente el objeto.

## Verificación

### Automatizada

- Impacto frontal seguido de reversa y giro exitosos.
- Recuperación tras 0.6 segundos de contacto persistente.
- Recogida, inventario único y reaparición de cajas.
- Turbo, proyectil, impacto y escudo.
- Monedas, límite de diez y pérdida controlada.
- Rampas, aterrizaje y acrobacia.
- Rebufo y cancelación al salir del cono.
- IA usando objetos sin abandonar la pista.
- Carrera de tres vueltas y clasificación existentes sin regresión.

### Manual en navegador

- Completar una carrera usando cada objeto.
- Ejecutar drift azul y naranja con efectos visibles.
- Chocar frontalmente con varias barreras y recuperar control siempre.
- Saltar, realizar acrobacia y usar una placa turbo.
- Adelantar mediante rebufo y monedas.
- Verificar HUD en escritorio y ventana estrecha.
- Confirmar consola limpia y rendimiento cercano a 60 FPS.

## Definición de terminado

La mejora está terminada cuando la pista se siente activa sin depender únicamente de objetos, cada vuelta ofrece decisiones diferentes, los efectos comunican claramente velocidad e impactos, el estilo Tropical Toy-Box es coherente en mundo/karts/HUD, y ningún contacto frontal puede dejar al jugador sin control.
