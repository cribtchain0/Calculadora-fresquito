import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import * as api from "./api.js";

/* ────────────────────────────────────────────────────────────
   Fresquito Gourmet Pops — Libro de finanzas, inventario y costeo
   Insumos → Bases → Paletas. Cada nivel hereda el costo del anterior.
   ──────────────────────────────────────────────────────────── */

const LINEAS = {
  "Agua/Frutal": "#1FA39C",
  "Crema/Gourmet": "#E0A32E",
  "Picosas": "#D0402E",
  "Café/Cafetería": "#7A5340",
};

const CATEGORIAS = ["Insumos", "Empaque", "Transporte", "Renta", "Servicios", "Equipo", "Publicidad", "Eventos", "Otros"];
const CANALES = ["Evento / carrito", "Distribución", "Venta directa", "Mayoreo", "Otro"];
const UNIDADES = ["kg", "g", "L", "ml", "pieza", "paquete"];
const TIPOS_INSUMO = ["Fruta", "Lácteo", "Abarrote", "Base en polvo", "Empaque", "Otro"];
const CELL_COLORS = ["#1FA39C", "#E0A32E", "#D0402E", "#7A5340", "#4C6FA5", "#8E6BA8", "#5B8C3E", "#C2763F"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MERMA_HINT = "Ej. mango ~40%, piña ~45%, maracuyá ~55%, fresa ~5%";

const DEFAULTS = {
  version: 3,
  insumos: [],
  bases: [],
  recetas: [],
  movimientos: [],
  ajustes: { moldePiezas: 40, ciclosLitros: 4.8, costosFijosMes: 0, usuario: "" },
};

/* Catálogo Fresquito — extraído de la guía de producción.
   Formato insumo: [nombre, tipo, unidad, merma%]
   Formato receta: [sabor, línea, [[insumo|base, cantidad], ...], nota] */

const INSUMOS_SEED = [
  // Abarrote / base
  ["Agua purificada", "Abarrote", "L", 0],
  ["Azúcar", "Abarrote", "kg", 0],
  ["Azúcar morena o de caña", "Abarrote", "kg", 0],
  ["Piloncillo oscuro", "Abarrote", "kg", 0],
  ["Sal fina", "Abarrote", "kg", 0],
  ["Ácido cítrico", "Abarrote", "kg", 0],
  ["Jugo de limón", "Abarrote", "L", 0],
  ["Limón persa (pieza)", "Fruta", "pieza", 0],
  ["Canela en polvo", "Abarrote", "kg", 0],
  ["Canela en raja", "Abarrote", "pieza", 0],
  ["Clavo de olor", "Abarrote", "pieza", 0],
  ["Anís estrella", "Abarrote", "pieza", 0],
  ["Extracto de vainilla oscura", "Abarrote", "ml", 0],
  ["Pasta concentrada de vainilla", "Abarrote", "kg", 0],
  ["Vaina de vainilla", "Abarrote", "pieza", 0],
  ["Esencia de coco", "Abarrote", "ml", 0],
  ["Esencia de uva", "Abarrote", "ml", 0],
  ["Esencia de menta blanca", "Abarrote", "ml", 0],
  ["Extracto de almendra", "Abarrote", "ml", 0],
  ["Colorante verde menta", "Abarrote", "ml", 0],
  // Lácteos y base
  ["Leche entera", "Lácteo", "L", 0],
  ["Base en polvo Arcy VIC", "Base en polvo", "kg", 0],
  ["Queso crema Philadelphia", "Lácteo", "kg", 0],
  ["Crema de coco Calahua", "Abarrote", "L", 0],
  // Frutas
  ["Mango Ataulfo", "Fruta", "kg", 40],
  ["Jugo de uva morada", "Fruta", "L", 0],
  ["Maracuyá", "Fruta", "kg", 55],
  ["Kiwi", "Fruta", "kg", 20],
  ["Mix frutos rojos congelados", "Fruta", "kg", 0],
  ["Jugo de arándano natural", "Abarrote", "L", 0],
  ["Sandía sin semilla", "Fruta", "kg", 35],
  ["Guayaba rosa", "Fruta", "kg", 15],
  ["Piña miel", "Fruta", "kg", 45],
  ["Jugo de piña natural", "Fruta", "L", 0],
  ["Agua de coco natural", "Fruta", "L", 0],
  ["Coco rallado", "Abarrote", "kg", 0],
  ["Fresa", "Fruta", "kg", 5],
  ["Zarzamora", "Fruta", "kg", 5],
  ["Pepino", "Fruta", "kg", 25],
  ["Jícama", "Fruta", "kg", 25],
  ["Jugo de naranja natural", "Fruta", "L", 0],
  ["Jugo de zanahoria", "Fruta", "L", 0],
  ["Jengibre fresco", "Fruta", "kg", 20],
  ["Guanábana", "Fruta", "kg", 40],
  ["Mamey", "Fruta", "kg", 35],
  ["Piña en almíbar", "Abarrote", "kg", 0],
  // Hierbas y secos
  ["Hojas de menta fresca", "Fruta", "kg", 10],
  ["Hierbabuena fresca", "Fruta", "kg", 10],
  ["Albahaca genovesa", "Fruta", "kg", 10],
  ["Romero fresco", "Fruta", "kg", 5],
  ["Flor de jamaica seca", "Abarrote", "kg", 0],
  ["Semillas de chía", "Abarrote", "kg", 0],
  ["Arroz grano largo", "Abarrote", "kg", 0],
  ["Arroz grano corto", "Abarrote", "kg", 0],
  ["Pasta de tamarindo concentrada", "Abarrote", "kg", 0],
  // Crema / gourmet
  ["Cocoa alcalina", "Abarrote", "kg", 0],
  ["Mermelada de fresa espesa", "Abarrote", "kg", 0],
  ["Mermelada horneable de frutos rojos", "Abarrote", "kg", 0],
  ["Nuez pecana", "Abarrote", "kg", 0],
  ["Caramelo líquido", "Abarrote", "kg", 0],
  ["Galletas Oreo", "Abarrote", "kg", 0],
  ["Galleta Graham o María", "Abarrote", "kg", 0],
  ["Pasta sabor piña colada", "Abarrote", "kg", 0],
  ["Polvo de taro", "Abarrote", "kg", 0],
  ["Pasta pura de pistache", "Abarrote", "kg", 0],
  ["Pistache natural pelado", "Abarrote", "kg", 0],
  ["Chispas de chocolate cobertura", "Abarrote", "kg", 0],
  ["Concentrado de guanábana", "Abarrote", "ml", 0],
  ["Pasta o extracto de mamey", "Abarrote", "kg", 0],
  // Picosas
  ["Chamoy Mega", "Abarrote", "L", 0],
  ["Chamoy El Chilerito", "Abarrote", "L", 0],
  ["Tajín Clásico", "Abarrote", "kg", 0],
  ["Tajín Habanero", "Abarrote", "kg", 0],
  ["Skwinkles Salsagheti", "Abarrote", "kg", 0],
  ["Saborizante de mango o tamarindo", "Abarrote", "ml", 0],
  ["Chile piquín molido", "Abarrote", "kg", 0],
  // Café
  ["Café soluble liofilizado", "Abarrote", "kg", 0],
  ["Café molido tueste medio-oscuro", "Abarrote", "kg", 0],
  ["Salsa de caramelo espesa", "Abarrote", "kg", 0],
  ["Concentrado de horchata", "Abarrote", "L", 0],
  ["Cold Brew concentrado", "Abarrote", "L", 0],
  ["Matcha culinario premium", "Abarrote", "kg", 0],
  ["Jarabe de avellana", "Abarrote", "L", 0],
  ["Avellana tostada", "Abarrote", "kg", 0],
];

const BASE_ARCY = {
  nombre: "Base Arcy Crema (VIC)",
  unidad: "L",
  rinde: 4.8,
  items: [["Leche entera", 4.0], ["Azúcar", 0.6], ["Base en polvo Arcy VIC", 0.4], ["Extracto de vainilla oscura", 10]],
  notas: "OJO: cantidades de ejemplo. Edita la base con tu formulación real de VIC antes de costear.",
};

const RECETAS_SEED = [
  // ── Línea 1 · Agua / Frutal ──
  ["Mango", "Agua/Frutal", [["Mango Ataulfo", 2.1], ["Jugo de limón", 0.06], ["Ácido cítrico", 0.005], ["Agua purificada", 2.0], ["Azúcar", 0.75]],
    "1.8 kg pulpa + 300 g en trocitos al molde. Sin limón la paleta queda plana en frío."],
  ["Uva", "Agua/Frutal", [["Jugo de uva morada", 2.2], ["Esencia de uva", 4], ["Ácido cítrico", 0.006], ["Agua purificada", 1.8], ["Azúcar", 0.8]],
    "Uva morada o Concord, nunca verde. La esencia es el seguro de que llegue el sabor."],
  ["Maracuyá", "Agua/Frutal", [["Maracuyá", 1.2], ["Agua purificada", 2.8], ["Azúcar", 0.8]],
    "Mitad colada, mitad con semilla al final. Apuntar a 18-20 °Brix."],
  ["Kiwi", "Agua/Frutal", [["Kiwi", 2.0], ["Jugo de limón", 0.05], ["Agua purificada", 1.8], ["Azúcar", 0.75]],
    "CRÍTICO: triturar a mano, NUNCA licuar. Semillas rotas = mezcla amarga. Rodaja pegada al molde."],
  ["Frutos Rojos", "Agua/Frutal", [["Mix frutos rojos congelados", 1.6], ["Jugo de arándano natural", 0.4], ["Jugo de limón", 0.04], ["Agua purificada", 2.0], ["Azúcar", 0.8]],
    "Macerar con 200 g del azúcar 30 min. Licuar 2/3, dejar 1/3 en trozos. El limón fija el color."],
  ["Tamarindo", "Agua/Frutal", [["Pasta de tamarindo concentrada", 0.7], ["Sal fina", 0.004], ["Agua purificada", 3.3], ["Azúcar", 0.8]],
    "Disolver en agua tibia, no caliente. La sal no se siente: amplifica ácido y dulce."],
  ["Sandía", "Agua/Frutal", [["Sandía sin semilla", 3.5], ["Jugo de limón", 0.08], ["Agua purificada", 0.6], ["Azúcar", 0.55]],
    "Almíbar denso con los 600 mL. Azúcar muy baja: si cristaliza, subir a 620 g."],
  ["Guayaba", "Agua/Frutal", [["Guayaba rosa", 2.0], ["Canela en polvo", 0.002], ["Jugo de limón", 0.03], ["Agua purificada", 2.0], ["Azúcar", 0.78]],
    "Hervir 5 min máximo. Colar fino. La pectina da textura casi cremosa."],
  ["Limón, Chía y Menta", "Agua/Frutal", [["Jugo de limón", 0.65], ["Limón persa (pieza)", 4], ["Hojas de menta fresca", 0.035], ["Semillas de chía", 0.12], ["Agua purificada", 3.2], ["Azúcar", 0.83]],
    "Chía hidratada 20 min. Menta licuada 10 seg máximo o amarga. La ralladura es el ingrediente secreto."],
  ["Piña con Hierbabuena", "Agua/Frutal", [["Piña miel", 2.2], ["Hierbabuena fresca", 0.045], ["Jugo de limón", 0.03], ["Agua purificada", 1.8], ["Azúcar", 0.7]],
    "1.8 kg licuada + 400 g en cubos. Si la piña está muy madura, bajar azúcar a 650 g."],
  ["Piña-Coco", "Agua/Frutal", [["Jugo de piña natural", 1.5], ["Agua de coco natural", 1.5], ["Coco rallado", 0.18], ["Esencia de coco", 5], ["Agua purificada", 0.8], ["Azúcar", 0.6]],
    "Agua de coco, NO leche de coco. Hidratar el coco rallado 15 min o queda duro."],
  ["Fresa-Albahaca", "Agua/Frutal", [["Fresa", 2.0], ["Albahaca genovesa", 0.035], ["Jugo de limón", 0.04], ["Agua purificada", 2.0], ["Azúcar", 0.73]],
    "CRÍTICO: blanquear albahaca 5 seg exactos y al hielo. Sin blanquear se oxida y la paleta sale negra."],
  ["Jamaica-Romero", "Agua/Frutal", [["Flor de jamaica seca", 0.18], ["Romero fresco", 0.025], ["Ácido cítrico", 0.003], ["Agua purificada", 4.0], ["Azúcar", 0.82]],
    "TIMER: infusión tapada 12-15 min. Más tiempo y el romero amarga. Candidata a paleta insignia."],
  ["Horchata de Agua", "Agua/Frutal", [["Arroz grano largo", 0.38], ["Canela en raja", 2], ["Extracto de vainilla oscura", 25], ["Agua purificada", 4.0], ["Azúcar", 0.82]],
    "Remojo 4 h mínimo. Colar con doble manta de cielo o queda arenosa. NO lleva Arcy."],
  ["Pepino-Limón-Chile", "Agua/Frutal", [["Pepino", 2.5], ["Jugo de limón", 0.22], ["Tajín Clásico", 0.12], ["Agua purificada", 1.3], ["Azúcar", 0.73]],
    "80 g Tajín en mezcla + 40 g en molde. Nunca licuar el Tajín: batidor de globo."],
  ["Naranja-Zanahoria", "Agua/Frutal", [["Jugo de naranja natural", 2.5], ["Jugo de zanahoria", 1.0], ["Jugo de limón", 0.05], ["Jengibre fresco", 0.008], ["Agua purificada", 0.6], ["Azúcar", 0.6]],
    "OXIDACIÓN: la zanahoria se hace café en minutos. Limón primero y trabajar rápido."],

  // ── Línea 2 · Crema / Gourmet ──
  ["Vainilla", "Crema/Gourmet", [["Pasta concentrada de vainilla", 0.09], ["Vaina de vainilla", 1], ["Base Arcy Crema (VIC)", 4.7]],
    "Pasta, no extracto. Sin colorante: la Arcy ya da tono marfil."],
  ["Chocolate", "Crema/Gourmet", [["Cocoa alcalina", 0.32], ["Extracto de vainilla oscura", 15], ["Sal fina", 0.004], ["Base Arcy Crema (VIC)", 4.5]],
    "Cocoa en lluvia sobre 1 L de base a 60 °C. Cocoa alcalina, no natural cruda. La sal no se omite."],
  ["Fresas con Crema", "Crema/Gourmet", [["Fresa", 1.2], ["Extracto de vainilla oscura", 20], ["Mermelada de fresa espesa", 0.3], ["Base Arcy Crema (VIC)", 3.5]],
    "Cubos medianos, deben sentirse al morder. Mermelada en espiral con palillo."],
  ["Coco", "Crema/Gourmet", [["Crema de coco Calahua", 0.9], ["Esencia de coco", 10], ["Coco rallado", 0.3], ["Base Arcy Crema (VIC)", 3.5]],
    "AZÚCAR: preparar la Arcy con 30% menos azúcar o queda empalagoso."],
  ["Arroz con Leche", "Crema/Gourmet", [["Arroz grano corto", 0.35], ["Canela en raja", 3], ["Canela en polvo", 0.008], ["Extracto de vainilla oscura", 25], ["Agua purificada", 0.9], ["Base Arcy Crema (VIC)", 3.5]],
    "CRÍTICO: el arroz debe estar 100% frío. Caliente destruye la emulsión de la Arcy."],
  ["Nuez Pecana", "Crema/Gourmet", [["Nuez pecana", 0.6], ["Extracto de vainilla oscura", 15], ["Caramelo líquido", 0.15], ["Base Arcy Crema (VIC)", 4.5]],
    "Tostar toda la nuez 10 min a 160 °C. Cruda no sabe a nada en frío."],
  ["Cookies and Cream", "Crema/Gourmet", [["Galletas Oreo", 0.75], ["Extracto de vainilla oscura", 20], ["Base Arcy Crema (VIC)", 4.0]],
    "3 tamaños: 250 g polvo, 250 g trozos, 250 g mitades al molde. Máximo 250 g en polvo."],
  ["Piña Colada", "Crema/Gourmet", [["Pasta sabor piña colada", 0.1], ["Piña en almíbar", 0.8], ["Esencia de coco", 5], ["Base Arcy Crema (VIC)", 4.0]],
    "ALERTA: NUNCA piña fresca cruda. La bromelina corta y amarga la Arcy. Solo almíbar o hervida 5 min."],
  ["Taro", "Crema/Gourmet", [["Polvo de taro", 0.55], ["Extracto de vainilla oscura", 10], ["Base Arcy Crema (VIC)", 4.3]],
    "AZÚCAR: el polvo ya trae 40-60%. Reducir la Arcy 35-40%. Buscar proveedor de bubble tea."],
  ["Pistache", "Crema/Gourmet", [["Pasta pura de pistache", 0.3], ["Pistache natural pelado", 0.15], ["Extracto de almendra", 5], ["Base Arcy Crema (VIC)", 4.5]],
    "El extracto de almendra amplifica el pistache sin saber a almendra. Pistaches sin sal."],
  ["Cheesecake", "Crema/Gourmet", [["Queso crema Philadelphia", 0.8], ["Jugo de limón", 0.03], ["Extracto de vainilla oscura", 15], ["Galleta Graham o María", 0.25], ["Mermelada de fresa espesa", 0.3], ["Base Arcy Crema (VIC)", 3.7]],
    "Queso a temperatura ambiente 1 h o hace grumos. La de mayor costo de insumos: cuidar el precio."],
  ["Zarzamora con Philadelphia", "Crema/Gourmet", [["Queso crema Philadelphia", 0.7], ["Zarzamora", 0.6], ["Mermelada horneable de frutos rojos", 0.4], ["Jugo de limón", 0.02], ["Base Arcy Crema (VIC)", 3.5]],
    "Relleno horneable > mermelada normal: no se congela tan duro. Zarzamora congelada es válida."],
  ["Menta Nevada", "Crema/Gourmet", [["Esencia de menta blanca", 15], ["Chispas de chocolate cobertura", 0.35], ["Colorante verde menta", 0.2], ["Base Arcy Crema (VIC)", 4.5]],
    "15 mL es el punto; con 20+ sabe a pasta de dientes. Verde muy tenue."],
  ["Guanábana", "Crema/Gourmet", [["Guanábana", 1.5], ["Concentrado de guanábana", 30], ["Jugo de limón", 0.015], ["Base Arcy Crema (VIC)", 3.3]],
    "SEMILLAS TÓXICAS: revisar dos veces. Integrar con espátula, no licuadora. Oxida rapidísimo."],
  ["Mamey", "Crema/Gourmet", [["Mamey", 1.4], ["Pasta o extracto de mamey", 0.025], ["Extracto de vainilla oscura", 10], ["Base Arcy Crema (VIC)", 3.5]],
    "Sin colorante si está maduro. Pulpa congelada pasteurizada sirve fuera de temporada."],

  // ── Línea 3 · Picosas ──
  ["Mangonada Extrema", "Picosas", [["Mango Ataulfo", 2.0], ["Chamoy Mega", 0.35], ["Tajín Clásico", 0.07], ["Jugo de limón", 0.05], ["Agua purificada", 1.7], ["Azúcar", 0.68]],
    "Chamoy en PAREDES del molde con brocha, pre-congelar 5 min. El chamoy pide 3-5 min más de ciclo."],
  ["Piña Loca", "Picosas", [["Piña miel", 2.2], ["Chamoy Mega", 0.28], ["Tajín Clásico", 0.08], ["Jugo de limón", 0.03], ["Agua purificada", 1.6], ["Azúcar", 0.58]],
    "50 g Tajín en mezcla + 30 g sobre el chamoy del molde. 400 g de piña en cubos sin licuar."],
  ["Furia Tropical", "Picosas", [["Mango Ataulfo", 1.0], ["Maracuyá", 0.5], ["Piña miel", 0.5], ["Chamoy Mega", 0.35], ["Tajín Habanero", 0.035], ["Jugo de limón", 0.04], ["Agua purificada", 1.5], ["Azúcar", 0.6]],
    "Tajín Habanero: 35-40 g y no más. La más picosa del catálogo: etiquetarla en vitrina."],
  ["Sandía Brava", "Picosas", [["Sandía sin semilla", 3.0], ["Chamoy Mega", 0.35], ["Tajín Clásico", 0.1], ["Jugo de limón", 0.08], ["Agua purificada", 0.7], ["Azúcar", 0.5]],
    "8 mL de chamoy al fondo, pre-congelar 7 min exactos. Azúcar muy baja: si cristaliza, subir a 560 g."],
  ["Pica Limón", "Picosas", [["Jugo de limón", 0.75], ["Chamoy Mega", 0.45], ["Tajín Clásico", 0.12], ["Agua purificada", 2.6], ["Azúcar", 0.87]],
    "Azúcar alta justificada por la acidez. Chamoy en paredes + Tajín encima es la identidad visual."],
  ["Bomba de Tamarindo", "Picosas", [["Pasta de tamarindo concentrada", 1.2], ["Chamoy Mega", 0.35], ["Tajín Clásico", 0.08], ["Sal fina", 0.004], ["Agua purificada", 2.5], ["Azúcar", 0.75]],
    "50 mL chamoy en mezcla + 300 mL en molde. La picosa más estable en congelación."],
  ["Skwinkles Mania", "Picosas", [["Skwinkles Salsagheti", 0.6], ["Chamoy El Chilerito", 0.25], ["Tajín Clásico", 0.05], ["Saborizante de mango o tamarindo", 30], ["Agua purificada", 2.5], ["Azúcar", 0.7]],
    "15 g de tiras por molde, verticales y visibles. La más económica de la línea con el mayor WOW."],
  ["Jícama-Limón-Chile", "Picosas", [["Jícama", 2.0], ["Jugo de limón", 0.28], ["Tajín Clásico", 0.09], ["Chile piquín molido", 0.01], ["Agua purificada", 1.6], ["Azúcar", 0.78]],
    "Colar fino o queda arenosa. Sin chamoy: la versión blanca con puntos rojos es más elegante."],
  ["Pepino-Tajín", "Picosas", [["Pepino", 2.5], ["Jugo de limón", 0.2], ["Tajín Clásico", 0.11], ["Agua purificada", 1.2], ["Azúcar", 0.7]],
    "Licuar CON cáscara para el verde brillante. 40 g Tajín en paredes + 70 g en mezcla."],

  // ── Línea 4 · Café / Cafetería ──
  ["Espresso Negro", "Café/Cafetería", [["Café soluble liofilizado", 0.09], ["Extracto de vainilla oscura", 8], ["Agua purificada", 4.0], ["Azúcar morena o de caña", 0.8]],
    "Paleta de AGUA, no lleva Arcy. Arrancar con soluble, migrar a espresso real después."],
  ["Latte Cremoso", "Café/Cafetería", [["Café soluble liofilizado", 0.085], ["Extracto de vainilla oscura", 15], ["Base Arcy Crema (VIC)", 4.7]],
    "No pasar de 65 °C con la Arcy o se rompe la emulsión. Es la madre de toda la línea cremosa de café."],
  ["Caramel Latte", "Café/Cafetería", [["Café soluble liofilizado", 0.07], ["Salsa de caramelo espesa", 0.5], ["Extracto de vainilla oscura", 10], ["Base Arcy Crema (VIC)", 4.2]],
    "AZÚCAR: Arcy con 25% menos. El caramelo no congela del todo: mordida suave al centro."],
  ["Mokaccino", "Café/Cafetería", [["Cocoa alcalina", 0.14], ["Café soluble liofilizado", 0.07], ["Sal fina", 0.003], ["Extracto de vainilla oscura", 10], ["Base Arcy Crema (VIC)", 4.3]],
    "Comparte base de cocoa con el Chocolate #18: producir ambas en el mismo lote."],
  ["Horchata-Espresso", "Café/Cafetería", [["Concentrado de horchata", 0.65], ["Café soluble liofilizado", 0.06], ["Canela en polvo", 0.005], ["Base Arcy Crema (VIC)", 3.4]],
    "AZÚCAR: Arcy 40% menos. Bicolor: media capa horchata, cuajar 8-10 min, capa de café."],
  ["Cold Brew Coco", "Café/Cafetería", [["Cold Brew concentrado", 1.5], ["Crema de coco Calahua", 0.9], ["Esencia de coco", 5], ["Base Arcy Crema (VIC)", 2.4]],
    "PLANEAR: el cold brew se macera 18-24 h antes. AZÚCAR: Arcy 50% menos."],
  ["Café de Olla", "Café/Cafetería", [["Café molido tueste medio-oscuro", 0.28], ["Piloncillo oscuro", 0.75], ["Canela en raja", 4], ["Clavo de olor", 3], ["Anís estrella", 1], ["Agua purificada", 5.5]],
    "Paleta de AGUA. TIMER: 8 min de infusión, ni uno más. Hervir 5.5 L, quedan 4.8."],
  ["Matcha Latte", "Café/Cafetería", [["Matcha culinario premium", 0.06], ["Base Arcy Crema (VIC)", 4.7]],
    "Agua a 80 °C exactos, nunca hirviendo. Culinario premium, no ceremonial. ~12.5 g/L."],
  ["Avellana-Latte", "Café/Cafetería", [["Jarabe de avellana", 0.3], ["Café soluble liofilizado", 0.07], ["Avellana tostada", 0.12], ["Base Arcy Crema (VIC)", 4.3]],
    "AZÚCAR: Arcy 30% menos por el jarabe. La más 'cafetería de especialidad' del catálogo."],
  ["Moka-Frutos Rojos", "Café/Cafetería", [["Cocoa alcalina", 0.11], ["Café soluble liofilizado", 0.06], ["Mermelada horneable de frutos rojos", 0.5], ["Sal fina", 0.003], ["Base Arcy Crema (VIC)", 3.9]],
    "Mermelada untada en la PARED del molde: queda en la superficie. La más sofisticada del catálogo."],
];


const uid = () => Math.random().toString(36).slice(2, 10);
// Fecha local (no UTC): capturar en la noche no debe caer al día siguiente
const hoy = () => new Date().toLocaleDateString("en-CA");
const mxn = (n) => (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
const num = (n, d = 2) => (Number(n) || 0).toLocaleString("es-MX", { maximumFractionDigits: d });
const claveMes = (f) => (f || "").slice(0, 7);

/* ── Reglas de costo ───────────────────────────────────────── */
// Lo que compras trae cáscara, hueso y desperdicio. Esto es lo que
// de verdad cuesta la unidad que sí entra a la paleta.
const costoUtil = (i) => {
  const m = Math.min(95, Number(i.merma) || 0);
  return (i.costoProm || 0) / (1 - m / 100);
};

/* Familias de unidades convertibles y su factor a la unidad chica */
const FAMILIA = { kg: "masa", g: "masa", L: "volumen", ml: "volumen" };
const A_CHICA = { kg: 1000, g: 1, L: 1000, ml: 1 };
// Cuántas unidades NUEVAS hay en una unidad VIEJA. kg → g devuelve 1000.
const factorUnidad = (vieja, nueva) => {
  if (vieja === nueva) return 1;
  if (!FAMILIA[vieja] || FAMILIA[vieja] !== FAMILIA[nueva]) return null;
  return A_CHICA[vieja] / A_CHICA[nueva];
};

const costoBaseTeorico = (b, insumos) =>
  b.items.reduce((a, it) => {
    const i = insumos.find((x) => x.id === it.insumoId);
    return a + (i ? costoUtil(i) * it.cantidad : 0);
  }, 0);

const costoUnidadBase = (b, insumos) =>
  b.costoProm > 0 ? b.costoProm : b.rinde > 0 ? costoBaseTeorico(b, insumos) / b.rinde : 0;

const partesReceta = (r, data) =>
  r.items.map((it, idx) => {
    if (it.tipo === "base") {
      const b = data.bases.find((x) => x.id === it.refId);
      if (!b) return null;
      return { nombre: b.nombre, esBase: true, unidad: b.unidad, cantidad: it.cantidad,
        costo: costoUnidadBase(b, data.insumos) * it.cantidad, color: CELL_COLORS[idx % CELL_COLORS.length] };
    }
    const i = data.insumos.find((x) => x.id === it.refId);
    if (!i) return null;
    return { nombre: i.nombre, esBase: false, unidad: i.unidad, cantidad: it.cantidad, merma: Number(i.merma) || 0,
      sinCosto: !i.costoProm, costo: costoUtil(i) * it.cantidad, color: CELL_COLORS[idx % CELL_COLORS.length] };
  }).filter(Boolean);

const costoReceta = (r, data) => partesReceta(r, data).reduce((a, p) => a + p.costo, 0);

/* Trae datos de versiones anteriores sin perder nada */
const migrar = (d) => {
  const out = { ...DEFAULTS, ...d, version: 3 };
  out.bases = (out.bases || []).map((b) => ({ stock: 0, costoProm: 0, items: [], ...b }));
  out.insumos = (out.insumos || []).map((i) => ({ tipo: "Otro", merma: 0, historial: [], ultimoCosto: i.costoProm || 0, ...i }));
  out.recetas = (out.recetas || []).map((r) => ({
    ...r,
    stock: r.stock || 0,
    precioMenudeo: r.precioMenudeo ?? r.precioVenta ?? 0,
    precioMayoreo: r.precioMayoreo ?? 0,
    items: (r.items || []).map((it) => (it.tipo ? it : { tipo: "insumo", refId: it.insumoId, cantidad: it.cantidad })),
  }));
  // Versión muy vieja: gastos e ingresos venían en listas separadas.
  if (!out.movimientos?.length && (d?.gastos?.length || d?.ingresos?.length)) {
    out.movimientos = [
      ...(d.gastos || []).map((g) => ({ id: uid(), tipo: "gasto", fecha: g.fecha, monto: (Number(g.cantidad) || 1) * (Number(g.precioUnit) || 0),
        categoria: g.categoria || "Otros", lugar: g.lugar || "", notas: g.notas || g.descripcion || "", cantidad: 0, piezas: 0 })),
      ...(d.ingresos || []).map((i) => ({ id: uid(), tipo: "ingreso", fecha: i.fecha, monto: (Number(i.piezas) || 1) * (Number(i.precioUnit) || 0),
        canal: i.canal || "Otro", lugar: "", notas: i.notas || i.descripcion || "", cantidad: 0, piezas: 0 })),
    ];
  }
  return out;
};

/* ── Estilos ───────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap');
:root{
  --tinta:#0E2A31; --tinta-70:#4A6B72; --tinta-40:#8FA6AB;
  --escarcha:#EDF2F2; --papel:#FFFFFF; --linea:#D8E2E2;
  --teal:#1FA39C; --ambar:#E0A32E; --chile:#D0402E; --cafe:#7A5340;
}
*{box-sizing:border-box}
.fq{background:var(--escarcha);color:var(--tinta);min-height:100vh;
  font-family:'IBM Plex Sans',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.fq-disp{font-family:'Archivo',ui-sans-serif,system-ui,sans-serif;font-weight:800;letter-spacing:-0.02em}
.fq-num{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.fq-eyebrow{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--tinta-40)}
.fq-card{background:var(--papel);border:1px solid var(--linea);border-radius:14px}
.fq-in{width:100%;background:var(--papel);border:1px solid var(--linea);border-radius:9px;
  padding:9px 11px;font-size:15px;color:var(--tinta);font-family:inherit;outline:none}
.fq-in:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(31,163,156,.16)}
.fq-lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--tinta-70);
  margin-bottom:4px;display:block;font-weight:600}
.fq-hint{font-size:11px;color:var(--tinta-40);margin-top:4px;line-height:1.4}
.fq-btn{background:var(--tinta);color:#fff;border:0;border-radius:9px;padding:10px 15px;
  font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.fq-btn:hover{background:#164048}
.fq-btn:disabled{opacity:.4;cursor:not-allowed}
.fq-btn.ghost{background:transparent;color:var(--tinta-70);border:1px solid var(--linea)}
.fq-btn.ghost:hover{background:var(--escarcha);color:var(--tinta)}
.fq-btn.danger{background:transparent;color:var(--chile);border:1px solid var(--linea)}
.fq-btn:focus-visible,.fq-in:focus-visible,.fq-tab:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.fq-tab{border:0;background:transparent;padding:11px 4px;font-size:13px;font-weight:600;
  cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;white-space:nowrap}
.fq-chip{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;cursor:pointer;
  border:1px solid var(--linea);color:var(--tinta-70);background:var(--escarcha);font-family:inherit;white-space:nowrap}
.fq-row{display:flex;justify-content:space-between;align-items:center;gap:10px;
  padding:11px 13px;border-bottom:1px solid var(--linea)}
.fq-row:last-child{border-bottom:0}
.fq-grid{display:grid;gap:10px}
.fq-molde{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}
.fq-celda{aspect-ratio:1/2.4;border-radius:2px 2px 5px 5px}
.fq-empty{padding:26px 16px;text-align:center;color:var(--tinta-70);font-size:14px;line-height:1.5}
.fq-merma{height:6px;border-radius:6px;background:var(--linea);overflow:hidden;display:flex}
@media (max-width:520px){.fq-grid[data-col3]{grid-template-columns:1fr!important}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/* ── UI base ───────────────────────────────────────────────── */
const Campo = ({ label, hint, children }) => (
  <div><span className="fq-lbl">{label}</span>{children}{hint && <div className="fq-hint">{hint}</div>}</div>
);

const Metrica = ({ eyebrow, valor, color, sub }) => (
  <div className="fq-card" style={{ padding: "13px 14px" }}>
    <div className="fq-eyebrow">{eyebrow}</div>
    <div className="fq-num" style={{ fontSize: 20, fontWeight: 600, color: color || "var(--tinta)", marginTop: 4 }}>{valor}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--tinta-40)", marginTop: 3, lineHeight: 1.35 }}>{sub}</div>}
  </div>
);

/* ── App ───────────────────────────────────────────────────── */
export default function FresquitoFinanzas() {
  const [data, setData] = useState(DEFAULTS);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("panel");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await api.leerLibro();
        if (d) setData(migrar(d));
      } catch {
        setAviso("No se pudo abrir el libro. Revisa la conexión con Supabase (client/.env).");
      }
      setCargando(false);
    })();
  }, []);

  // Si la otra persona guarda desde su dispositivo, recarga el libro.
  useEffect(() => {
    return api.suscribirLibro(async () => {
      try {
        const d = await api.leerLibro();
        if (d) setData(migrar(d));
      } catch {}
    });
  }, []);

  const guardar = async (nuevo) => {
    setData(nuevo);
    try {
      await api.guardarLibro(nuevo);
    } catch {
      setAviso("No se guardó el cambio. Revisa tu conexión y vuelve a intentarlo.");
      setTimeout(() => setAviso(""), 4500);
    }
  };
  const set = (parche) => guardar({ ...data, ...parche });

  if (cargando)
    return (
      <div className="fq" style={{ display: "grid", placeItems: "center", padding: 40 }}>
        <style>{CSS}</style><div className="fq-eyebrow">Abriendo el libro…</div>
      </div>
    );

  const tabs = [
    ["panel", "Panel"], ["movimientos", "Movimientos"], ["insumos", "Insumos"],
    ["bases", "Bases"], ["paletas", "Paletas"], ["graficas", "Gráficas"], ["ajustes", "Ajustes"],
  ];

  return (
    <div className="fq">
      <style>{CSS}</style>
      <header style={{ background: "var(--tinta)", color: "#fff", padding: "16px 16px 0" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
            <span className="fq-disp" style={{ fontSize: 21 }}>Fresquito</span>
            <span className="fq-eyebrow" style={{ color: "rgba(255,255,255,.5)" }}>Libro de finanzas · Cancún</span>
          </div>
          <nav style={{ display: "flex", gap: 16, marginTop: 12, overflowX: "auto" }}>
            {tabs.map(([k, l]) => (
              <button key={k} className="fq-tab" onClick={() => setVista(k)}
                style={{ color: vista === k ? "#fff" : "rgba(255,255,255,.55)", borderBottomColor: vista === k ? "var(--teal)" : "transparent" }}>
                {l}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {aviso && <div style={{ background: "var(--teal)", color: "#fff", padding: "9px 16px", fontSize: 13 }}>{aviso}</div>}

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "16px 12px 60px" }}>
        {vista === "panel" && <Panel data={data} />}
        {vista === "movimientos" && <Movimientos data={data} guardar={guardar} />}
        {vista === "insumos" && <Insumos data={data} set={set} />}
        {vista === "bases" && <Bases data={data} guardar={guardar} />}
        {vista === "paletas" && <Paletas data={data} guardar={guardar} />}
        {vista === "graficas" && <Graficas data={data} />}
        {vista === "ajustes" && <Ajustes data={data} set={set} guardar={guardar} />}
      </main>
    </div>
  );
}

/* ── Panel ─────────────────────────────────────────────────── */
function Panel({ data }) {
  const mes = claveMes(hoy());
  const delMes = data.movimientos.filter((m) => claveMes(m.fecha) === mes);
  const ing = delMes.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const egr = delMes.filter((m) => m.tipo === "gasto").reduce((a, m) => a + m.monto, 0);
  const util = ing - egr;

  const valInsumos = data.insumos.reduce((a, i) => a + i.stock * i.costoProm, 0);
  const valBases = data.bases.reduce((a, b) => a + b.stock * costoUnidadBase(b, data.insumos), 0);
  const valPaletas = data.recetas.reduce((a, r) => a + (r.stock || 0) * (r.piezas > 0 ? costoReceta(r, data) / r.piezas : 0), 0);
  const piezasEnStock = data.recetas.reduce((a, r) => a + (r.stock || 0), 0);
  const sinCosto = data.insumos.filter((i) => !i.costoProm).length;

  const serie = useMemo(() => {
    const mapa = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      mapa[d.toISOString().slice(0, 7)] = { mes: MESES[d.getMonth()], Ingresos: 0, Egresos: 0 };
    }
    data.movimientos.forEach((m) => {
      const k = claveMes(m.fecha);
      if (mapa[k]) mapa[k][m.tipo === "ingreso" ? "Ingresos" : "Egresos"] += m.monto;
    });
    return Object.values(mapa);
  }, [data.movimientos]);

  const bajos = data.insumos.filter((i) => i.stockMin > 0 && i.stock <= i.stockMin);

  return (
    <div className="fq-grid">
      {sinCosto > 0 && (
        <div className="fq-card" style={{ padding: "12px 14px", borderColor: "var(--ambar)" }}>
          <div className="fq-eyebrow" style={{ color: "var(--ambar)" }}>Pendiente</div>
          <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.45 }}>
            Hay {sinCosto} insumos sin precio. Mientras no los captures, el costeo de esos sabores sale incompleto.
          </div>
        </div>
      )}

      <div className="fq-grid" data-col3 style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Metrica eyebrow="Ingresos del mes" valor={mxn(ing)} color="var(--teal)" />
        <Metrica eyebrow="Egresos del mes" valor={mxn(egr)} color="var(--chile)" />
        <Metrica eyebrow="Utilidad" valor={mxn(util)} color={util >= 0 ? "var(--tinta)" : "var(--chile)"}
          sub={ing > 0 ? `Margen ${num((util / ing) * 100, 1)}%` : "Sin ingresos este mes"} />
      </div>

      <div className="fq-grid" data-col3 style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Metrica eyebrow="Insumos en almacén" valor={mxn(valInsumos)} />
        <Metrica eyebrow="Bases hechas" valor={mxn(valBases)} sub={`${num(data.bases.reduce((a, b) => a + b.stock, 0), 1)} L listos`} />
        <Metrica eyebrow="Paletas terminadas" valor={mxn(valPaletas)} sub={`${num(piezasEnStock, 0)} piezas al costo`} />
      </div>

      <div className="fq-card" style={{ padding: 14 }}>
        <div className="fq-eyebrow">Últimos 6 meses</div>
        <div style={{ height: 210, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie}>
              <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={46} />
              <Tooltip formatter={(v) => mxn(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ingresos" fill="#1FA39C" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Egresos" fill="#D0402E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="fq-card">
        <div style={{ padding: "12px 14px 0" }} className="fq-eyebrow">Insumos por reponer</div>
        {bajos.length === 0 ? (
          <div className="fq-empty">Ningún insumo está por debajo de su mínimo.</div>
        ) : bajos.map((i) => (
          <div className="fq-row" key={i.id}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{i.nombre}</span>
            <span className="fq-num" style={{ color: "var(--chile)", fontSize: 13 }}>
              quedan {num(i.stock)} {i.unidad} · mínimo {num(i.stockMin)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Movimientos ───────────────────────────────────────────── */
function Movimientos({ data, guardar }) {
  const base = {
    tipo: "gasto", fecha: hoy(), monto: "", categoria: "Insumos", lugar: "",
    canal: "Evento / carrito", notas: "", insumoId: "", cantidad: "", mayoreo: false,
    recurrente: false, recetaId: "", piezas: "", capturadoPor: data.ajustes.usuario || "",
  };
  const [f, setF] = useState(base);
  const [filtro, setFiltro] = useState("todos");
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const receta = data.recetas.find((r) => r.id === f.recetaId);

  const proponerMonto = (recetaId, piezas, mayoreo) => {
    const r = data.recetas.find((x) => x.id === recetaId);
    if (!r || !piezas) return "";
    const p = mayoreo ? r.precioMayoreo : r.precioMenudeo;
    return p > 0 ? String(Number(piezas) * p) : "";
  };

  const agregar = () => {
    if (!f.monto || Number(f.monto) <= 0) return;
    const mov = { ...f, id: uid(), monto: Number(f.monto), cantidad: Number(f.cantidad) || 0, piezas: Number(f.piezas) || 0 };
    let insumos = data.insumos;
    let recetas = data.recetas;

    if (mov.tipo === "gasto" && mov.insumoId && mov.cantidad > 0) {
      insumos = insumos.map((i) => {
        if (i.id !== mov.insumoId) return i;
        const stock = i.stock + mov.cantidad;
        const costoProm = stock > 0 ? (i.stock * i.costoProm + mov.monto) / stock : 0;
        const precioCompra = mov.monto / mov.cantidad;
        return { ...i, stock, costoProm, ultimoCosto: precioCompra,
          historial: [...(i.historial || []), { fecha: mov.fecha, costo: precioCompra }].slice(-40),
          precioUnit: mov.mayoreo ? i.precioUnit : precioCompra,
          precioMayoreo: mov.mayoreo ? precioCompra : i.precioMayoreo,
          lugar: mov.lugar || i.lugar };
      });
    }
    if (mov.tipo === "ingreso" && mov.recetaId && mov.piezas > 0) {
      recetas = recetas.map((r) => (r.id === mov.recetaId ? { ...r, stock: Math.max(0, (r.stock || 0) - mov.piezas) } : r));
    }
    guardar({ ...data, insumos, recetas, movimientos: [mov, ...data.movimientos] });
    setF({ ...base, tipo: f.tipo, capturadoPor: f.capturadoPor });
  };

  const repetir = (m) => setF({ ...base, ...m, fecha: hoy(), monto: String(m.monto), cantidad: m.cantidad ? String(m.cantidad) : "", piezas: m.piezas ? String(m.piezas) : "" });
  const borrar = (id) => guardar({ ...data, movimientos: data.movimientos.filter((m) => m.id !== id) });

  const lista = data.movimientos.filter((m) => filtro === "todos" || m.tipo === filtro);
  const esGasto = f.tipo === "gasto";
  const insumoSel = data.insumos.find((i) => i.id === f.insumoId);

  return (
    <div className="fq-grid">
      <div className="fq-card" style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["gasto", "ingreso"].map((t) => (
            <button key={t} className={"fq-btn" + (f.tipo === t ? "" : " ghost")}
              style={f.tipo === t ? { background: t === "gasto" ? "var(--chile)" : "var(--teal)" } : {}}
              onClick={() => setF({ ...f, tipo: t })}>
              {t === "gasto" ? "Registrar gasto" : "Registrar ingreso"}
            </button>
          ))}
        </div>

        <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Campo label="Fecha"><input type="date" className="fq-in" value={f.fecha} onChange={c("fecha")} /></Campo>
          <Campo label="Monto (MXN)"><input type="number" inputMode="decimal" className="fq-in" placeholder="0.00" value={f.monto} onChange={c("monto")} /></Campo>
          {esGasto ? (
            <>
              <Campo label="Categoría"><select className="fq-in" value={f.categoria} onChange={c("categoria")}>{CATEGORIAS.map((x) => <option key={x}>{x}</option>)}</select></Campo>
              <Campo label="Lugar o proveedor"><input className="fq-in" placeholder="Ej. Central de abasto" value={f.lugar} onChange={c("lugar")} /></Campo>
            </>
          ) : (
            <>
              <Campo label="Canal"><select className="fq-in" value={f.canal} onChange={c("canal")}>{CANALES.map((x) => <option key={x}>{x}</option>)}</select></Campo>
              <Campo label="Cliente o lugar"><input className="fq-in" placeholder="Ej. Feria del Malecón" value={f.lugar} onChange={c("lugar")} /></Campo>
            </>
          )}
        </div>

        {esGasto && data.insumos.length > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: "var(--escarcha)", borderRadius: 10 }}>
            <div className="fq-eyebrow" style={{ marginBottom: 8 }}>Ligar a almacén (opcional)</div>
            <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Campo label="Insumo comprado">
                <select className="fq-in" value={f.insumoId} onChange={c("insumoId")}>
                  <option value="">— ninguno —</option>
                  {data.insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                </select>
              </Campo>
              <Campo label="Cantidad como la compraste">
                <input type="number" inputMode="decimal" className="fq-in" placeholder="0" value={f.cantidad} onChange={c("cantidad")} />
              </Campo>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 13 }}>
              <input type="checkbox" checked={f.mayoreo} onChange={(e) => setF({ ...f, mayoreo: e.target.checked })} />
              Fue compra de mayoreo
            </label>
            {insumoSel && Number(f.cantidad) > 0 && Number(f.monto) > 0 && (
              <div className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 8, lineHeight: 1.5 }}>
                {mxn(Number(f.monto) / Number(f.cantidad))} por {insumoSel.unidad}
                {insumoSel.costoProm > 0 && ` · tu promedio va en ${mxn(insumoSel.costoProm)}`}
                {Number(insumoSel.merma) > 0 && ` · ya limpio ${mxn((Number(f.monto) / Number(f.cantidad)) / (1 - insumoSel.merma / 100))}`}
              </div>
            )}
          </div>
        )}

        {!esGasto && data.recetas.length > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: "var(--escarcha)", borderRadius: 10 }}>
            <div className="fq-eyebrow" style={{ marginBottom: 8 }}>Venta de paletas (opcional)</div>
            <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Campo label="Sabor">
                <select className="fq-in" value={f.recetaId}
                  onChange={(e) => setF({ ...f, recetaId: e.target.value, monto: proponerMonto(e.target.value, f.piezas, f.mayoreo) || f.monto })}>
                  <option value="">— ninguno —</option>
                  {data.recetas.map((r) => <option key={r.id} value={r.id}>{r.sabor} ({num(r.stock || 0, 0)} en stock)</option>)}
                </select>
              </Campo>
              <Campo label="Piezas vendidas">
                <input type="number" inputMode="numeric" className="fq-in" placeholder="0" value={f.piezas}
                  onChange={(e) => setF({ ...f, piezas: e.target.value, monto: proponerMonto(f.recetaId, e.target.value, f.mayoreo) || f.monto })} />
              </Campo>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
              {[false, true].map((mm) => (
                <button key={String(mm)} className="fq-chip"
                  style={f.mayoreo === mm ? { background: "var(--tinta)", color: "#fff", borderColor: "var(--tinta)" } : {}}
                  onClick={() => setF({ ...f, mayoreo: mm, monto: proponerMonto(f.recetaId, f.piezas, mm) || f.monto })}>
                  {mm ? "Mayoreo" : "Menudeo"}
                </button>
              ))}
            </div>
            {receta && Number(f.piezas) > 0 && (
              <div className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 8 }}>
                A {mxn(f.mayoreo ? receta.precioMayoreo : receta.precioMenudeo)} c/u
                {Number(f.piezas) > (receta.stock || 0) && <span style={{ color: "var(--chile)" }}> · te faltan paletas en inventario</span>}
              </div>
            )}
          </div>
        )}

        <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
          <Campo label="Notas"><input className="fq-in" placeholder="Detalle libre" value={f.notas} onChange={c("notas")} /></Campo>
          <Campo label="Capturó"><input className="fq-in" placeholder="Tu nombre" value={f.capturadoPor} onChange={c("capturadoPor")} /></Campo>
        </div>

        {esGasto && (
          <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 13 }}>
            <input type="checkbox" checked={f.recurrente} onChange={(e) => setF({ ...f, recurrente: e.target.checked })} />
            Es una compra recurrente
          </label>
        )}

        <button className="fq-btn" style={{ marginTop: 13, width: "100%" }} onClick={agregar}>
          Guardar {esGasto ? "gasto" : "ingreso"}
        </button>
      </div>

      <div className="fq-card">
        <div style={{ display: "flex", gap: 6, padding: "12px 13px" }}>
          {[["todos", "Todos"], ["gasto", "Gastos"], ["ingreso", "Ingresos"]].map(([k, l]) => (
            <button key={k} className="fq-chip" onClick={() => setFiltro(k)}
              style={filtro === k ? { background: "var(--tinta)", color: "#fff", borderColor: "var(--tinta)" } : {}}>{l}</button>
          ))}
        </div>
        {lista.length === 0 ? (
          <div className="fq-empty">Todavía no hay movimientos. Captura tu primer gasto o ingreso arriba.</div>
        ) : lista.slice(0, 100).map((m) => (
          <div className="fq-row" key={m.id}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {m.lugar || (m.tipo === "gasto" ? m.categoria : m.canal)}
                {m.recurrente && <span className="fq-chip">recurrente</span>}
                {m.tipo === "ingreso" && m.piezas > 0 && <span className="fq-chip">{m.piezas} pzas · {m.mayoreo ? "mayoreo" : "menudeo"}</span>}
              </div>
              <div className="fq-num" style={{ fontSize: 11, color: "var(--tinta-40)" }}>
                {m.fecha} · {m.tipo === "gasto" ? m.categoria : m.canal}
                {m.capturadoPor ? ` · ${m.capturadoPor}` : ""}{m.notas ? ` · ${m.notas}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span className="fq-num" style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", color: m.tipo === "ingreso" ? "var(--teal)" : "var(--chile)" }}>
                {m.tipo === "ingreso" ? "+" : "−"}{mxn(m.monto)}
              </span>
              <button className="fq-btn ghost" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => repetir(m)}>Repetir</button>
              <button className="fq-btn danger" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => borrar(m.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Insumos ───────────────────────────────────────────────── */
function Insumos({ data, set }) {
  const vacio = { nombre: "", tipo: "Fruta", unidad: "kg", merma: "", stock: "", costoProm: "", lugar: "", stockMin: "", notas: "" };
  const [f, setF] = useState(vacio);
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState(null);
  const [busca, setBusca] = useState("");
  const [soloSinPrecio, setSoloSinPrecio] = useState(false);
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const agregar = () => {
    if (!f.nombre.trim()) return;
    set({
      insumos: [...data.insumos, {
        ...f, id: uid(), nombre: f.nombre.trim(), merma: Number(f.merma) || 0,
        stock: Number(f.stock) || 0, costoProm: Number(f.costoProm) || 0, ultimoCosto: Number(f.costoProm) || 0,
        precioUnit: 0, precioMayoreo: 0, stockMin: Number(f.stockMin) || 0, historial: [],
      }],
    });
    setF(vacio); setAbierto(false);
  };

  const ajustar = (id, d) => set({ insumos: data.insumos.map((i) => (i.id === id ? { ...i, stock: Math.max(0, i.stock + d) } : i)) });
  const TEXTO = ["nombre", "lugar", "notas", "tipo"];
  const editar = (id, k, v) => set({ insumos: data.insumos.map((i) => (i.id === id ? { ...i, [k]: TEXTO.includes(k) ? v : Number(v) || 0 } : i)) });
  const borrar = (id) => set({ insumos: data.insumos.filter((i) => i.id !== id) });

  // Cambiar de kg a g (o de L a ml) convierte existencia, precio, historial
  // y TODAS las cantidades en recetas y bases. Así nada se descuadra.
  const cambiarUnidad = (id, nueva) => {
    const ins = data.insumos.find((x) => x.id === id);
    if (!ins || ins.unidad === nueva) return;
    const f = factorUnidad(ins.unidad, nueva);
    if (f === null) { set({ insumos: data.insumos.map((i) => (i.id === id ? { ...i, unidad: nueva } : i)) }); return; }
    const insumos = data.insumos.map((i) => (i.id !== id ? i : {
      ...i, unidad: nueva,
      stock: i.stock * f,
      stockMin: (i.stockMin || 0) * f,
      costoProm: (i.costoProm || 0) / f,
      ultimoCosto: (i.ultimoCosto || 0) / f,
      historial: (i.historial || []).map((h) => ({ ...h, costo: h.costo / f })),
    }));
    const recetas = data.recetas.map((r) => ({
      ...r, items: r.items.map((it) => (it.tipo === "insumo" && it.refId === id ? { ...it, cantidad: it.cantidad * f } : it)),
    }));
    const bases = data.bases.map((b) => ({
      ...b, items: b.items.map((it) => (it.insumoId === id ? { ...it, cantidad: it.cantidad * f } : it)),
    }));
    set({ insumos, recetas, bases });
  };

  const valorTotal = data.insumos.reduce((a, i) => a + i.stock * i.costoProm, 0);
  const sinPrecio = data.insumos.filter((i) => !i.costoProm).length;
  const lista = data.insumos.filter((i) =>
    i.nombre.toLowerCase().includes(busca.toLowerCase()) && (!soloSinPrecio || !i.costoProm));

  return (
    <div className="fq-grid">
      <div className="fq-grid" data-col3 style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Metrica eyebrow="Valor del almacén" valor={mxn(valorTotal)} />
        <Metrica eyebrow="Insumos" valor={data.insumos.length} />
        <Metrica eyebrow="Sin precio" valor={sinPrecio} color={sinPrecio ? "var(--ambar)" : "var(--teal)"} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input className="fq-in" style={{ flex: 2 }} placeholder="Buscar insumo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="fq-btn ghost" style={{ whiteSpace: "nowrap" }} onClick={() => setSoloSinPrecio(!soloSinPrecio)}
          >{soloSinPrecio ? "Ver todos" : "Sin precio"}</button>
      </div>

      <button className="fq-btn" onClick={() => setAbierto(!abierto)}>{abierto ? "Cancelar" : "Agregar insumo"}</button>

      {abierto && (
        <div className="fq-card" style={{ padding: 14 }}>
          <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Campo label="Nombre"><input className="fq-in" placeholder="Ej. Mango ataulfo" value={f.nombre} onChange={c("nombre")} /></Campo>
            <Campo label="Tipo"><select className="fq-in" value={f.tipo} onChange={c("tipo")}>{TIPOS_INSUMO.map((t) => <option key={t}>{t}</option>)}</select></Campo>
            <Campo label="Unidad de compra"><select className="fq-in" value={f.unidad} onChange={c("unidad")}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</select></Campo>
            <Campo label="Merma (%)" hint={f.tipo === "Fruta" ? MERMA_HINT : "Lo que se tira"}>
              <input type="number" inputMode="decimal" className="fq-in" placeholder="0" value={f.merma} onChange={c("merma")} />
            </Campo>
            <Campo label="Existencia inicial"><input type="number" inputMode="decimal" className="fq-in" placeholder="0" value={f.stock} onChange={c("stock")} /></Campo>
            <Campo label="Costo por unidad"><input type="number" inputMode="decimal" className="fq-in" placeholder="0.00" value={f.costoProm} onChange={c("costoProm")} /></Campo>
            <Campo label="Dónde se compra"><input className="fq-in" placeholder="Proveedor o lugar" value={f.lugar} onChange={c("lugar")} /></Campo>
            <Campo label="Mínimo para avisar"><input type="number" inputMode="decimal" className="fq-in" placeholder="0" value={f.stockMin} onChange={c("stockMin")} /></Campo>
          </div>
          {Number(f.merma) > 0 && Number(f.costoProm) > 0 && (
            <div className="fq-num" style={{ fontSize: 12, color: "var(--teal)", marginTop: 10 }}>
              Compras a {mxn(f.costoProm)}/{f.unidad}, pero el {f.unidad} limpio te sale en {mxn(Number(f.costoProm) / (1 - Number(f.merma) / 100))}
            </div>
          )}
          <button className="fq-btn" style={{ marginTop: 12, width: "100%" }} onClick={agregar}>Guardar insumo</button>
        </div>
      )}

      <div className="fq-card">
        {lista.length === 0 ? (
          <div className="fq-empty">
            {data.insumos.length === 0
              ? "Sin insumos. Puedes cargar el catálogo completo desde Ajustes."
              : "Ningún insumo coincide con la búsqueda."}
          </div>
        ) : lista.map((i) => (
          <div key={i.id}>
            <div className="fq-row" style={{ cursor: "pointer" }} onClick={() => setSel(sel === i.id ? null : i.id)}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {i.nombre}
                  {Number(i.merma) > 0 && <span className="fq-chip">merma {num(i.merma, 0)}%</span>}
                  {!i.costoProm && <span className="fq-chip" style={{ color: "var(--ambar)", borderColor: "var(--ambar)" }}>sin precio</span>}
                </div>
                <div className="fq-num" style={{ fontSize: 11, color: "var(--tinta-40)" }}>
                  {mxn(i.costoProm)}/{i.unidad}
                  {Number(i.merma) > 0 && ` · limpio ${mxn(costoUtil(i))}`}
                  {i.lugar ? ` · ${i.lugar}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <button className="fq-btn ghost" style={{ padding: "3px 9px" }} onClick={(e) => { e.stopPropagation(); ajustar(i.id, -1); }}>−</button>
                <span className="fq-num" style={{ minWidth: 64, textAlign: "center", fontSize: 13, fontWeight: 600,
                  color: i.stockMin > 0 && i.stock <= i.stockMin ? "var(--chile)" : "var(--tinta)" }}>
                  {num(i.stock)} {i.unidad}
                </span>
                <button className="fq-btn ghost" style={{ padding: "3px 9px" }} onClick={(e) => { e.stopPropagation(); ajustar(i.id, 1); }}>+</button>
              </div>
            </div>
            {sel === i.id && <DetalleInsumo i={i} editar={editar} borrar={borrar} cambiarUnidad={cambiarUnidad} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetalleInsumo({ i, editar, borrar, cambiarUnidad }) {
  const h = i.historial || [];
  const costos = h.map((x) => x.costo);
  const min = costos.length ? Math.min(...costos) : i.costoProm;
  const max = costos.length ? Math.max(...costos) : i.costoProm;
  const familia = FAMILIA[i.unidad];

  const pedirUnidad = (nueva) => {
    const f = factorUnidad(i.unidad, nueva);
    if (f === null) {
      if (!window.confirm(`Cambiar de ${i.unidad} a ${nueva} no se puede convertir solo. Los números se quedan igual y tendrás que ajustarlos a mano. ¿Continuar?`)) return;
    } else if (!window.confirm(`Cambiar a ${nueva}: convierto existencia, precio y todas las cantidades en recetas y bases. ¿Va?`)) return;
    cambiarUnidad(i.id, nueva);
  };

  return (
    <div style={{ padding: "0 13px 14px", background: "var(--escarcha)" }}>
      <div className="fq-grid" style={{ gridTemplateColumns: "2fr 1fr", paddingTop: 12 }}>
        <Campo label="Nombre"><input className="fq-in" value={i.nombre} onChange={(e) => editar(i.id, "nombre", e.target.value)} /></Campo>
        <Campo label="Tipo">
          <select className="fq-in" value={i.tipo || "Otro"} onChange={(e) => editar(i.id, "tipo", e.target.value)}>
            {TIPOS_INSUMO.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Campo>
      </div>

      <div style={{ marginTop: 10 }}>
        <span className="fq-lbl">Unidad</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {UNIDADES.map((u) => (
            <button key={u} className="fq-chip" onClick={() => u !== i.unidad && pedirUnidad(u)}
              style={u === i.unidad ? { background: "var(--tinta)", color: "#fff", borderColor: "var(--tinta)" } : {}}>{u}</button>
          ))}
        </div>
        <div className="fq-hint">
          {familia
            ? `Cambiar entre ${familia === "masa" ? "kg y g" : "L y ml"} convierte todo solo: existencia, precio, recetas y bases.`
            : "Esta unidad no se puede convertir automáticamente."}
        </div>
      </div>

      <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
        <Campo label={`Precio por ${i.unidad}`} hint="Cámbialo cuando quieras; las compras lo recalculan solo.">
          <input type="number" inputMode="decimal" className="fq-in" value={i.costoProm || ""} placeholder="0.00"
            onChange={(e) => editar(i.id, "costoProm", e.target.value)} />
        </Campo>
        <Campo label="Merma (%)"><input type="number" className="fq-in" value={i.merma || 0} onChange={(e) => editar(i.id, "merma", e.target.value)} /></Campo>
        <Campo label="Existencia"><input type="number" className="fq-in" value={i.stock || 0} onChange={(e) => editar(i.id, "stock", e.target.value)} /></Campo>
        <Campo label="Mínimo para avisar"><input type="number" className="fq-in" value={i.stockMin || 0} onChange={(e) => editar(i.id, "stockMin", e.target.value)} /></Campo>
      </div>
      <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
        <Campo label="Dónde se compra"><input className="fq-in" value={i.lugar || ""} placeholder="Proveedor o lugar" onChange={(e) => editar(i.id, "lugar", e.target.value)} /></Campo>
        <Campo label="Notas"><input className="fq-in" value={i.notas || ""} placeholder="Marca, presentación…" onChange={(e) => editar(i.id, "notas", e.target.value)} /></Campo>
      </div>

      {Number(i.merma) > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="fq-eyebrow" style={{ marginBottom: 5 }}>De cada {i.unidad} que compras</div>
          <div className="fq-merma">
            <div style={{ width: `${100 - i.merma}%`, background: "var(--teal)" }} />
            <div style={{ width: `${i.merma}%`, background: "var(--chile)" }} />
          </div>
          <div className="fq-num" style={{ fontSize: 11, color: "var(--tinta-70)", marginTop: 5 }}>
            {num(100 - i.merma, 0)}% entra a la paleta · {num(i.merma, 0)}% se va a la basura
          </div>
        </div>
      )}

      <div className="fq-grid" data-col3 style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 12 }}>
        <Metrica eyebrow="Última compra" valor={mxn(i.ultimoCosto || i.costoProm)} />
        <Metrica eyebrow="Promedio" valor={mxn(i.costoProm)} />
        <Metrica eyebrow="Ya limpio" valor={mxn(costoUtil(i))} color="var(--teal)" />
      </div>

      {h.length > 1 && (
        <div className="fq-card" style={{ padding: 12, marginTop: 10 }}>
          <div className="fq-eyebrow">Cómo se ha movido el precio · entre {mxn(min)} y {mxn(max)}</div>
          <div style={{ height: 120, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={h}>
                <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={42} domain={["auto", "auto"]} />
                <Tooltip formatter={(v) => mxn(v)} />
                <Line type="monotone" dataKey="costo" stroke="#1FA39C" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <button className="fq-btn danger" style={{ width: "100%", marginTop: 10 }} onClick={() => borrar(i.id)}>Borrar insumo</button>
    </div>
  );
}

/* ── Bases ─────────────────────────────────────────────────── */
function FormBase({ inicial, insumos, onGuardar, onCancelar }) {
  const [f, setF] = useState(inicial);
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const addItem = () => setF({ ...f, items: [...f.items, { insumoId: insumos[0]?.id || "", cantidad: 0 }] });
  const editItem = (idx, k, v) => setF({ ...f, items: f.items.map((it, j) => (j === idx ? { ...it, [k]: k === "cantidad" ? Number(v) || 0 : v } : it)) });
  const quitItem = (idx) => setF({ ...f, items: f.items.filter((_, j) => j !== idx) });
  const teorico = costoBaseTeorico(f, insumos);

  return (
    <div className="fq-card" style={{ padding: 14 }}>
      <div className="fq-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <Campo label="Nombre"><input className="fq-in" placeholder="Ej. Base de crema VIC" value={f.nombre} onChange={c("nombre")} /></Campo>
        <Campo label="Unidad"><select className="fq-in" value={f.unidad} onChange={c("unidad")}><option>L</option><option>kg</option></select></Campo>
        <Campo label="Rinde"><input type="number" inputMode="decimal" className="fq-in" placeholder="0" value={f.rinde} onChange={c("rinde")} /></Campo>
      </div>

      <div className="fq-eyebrow" style={{ margin: "14px 0 7px" }}>Qué lleva un lote (cantidades ya limpias)</div>
      {f.items.map((it, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <select className="fq-in" style={{ flex: 2 }} value={it.insumoId} onChange={(e) => editItem(idx, "insumoId", e.target.value)}>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
          </select>
          <input type="number" inputMode="decimal" className="fq-in" style={{ flex: 1 }} placeholder="Cant."
            value={it.cantidad || ""} onChange={(e) => editItem(idx, "cantidad", e.target.value)} />
          <button className="fq-btn danger" style={{ padding: "0 10px" }} onClick={() => quitItem(idx)}>×</button>
        </div>
      ))}
      <button className="fq-btn ghost" style={{ width: "100%" }} onClick={addItem}>Agregar insumo</button>

      {f.items.length > 0 && Number(f.rinde) > 0 && (
        <div className="fq-num" style={{ fontSize: 12, color: "var(--teal)", marginTop: 10 }}>
          Costo del lote {mxn(teorico)} · {mxn(teorico / Number(f.rinde))} por {f.unidad}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <Campo label="Notas"><input className="fq-in" placeholder="Proceso, temperatura, reposo…" value={f.notas} onChange={c("notas")} /></Campo>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="fq-btn" style={{ flex: 2 }} onClick={() => f.nombre.trim() && Number(f.rinde) && onGuardar({ ...f, rinde: Number(f.rinde) })}>Guardar base</button>
        <button className="fq-btn ghost" style={{ flex: 1 }} onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function Bases({ data, guardar }) {
  const vacio = { nombre: "", unidad: "L", rinde: "", items: [], notas: "", stock: 0, costoProm: 0 };
  const [editando, setEditando] = useState(null); // "nuevo" | id
  const [lotes, setLotes] = useState({});

  const onGuardar = (f) => {
    if (editando === "nuevo") guardar({ ...data, bases: [...data.bases, { ...f, id: uid() }] });
    else guardar({ ...data, bases: data.bases.map((b) => (b.id === editando ? { ...b, ...f } : b)) });
    setEditando(null);
  };
  const borrar = (id) => { setEditando(null); guardar({ ...data, bases: data.bases.filter((b) => b.id !== id) }); };

  const producir = (b, n) => {
    const cantidad = Number(n) || 1;
    const consumo = {};
    b.items.forEach((it) => { consumo[it.insumoId] = (consumo[it.insumoId] || 0) + it.cantidad * cantidad; });
    const insumos = data.insumos.map((i) => {
      if (!consumo[i.id]) return i;
      const fisico = consumo[i.id] / (1 - Math.min(95, Number(i.merma) || 0) / 100);
      return { ...i, stock: Math.max(0, i.stock - fisico) };
    });
    const costoLote = costoBaseTeorico(b, data.insumos) * cantidad;
    const litros = b.rinde * cantidad;
    const bases = data.bases.map((x) => {
      if (x.id !== b.id) return x;
      const stock = x.stock + litros;
      return { ...x, stock, costoProm: stock > 0 ? (x.stock * x.costoProm + costoLote) / stock : 0 };
    });
    guardar({ ...data, insumos, bases });
  };

  return (
    <div className="fq-grid">
      <div className="fq-card" style={{ padding: 14 }}>
        <div className="fq-eyebrow">Qué son las bases</div>
        <div style={{ fontSize: 13, color: "var(--tinta-70)", marginTop: 6, lineHeight: 1.5 }}>
          Preparaciones que haces aparte y usas en varios sabores, como tu base de leche, azúcar,
          vainilla y base en polvo. Produces un lote, se descuentan los insumos, y las paletas
          consumen litros de base al costo real que te salió.
        </div>
      </div>

      {data.insumos.length === 0 && <div className="fq-card fq-empty">Primero registra insumos o carga el catálogo desde Ajustes.</div>}

      {editando === "nuevo" ? (
        <FormBase inicial={vacio} insumos={data.insumos} onGuardar={onGuardar} onCancelar={() => setEditando(null)} />
      ) : (
        <button className="fq-btn" onClick={() => setEditando("nuevo")} disabled={data.insumos.length === 0}>Crear base</button>
      )}

      {data.bases.map((b) => {
        if (editando === b.id)
          return <FormBase key={b.id} inicial={b} insumos={data.insumos} onGuardar={onGuardar} onCancelar={() => setEditando(null)} />;
        const teorico = costoBaseTeorico(b, data.insumos);
        const porUnidad = costoUnidadBase(b, data.insumos);
        return (
          <div className="fq-card" key={b.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span className="fq-disp" style={{ fontSize: 16 }}>{b.nombre}</span>
              <span className="fq-num" style={{ fontSize: 13, fontWeight: 600, color: b.stock > 0 ? "var(--teal)" : "var(--tinta-40)" }}>
                {num(b.stock, 2)} {b.unidad} listos
              </span>
            </div>
            <div className="fq-num" style={{ fontSize: 11, color: "var(--tinta-40)", marginTop: 3 }}>
              Un lote rinde {num(b.rinde, 2)} {b.unidad} y cuesta {mxn(teorico)} · {mxn(porUnidad)} por {b.unidad}
            </div>
            {b.notas && <div style={{ fontSize: 12, color: "var(--ambar)", marginTop: 6, lineHeight: 1.4 }}>{b.notas}</div>}

            <div style={{ marginTop: 10 }}>
              {b.items.map((it, k) => {
                const i = data.insumos.find((x) => x.id === it.insumoId);
                if (!i) return null;
                const fisico = it.cantidad / (1 - Math.min(95, Number(i.merma) || 0) / 100);
                return (
                  <div className="fq-row" key={k} style={{ padding: "6px 0" }}>
                    <span style={{ fontSize: 13 }}>{i.nombre}</span>
                    <span className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)" }}>
                      {num(it.cantidad)} {i.unidad}
                      {Number(i.merma) > 0 && ` (compras ${num(fisico)})`} · {mxn(costoUtil(i) * it.cantidad)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <input type="number" inputMode="numeric" className="fq-in" style={{ flex: 1 }} placeholder="Lotes"
                value={lotes[b.id] || ""} onChange={(e) => setLotes({ ...lotes, [b.id]: e.target.value })} />
              <button className="fq-btn" style={{ flex: 2 }} onClick={() => producir(b, lotes[b.id])}>Producir lote</button>
              <button className="fq-btn ghost" onClick={() => setEditando(b.id)}>Editar</button>
              <button className="fq-btn danger" onClick={() => borrar(b.id)}>×</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Paletas ───────────────────────────────────────────────── */
function FormReceta({ inicial, opciones, onGuardar, onCancelar }) {
  const [f, setF] = useState(inicial);
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const addItem = () => {
    if (!opciones.length) return;
    const [tipo, refId] = opciones[0].v.split(":");
    setF({ ...f, items: [...f.items, { tipo, refId, cantidad: 0 }] });
  };
  const editItem = (idx, campo, v) =>
    setF({ ...f, items: f.items.map((it, j) => {
      if (j !== idx) return it;
      if (campo === "ref") { const [tipo, refId] = v.split(":"); return { ...it, tipo, refId }; }
      return { ...it, cantidad: Number(v) || 0 };
    }) });
  const quitItem = (idx) => setF({ ...f, items: f.items.filter((_, j) => j !== idx) });

  return (
    <div className="fq-card" style={{ padding: 14 }}>
      <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Campo label="Sabor"><input className="fq-in" placeholder="Ej. Mango con chamoy" value={f.sabor} onChange={c("sabor")} /></Campo>
        <Campo label="Línea"><select className="fq-in" value={f.linea} onChange={c("linea")}>{Object.keys(LINEAS).map((l) => <option key={l}>{l}</option>)}</select></Campo>
        <Campo label="Litros por corrida"><input type="number" inputMode="decimal" className="fq-in" value={f.litros} onChange={c("litros")} /></Campo>
        <Campo label="Piezas que salen"><input type="number" inputMode="decimal" className="fq-in" value={f.piezas} onChange={c("piezas")} /></Campo>
        <Campo label="Precio menudeo"><input type="number" inputMode="decimal" className="fq-in" placeholder="0.00" value={f.precioMenudeo} onChange={c("precioMenudeo")} /></Campo>
        <Campo label="Precio mayoreo"><input type="number" inputMode="decimal" className="fq-in" placeholder="0.00" value={f.precioMayoreo} onChange={c("precioMayoreo")} /></Campo>
      </div>

      <div className="fq-eyebrow" style={{ margin: "14px 0 7px" }}>Qué lleva una corrida (cantidades ya limpias)</div>
      {f.items.map((it, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <select className="fq-in" style={{ flex: 2 }} value={`${it.tipo}:${it.refId}`} onChange={(e) => editItem(idx, "ref", e.target.value)}>
            {opciones.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <input type="number" inputMode="decimal" className="fq-in" style={{ flex: 1 }} placeholder="Cant."
            value={it.cantidad || ""} onChange={(e) => editItem(idx, "cantidad", e.target.value)} />
          <button className="fq-btn danger" style={{ padding: "0 10px" }} onClick={() => quitItem(idx)}>×</button>
        </div>
      ))}
      <button className="fq-btn ghost" style={{ width: "100%" }} onClick={addItem}>Agregar base o insumo</button>
      <div className="fq-hint">Las bases traen el ⬢ enfrente.</div>
      <div style={{ marginTop: 10 }}>
        <Campo label="Notas"><input className="fq-in" placeholder="Proceso, alertas, tips" value={f.notas} onChange={c("notas")} /></Campo>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="fq-btn" style={{ flex: 2 }}
          onClick={() => f.sabor.trim() && onGuardar({
            ...f, sabor: f.sabor.trim(), litros: Number(f.litros) || 0, piezas: Number(f.piezas) || 0,
            precioMenudeo: Number(f.precioMenudeo) || 0, precioMayoreo: Number(f.precioMayoreo) || 0,
          })}>Guardar sabor</button>
        <button className="fq-btn ghost" style={{ flex: 1 }} onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function Paletas({ data, guardar }) {
  const { moldePiezas, ciclosLitros } = data.ajustes;
  const vacio = { sabor: "", linea: "Agua/Frutal", litros: String(ciclosLitros), piezas: String(moldePiezas), precioMenudeo: "", precioMayoreo: "", items: [], notas: "", stock: 0 };
  const [editando, setEditando] = useState(null);
  const [sel, setSel] = useState(null);
  const [busca, setBusca] = useState("");
  const [linea, setLinea] = useState("todas");

  const opciones = [
    ...data.bases.map((b) => ({ v: `base:${b.id}`, l: `⬢ ${b.nombre} (${b.unidad})` })),
    ...data.insumos.map((i) => ({ v: `insumo:${i.id}`, l: `${i.nombre} (${i.unidad})` })),
  ];

  const onGuardar = (f) => {
    if (editando === "nuevo") guardar({ ...data, recetas: [...data.recetas, { ...f, id: uid(), stock: 0 }] });
    else guardar({ ...data, recetas: data.recetas.map((r) => (r.id === editando ? { ...r, ...f } : r)) });
    setEditando(null);
  };
  const borrar = (id) => { setSel(null); setEditando(null); guardar({ ...data, recetas: data.recetas.filter((r) => r.id !== id) }); };

  const producir = (r, ciclos = 1) => {
    const consumoIns = {}, consumoBase = {};
    r.items.forEach((it) => {
      const dest = it.tipo === "base" ? consumoBase : consumoIns;
      dest[it.refId] = (dest[it.refId] || 0) + it.cantidad * ciclos;
    });
    const insumos = data.insumos.map((i) => {
      if (!consumoIns[i.id]) return i;
      const fisico = consumoIns[i.id] / (1 - Math.min(95, Number(i.merma) || 0) / 100);
      return { ...i, stock: Math.max(0, i.stock - fisico) };
    });
    const bases = data.bases.map((b) => (consumoBase[b.id] ? { ...b, stock: Math.max(0, b.stock - consumoBase[b.id]) } : b));
    const recetas = data.recetas.map((x) => (x.id === r.id ? { ...x, stock: (x.stock || 0) + x.piezas * ciclos } : x));
    guardar({ ...data, insumos, bases, recetas });
  };

  const receta = data.recetas.find((r) => r.id === sel);
  const piezasTotal = data.recetas.reduce((a, r) => a + (r.stock || 0), 0);
  const lista = data.recetas.filter((r) =>
    r.sabor.toLowerCase().includes(busca.toLowerCase()) && (linea === "todas" || r.linea === linea));

  return (
    <div className="fq-grid">
      <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Metrica eyebrow="Paletas en inventario" valor={num(piezasTotal, 0)} sub="Terminadas y listas para vender" />
        <Metrica eyebrow="Sabores registrados" valor={data.recetas.length} />
      </div>

      {data.recetas.length > 0 && (
        <>
          <input className="fq-in" placeholder="Buscar sabor…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
            {["todas", ...Object.keys(LINEAS)].map((l) => (
              <button key={l} className="fq-chip" onClick={() => setLinea(l)}
                style={linea === l ? { background: LINEAS[l] || "var(--tinta)", color: "#fff", borderColor: "transparent" } : {}}>{l}</button>
            ))}
          </div>
        </>
      )}

      {opciones.length === 0 && <div className="fq-card fq-empty">Primero registra insumos o carga el catálogo desde Ajustes.</div>}

      {editando === "nuevo" ? (
        <FormReceta inicial={vacio} opciones={opciones} onGuardar={onGuardar} onCancelar={() => setEditando(null)} />
      ) : (
        <button className="fq-btn" onClick={() => setEditando("nuevo")} disabled={opciones.length === 0}>Agregar sabor</button>
      )}

      <div className="fq-card">
        {lista.length === 0 ? (
          <div className="fq-empty">Sin sabores que mostrar.</div>
        ) : lista.map((r) => {
          const costo = costoReceta(r, data);
          const porPieza = r.piezas > 0 ? costo / r.piezas : 0;
          const margen = r.precioMenudeo > 0 ? ((r.precioMenudeo - porPieza) / r.precioMenudeo) * 100 : 0;
          return (
            <div className="fq-row" key={r.id} style={{ cursor: "pointer", background: sel === r.id ? "var(--escarcha)" : "transparent" }}
              onClick={() => { setSel(sel === r.id ? null : r.id); setEditando(null); }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: LINEAS[r.linea] }} />
                  {r.sabor}
                  {(r.stock || 0) > 0 && <span className="fq-chip">{num(r.stock, 0)} en stock</span>}
                </div>
                <div className="fq-num" style={{ fontSize: 11, color: "var(--tinta-40)" }}>
                  {num(r.piezas, 0)} pzas · {num(r.litros, 1)} L · {num(r.piezas / (r.litros || 1), 2)} pzas/L
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}>
                  <div className="fq-num" style={{ fontWeight: 600, fontSize: 14 }}>{costo > 0 ? mxn(porPieza) : "—"}</div>
                  <div className="fq-num" style={{ fontSize: 11, color: margen >= 50 ? "var(--teal)" : "var(--chile)" }}>
                    {costo > 0 && r.precioMenudeo > 0 ? `margen ${num(margen, 0)}%` : "falta precio"}
                  </div>
                </div>
                <button className="fq-btn ghost" style={{ padding: "4px 9px", fontSize: 12 }}
                  onClick={(e) => { e.stopPropagation(); setSel(r.id); setEditando(r.id); }}>Editar</button>
              </div>
            </div>
          );
        })}
      </div>

      {receta && (editando === receta.id ? (
        <FormReceta inicial={receta} opciones={opciones} onGuardar={onGuardar} onCancelar={() => setEditando(null)} />
      ) : (
        <DetalleReceta r={receta} data={data} producir={producir} borrar={borrar} onEditar={() => setEditando(receta.id)} />
      ))}
    </div>
  );
}

function DetalleReceta({ r, data, producir, borrar, onEditar }) {
  const [ciclos, setCiclos] = useState("1");
  const partes = partesReceta(r, data).sort((a, b) => b.costo - a.costo);
  const costo = partes.reduce((a, p) => a + p.costo, 0);
  const faltantes = partes.filter((p) => p.sinCosto).length;
  const piezas = r.piezas || 1;
  const porPieza = costo / piezas;
  const fijos = data.ajustes.costosFijosMes || 0;
  const utilMen = r.precioMenudeo - porPieza;
  const utilMay = r.precioMayoreo - porPieza;
  const equilibrio = utilMen > 0 ? Math.ceil(fijos / utilMen) : 0;

  const total = Math.max(1, Math.min(120, Math.round(piezas)));
  const celdas = [];
  partes.forEach((p) => {
    const n = costo > 0 ? Math.round((p.costo / costo) * total) : 0;
    for (let i = 0; i < n; i++) celdas.push(p.color);
  });
  while (celdas.length < total) celdas.push("#D8E2E2");
  celdas.length = total;

  return (
    <div className="fq-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="fq-eyebrow">Una corrida de {r.sabor} · {num(r.litros, 1)} L · {num(piezas, 0)} piezas</div>
        <button className="fq-btn ghost" style={{ padding: "4px 10px", fontSize: 12, whiteSpace: "nowrap" }} onClick={onEditar}>Editar receta</button>
      </div>
      {r.notas && <div style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 6, lineHeight: 1.45 }}>{r.notas}</div>}

      <div className="fq-molde" style={{ margin: "12px 0 8px" }}>
        {celdas.map((color, i) => <div key={i} className="fq-celda" style={{ background: color }} />)}
      </div>
      <div style={{ fontSize: 11, color: "var(--tinta-40)", marginBottom: 12 }}>
        Cada paleta del molde, pintada según a qué se le va el dinero.
      </div>

      {faltantes > 0 && (
        <div style={{ fontSize: 12, color: "var(--ambar)", marginBottom: 10, lineHeight: 1.4 }}>
          {faltantes} de estos insumos no tienen precio todavía. El costo de abajo está incompleto.
        </div>
      )}

      {partes.map((p, k) => (
        <div key={k} className="fq-row" style={{ padding: "7px 0" }}>
          <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color }} />
            {p.esBase ? `⬢ ${p.nombre}` : p.nombre}
            <span className="fq-num" style={{ color: "var(--tinta-40)", fontSize: 11 }}>
              {num(p.cantidad)} {p.unidad}{p.merma > 0 ? " limpio" : ""}
            </span>
          </span>
          <span className="fq-num" style={{ fontSize: 13, whiteSpace: "nowrap", color: p.sinCosto ? "var(--ambar)" : "var(--tinta)" }}>
            {p.sinCosto ? "sin precio" : `${mxn(p.costo)} · ${num(costo > 0 ? (p.costo / costo) * 100 : 0, 0)}%`}
          </span>
        </div>
      ))}

      <div className="fq-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 14 }}>
        <Metrica eyebrow="Costo por corrida" valor={mxn(costo)} />
        <Metrica eyebrow="Costo por pieza" valor={mxn(porPieza)} />
        <Metrica eyebrow="Ganas al menudeo" valor={r.precioMenudeo > 0 ? mxn(utilMen) : "—"}
          color={utilMen > 0 ? "var(--teal)" : "var(--chile)"} sub={r.precioMenudeo > 0 ? `Vendes a ${mxn(r.precioMenudeo)}` : "Captura el precio"} />
        <Metrica eyebrow="Ganas al mayoreo" valor={r.precioMayoreo > 0 ? mxn(utilMay) : "—"}
          color={utilMay > 0 ? "var(--teal)" : "var(--chile)"} sub={r.precioMayoreo > 0 ? `Vendes a ${mxn(r.precioMayoreo)}` : "Captura el precio"} />
      </div>

      <div style={{ marginTop: 10 }}>
        <Metrica eyebrow="Punto de equilibrio" valor={equilibrio > 0 ? `${num(equilibrio, 0)} pzas al mes` : "—"}
          sub={fijos > 0 ? "Piezas al menudeo para cubrir tus costos fijos" : "Captura tus costos fijos en Ajustes"} />
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 13 }}>
        <input type="number" inputMode="numeric" className="fq-in" style={{ flex: 1 }} value={ciclos} onChange={(e) => setCiclos(e.target.value)} />
        <button className="fq-btn" style={{ flex: 2 }} onClick={() => producir(r, Number(ciclos) || 1)}>Producir corridas</button>
        <button className="fq-btn ghost" onClick={onEditar}>Editar</button>
        <button className="fq-btn danger" onClick={() => borrar(r.id)}>×</button>
      </div>
      <div style={{ fontSize: 11, color: "var(--tinta-40)", marginTop: 7 }}>
        Producir descuenta insumos y bases, y mete las paletas al inventario.
      </div>
    </div>
  );
}

/* ── Gráficas ──────────────────────────────────────────────── */
function Graficas({ data }) {
  const porCategoria = useMemo(() => {
    const m = {};
    data.movimientos.filter((x) => x.tipo === "gasto").forEach((x) => { m[x.categoria] = (m[x.categoria] || 0) + x.monto; });
    return Object.entries(m).map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto);
  }, [data.movimientos]);

  const porTramo = useMemo(() => {
    const b = [{ tramo: "1–7", monto: 0 }, { tramo: "8–15", monto: 0 }, { tramo: "16–23", monto: 0 }, { tramo: "24–31", monto: 0 }];
    data.movimientos.filter((x) => x.tipo === "gasto" && x.categoria === "Insumos").forEach((x) => {
      const d = Number(x.fecha.slice(8, 10));
      b[d <= 7 ? 0 : d <= 15 ? 1 : d <= 23 ? 2 : 3].monto += x.monto;
    });
    return b;
  }, [data.movimientos]);

  const flujo = useMemo(() => {
    const m = {};
    data.movimientos.forEach((x) => {
      const k = claveMes(x.fecha);
      m[k] = m[k] || { mes: k, Ingresos: 0, Egresos: 0 };
      m[k][x.tipo === "ingreso" ? "Ingresos" : "Egresos"] += x.monto;
    });
    return Object.values(m).sort((a, b) => a.mes.localeCompare(b.mes)).map((x) => ({ ...x, Utilidad: x.Ingresos - x.Egresos }));
  }, [data.movimientos]);

  const porSabor = useMemo(() => {
    const m = {};
    data.movimientos.filter((x) => x.tipo === "ingreso" && x.recetaId && x.piezas > 0).forEach((x) => {
      const r = data.recetas.find((y) => y.id === x.recetaId);
      if (r) m[r.sabor] = (m[r.sabor] || 0) + x.piezas;
    });
    return Object.entries(m).map(([sabor, piezas]) => ({ sabor, piezas })).sort((a, b) => b.piezas - a.piezas).slice(0, 12);
  }, [data.movimientos, data.recetas]);

  if (data.movimientos.length === 0)
    return <div className="fq-card fq-empty">Las gráficas se dibujan solas en cuanto captures movimientos.</div>;

  return (
    <div className="fq-grid">
      <Panelito titulo="A dónde se va el dinero">
        <BarChart data={porCategoria} layout="vertical">
          <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="categoria" width={82} tick={{ fontSize: 11, fill: "#4A6B72" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => mxn(v)} />
          <Bar dataKey="monto" radius={[0, 3, 3, 0]}>
            {porCategoria.map((_, i) => <Cell key={i} fill={CELL_COLORS[i % CELL_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </Panelito>

      {porSabor.length > 0 && (
        <Panelito titulo="Qué sabores se venden más (piezas)">
          <BarChart data={porSabor}>
            <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={false} />
            <XAxis dataKey="sabor" tick={{ fontSize: 9, fill: "#8FA6AB" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip />
            <Bar dataKey="piezas" radius={[3, 3, 0, 0]}>
              {porSabor.map((_, i) => <Cell key={i} fill={CELL_COLORS[i % CELL_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </Panelito>
      )}

      <Panelito titulo="En qué días del mes compras insumos">
        <BarChart data={porTramo}>
          <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={false} />
          <XAxis dataKey="tramo" tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={46} />
          <Tooltip formatter={(v) => mxn(v)} />
          <Bar dataKey="monto" fill="#1FA39C" radius={[3, 3, 0, 0]} />
        </BarChart>
      </Panelito>

      <Panelito titulo="Flujo mes a mes">
        <LineChart data={flujo}>
          <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={46} />
          <Tooltip formatter={(v) => mxn(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Ingresos" stroke="#1FA39C" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Egresos" stroke="#D0402E" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Utilidad" stroke="#0E2A31" strokeWidth={2} strokeDasharray="4 3" dot={false} />
        </LineChart>
      </Panelito>
    </div>
  );
}

const Panelito = ({ titulo, children }) => (
  <div className="fq-card" style={{ padding: 14 }}>
    <div className="fq-eyebrow">{titulo}</div>
    <div style={{ height: 230, marginTop: 10 }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  </div>
);

/* ── Ajustes ───────────────────────────────────────────────── */
function Ajustes({ data, set, guardar }) {
  const a = data.ajustes;
  const up = (k, v) => set({ ajustes: { ...a, [k]: v } });

  // Carga el catálogo de la guía de producción sin tocar lo que ya existe.
  const cargarCatalogo = () => {
    const insumos = [...data.insumos];
    const idPorNombre = {};
    insumos.forEach((i) => { idPorNombre[i.nombre] = i.id; });
    INSUMOS_SEED.forEach(([nombre, tipo, unidad, merma]) => {
      if (idPorNombre[nombre]) return;
      const id = uid();
      idPorNombre[nombre] = id;
      insumos.push({ id, nombre, tipo, unidad, merma, stock: 0, costoProm: 0, ultimoCosto: 0,
        precioUnit: 0, precioMayoreo: 0, stockMin: 0, lugar: "", notas: "", historial: [] });
    });

    const bases = [...data.bases];
    const baseId = {};
    bases.forEach((b) => { baseId[b.nombre] = b.id; });
    if (!baseId[BASE_ARCY.nombre]) {
      const id = uid();
      baseId[BASE_ARCY.nombre] = id;
      bases.push({ id, nombre: BASE_ARCY.nombre, unidad: BASE_ARCY.unidad, rinde: BASE_ARCY.rinde,
        stock: 0, costoProm: 0, notas: BASE_ARCY.notas,
        items: BASE_ARCY.items.map(([n, c]) => ({ insumoId: idPorNombre[n], cantidad: c })).filter((x) => x.insumoId) });
    }

    const yaHay = new Set(data.recetas.map((r) => r.sabor));
    const recetas = [...data.recetas];
    RECETAS_SEED.forEach(([sabor, linea, items, nota]) => {
      if (yaHay.has(sabor)) return;
      recetas.push({
        id: uid(), sabor, linea, litros: 4.8, piezas: 40,
        precioMenudeo: 0, precioMayoreo: 0, stock: 0, notas: nota,
        items: items.map(([n, c]) => (baseId[n]
          ? { tipo: "base", refId: baseId[n], cantidad: c }
          : { tipo: "insumo", refId: idPorNombre[n], cantidad: c })).filter((x) => x.refId),
      });
    });

    guardar({ ...data, insumos, bases, recetas });
  };

  const exportar = () => {
    const filas = [["tipo", "fecha", "monto", "categoria_o_canal", "lugar", "cantidad", "piezas", "mayoreo", "recurrente", "notas", "capturo"]];
    data.movimientos.forEach((m) =>
      filas.push([m.tipo, m.fecha, m.monto, m.tipo === "gasto" ? m.categoria : m.canal, m.lugar,
        m.cantidad || "", m.piezas || "", m.mayoreo ? "sí" : "", m.recurrente ? "sí" : "", m.notas, m.capturadoPor]));
    filas.push([]);
    filas.push(["insumo", "tipo", "unidad", "merma_%", "existencia", "costo_promedio", "costo_limpio", "proveedor"]);
    data.insumos.forEach((i) => filas.push([i.nombre, i.tipo, i.unidad, i.merma || 0, i.stock, i.costoProm, costoUtil(i).toFixed(2), i.lugar]));
    filas.push([]);
    filas.push(["base", "unidad", "rinde_lote", "stock", "costo_por_unidad"]);
    data.bases.forEach((b) => filas.push([b.nombre, b.unidad, b.rinde, b.stock, costoUnidadBase(b, data.insumos).toFixed(2)]));
    filas.push([]);
    filas.push(["sabor", "linea", "piezas_corrida", "costo_pieza", "precio_menudeo", "precio_mayoreo", "stock_paletas"]);
    data.recetas.forEach((r) =>
      filas.push([r.sabor, r.linea, r.piezas, (r.piezas > 0 ? costoReceta(r, data) / r.piezas : 0).toFixed(2),
        r.precioMenudeo, r.precioMayoreo, r.stock || 0]));

    const csv = filas.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = url; el.download = `fresquito-${hoy()}.csv`; el.click();
    URL.revokeObjectURL(url);
  };

  const borrarTodo = () => { if (window.confirm("Esto borra todo: movimientos, insumos, bases y sabores. ¿Seguro?")) guardar(DEFAULTS); };

  // Respaldo completo en JSON: a diferencia del CSV (solo lectura), esto se
  // puede volver a importar tal cual para restaurar el libro completo.
  const exportarJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const el = document.createElement("a");
    el.href = url; el.download = `fresquito-respaldo-${hoy()}.json`; el.click();
    URL.revokeObjectURL(url);
  };

  const fileInputRef = React.useRef(null);
  const importarJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const nuevo = JSON.parse(reader.result);
        if (!nuevo || typeof nuevo !== "object") throw new Error();
        if (!window.confirm("Esto reemplaza todo tu libro actual con lo que hay en el archivo. ¿Seguro?")) return;
        guardar(migrar(nuevo));
      } catch {
        window.alert("Ese archivo no es un respaldo válido de Fresquito.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="fq-grid">
      <div className="fq-card" style={{ padding: 14 }}>
        <div className="fq-eyebrow">Catálogo Fresquito</div>
        <div style={{ fontSize: 13, color: "var(--tinta-70)", marginTop: 6, lineHeight: 1.5 }}>
          Carga los {INSUMOS_SEED.length} insumos, la base Arcy y los {RECETAS_SEED.length} sabores de tu guía de producción,
          con cantidades, mermas sugeridas y las alertas técnicas en las notas. No toca nada de lo que ya tengas.
          Los precios los capturas tú.
        </div>
        <button className="fq-btn" style={{ width: "100%", marginTop: 12 }} onClick={cargarCatalogo}>
          Cargar catálogo de 50 sabores
        </button>
      </div>

      <div className="fq-card" style={{ padding: 14 }}>
        <div className="fq-eyebrow">Producción</div>
        <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
          <Campo label="Piezas por molde"><input type="number" className="fq-in" value={a.moldePiezas} onChange={(e) => up("moldePiezas", Number(e.target.value))} /></Campo>
          <Campo label="Litros por ciclo"><input type="number" step="0.1" className="fq-in" value={a.ciclosLitros} onChange={(e) => up("ciclosLitros", Number(e.target.value))} /></Campo>
        </div>
        <div className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 8 }}>
          Rendimiento base: {num(a.moldePiezas / (a.ciclosLitros || 1), 2)} piezas por litro
        </div>
      </div>

      <div className="fq-card" style={{ padding: 14 }}>
        <div className="fq-eyebrow">Costos fijos</div>
        <div style={{ marginTop: 10 }}>
          <Campo label="Costo fijo mensual (renta, luz, sueldos)" hint="Con esto se calcula el punto de equilibrio de cada sabor.">
            <input type="number" className="fq-in" placeholder="0.00" value={a.costosFijosMes || ""} onChange={(e) => up("costosFijosMes", Number(e.target.value))} />
          </Campo>
        </div>
      </div>

      <div className="fq-card" style={{ padding: 14 }}>
        <div className="fq-eyebrow">Quién captura</div>
        <div style={{ marginTop: 10 }}>
          <Campo label="Tu nombre (queda marcado en cada movimiento)">
            <input className="fq-in" placeholder="Ej. Enrique" value={a.usuario || ""} onChange={(e) => up("usuario", e.target.value)} />
          </Campo>
        </div>
      </div>

      <div className="fq-card" style={{ padding: 14 }}>
        <div className="fq-eyebrow">Respaldo</div>
        <div style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 6, lineHeight: 1.5 }}>
          El JSON es tu respaldo real: guarda todo tal cual y se puede volver a cargar para
          restaurar el libro completo. El CSV es solo para revisar en Excel, no se puede reimportar.
        </div>
        <button className="fq-btn" style={{ width: "100%", marginTop: 10 }} onClick={exportarJSON}>Descargar respaldo (JSON)</button>
        <button className="fq-btn ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => fileInputRef.current?.click()}>
          Restaurar desde un respaldo (JSON)
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importarJSON} />
        <button className="fq-btn" style={{ width: "100%", marginTop: 8 }} onClick={exportar}>Descargar todo en CSV</button>
        <button className="fq-btn danger" style={{ width: "100%", marginTop: 8 }} onClick={borrarTodo}>Borrar todos los datos</button>
      </div>
    </div>
  );
}
