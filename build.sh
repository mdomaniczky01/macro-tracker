#!/bin/sh
# Opcional: regenera bundle.js (un solo archivo) a partir de js/. Requiere: npx esbuild
npx esbuild js/app.js --bundle --format=iife --target=safari15 --outfile=bundle.js
