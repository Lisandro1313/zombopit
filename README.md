# Zombopit

Roguelite de pelotas que rebotan con los personajes y el folklore de **Zombolito**.

La Niebla sale de un pozo que abrió la Luz Mala debajo del Frigorífico. Los vecinos de Villa Zombolito bajan cada noche, tiran pelotas que rebotan contra las filas de bichos que suben, traen lo que pueden y de a poco levantan el pueblo.

**Jugar:** https://lisandro1313.github.io/zombopit/ (navegador, PC y celular)

## Cómo se juega

- **El Pozo:** los bichos avanzan en filas, como bloques. Tus pelotas salen solas, rebotan en las paredes y en los bichos, y vuelven cuando llegan al fondo (o las atrapás antes). Si llegan a la barricada, te sacan vida.
- **Cartas y orbes:** las gemas suben de nivel tu partida (pelotas nuevas, mejoras, objetos). Las élites y los jefes sueltan el orbe de fisión: mejora cosas al azar o, con el Taller de Fusiones, fusiona y evoluciona pelotas.
- **10 oleadas por noche:** a la mitad viene un grandote y al final el jefe del nivel. Hay 4 niveles: el Barrio, el Cementerio, el Hospital y el Frigorífico.
- **Villa Zombolito:** con oro, madera, ladrillos y trigo construís edificios. La economía se cosecha (los vecinos salen rebotando por el pueblo), las viviendas traen personajes, los de guerra dan bonus para siempre y los de utilidad cambian las reglas. Los planos se encuentran en el Pozo.
- **Personajes:** 21 vecinos, cada uno con una regla propia, nivel y 6 stats (aguante, fuerza, maña, liderazgo, velocidad, puntería). Suben jugando, entrenando y con figuritas.
- **Álbum:** la historia, los vecinos y los bichos del folklore que vas viendo.

Es difícil a propósito: las primeras partidas duran alrededor de un minuto.

**Controles:** A/D o flechas para moverte, mouse para apuntar (E: puntería automática), F: tiro automático o manual, R: velocidad, P o Esc: pausa. En el celular, arrastrá el dedo.

## Correrlo en tu máquina

Es HTML y JavaScript sin dependencias ni compilación:

```bash
node .claude/serve.cjs . 5190
```

y abrir http://localhost:5190. Con `?test` en la dirección se juega sin leer ni guardar la partida (sirve para probar).

## Estructura

| Archivo | Qué tiene |
|---|---|
| `js/data.js` | Pelotas, fusiones, personajes, rasgos, stats, bichos, niveles y edificios |
| `js/game.js` | El Pozo: formación, física de las pelotas, golpes, botín y dibujo |
| `js/base.js` | Villa Zombolito: mapa, edificios dibujados a mano y la cosecha |
| `js/ui.js` | Menús, cartas, ficha de personajes, figuritas y álbum |
| `js/pixel.js` | Pixel art de las pelotas, objetos y recursos (12×12, hecho a mano) |
| `js/sprites.js` | Sprites LPC, pisos, efectos y sangre |
| `js/lore.js` | La historia y el folklore de Zombolito |

## Créditos

Ver [CREDITS.md](CREDITS.md). Los recursos de terceros mantienen sus licencias (CC0, CC-BY, CC-BY-SA, OGA-BY, GPL y OFL, según cada uno).
