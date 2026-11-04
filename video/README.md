# Vídeo do rito

`rito.html` é o vídeo: uma apresentação animada (1920×1080) sobre as telas reais do rito, com narração.

- Abrir no navegador: sirva a pasta (ex.: `npx serve video`) e abra `rito.html`. `?t=40` abre parado num ponto; setas trocam de cena.
- Telas: `telas/*.png` e `telas/rects.json` (coordenadas que a câmera enquadra), capturadas do app rodando.
- Narração: `node video/scripts/narracao.mjs gerar` (precisa de `ELEVENLABS_API_KEY` no `.env` e de ffmpeg). As falas ficam em `scripts/narracao.mjs`, uma por cena.
- Música: `node video/scripts/trilha.mjs --segundos=230`.
- MP4: `FFMPEG=... node video/scripts/gravar-video.mjs video/rito-de-priorizacao.mp4 --fps=30`.
