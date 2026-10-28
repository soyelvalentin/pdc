# PDC Estudio

Diseñador de productos personalizados en el navegador: playeras, sudaderas, bolsas y tazas.
Es un solo archivo (`index.html`) hecho con [Fabric.js 6](https://fabricjs.com); se abre directo en el navegador, sin servidor.

## Funciones

- Cuatro productos con frente y espalda, colores de prenda y área de impresión con medidas en cm.
- Texto con 10 tipografías, contorno, sombra, espaciado, interlineado y texto en arco.
- Imágenes (subir o arrastrar) con filtros: quitar fondo blanco, blanco y negro, sepia, invertir y brillo.
- Formas, dibujo libre y panel de capas (ocultar, bloquear, reordenar).
- Deshacer/rehacer, copiar/pegar, duplicar, centrar, ajustar al área y atajos de teclado.
- Cotización en vivo con descuentos por volumen.
- Guardado automático en el navegador y como archivo `.json`.
- Descarga de maqueta PNG, arte para impresión (PNG transparente a 200 ppp) y exportación de pedido.

## Configuración

Precios, descuentos, resolución de impresión y el `endpoint` para recibir pedidos están en el objeto `CONFIG`, al inicio del script en `index.html`.
Si `endpoint` está vacío, el pedido se descarga como archivo; si tiene una URL, se envía por `POST` en JSON.

## Versión anterior

El código original de 2015–2020 sigue disponible en la etiqueta [`v1-2020`](../../tree/v1-2020).
