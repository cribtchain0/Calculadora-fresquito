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

const UNIDADES_FAMILIA = { masa: ["kg", "g"], volumen: ["L", "ml"] };
// Unidades entre las que se puede elegir para un insumo/base (misma familia).
const unidadesCompatibles = (u) => (FAMILIA[u] ? UNIDADES_FAMILIA[FAMILIA[u]] : [u]);
// Una receta puede pedir un insumo en otra unidad de su familia (ej. leche en
// ml aunque el inventario esté en L). Esto convierte esa cantidad a la unidad
// del insumo/base para costear y descontar bien del almacén.
const factorItem = (itUnidad, refUnidad) => {
  if (!itUnidad || itUnidad === refUnidad) return 1;
  const f = factorUnidad(itUnidad, refUnidad);
  return f === null ? 1 : f;
};

const costoBaseTeorico = (b, insumos) =>
  b.items.reduce((a, it) => {
    const i = insumos.find((x) => x.id === it.insumoId);
    return a + (i ? costoUtil(i) * it.cantidad * factorItem(it.unidad, i.unidad) : 0);
  }, 0);

const costoUnidadBase = (b, insumos) =>
  b.costoProm > 0 ? b.costoProm : b.rinde > 0 ? costoBaseTeorico(b, insumos) / b.rinde : 0;

const partesReceta = (r, data) =>
  r.items.map((it, idx) => {
    if (it.tipo === "base") {
      const b = data.bases.find((x) => x.id === it.refId);
      if (!b) return { nombre: "Base no encontrada", esBase: true, roto: true, unidad: it.unidad || "", cantidad: it.cantidad,
        costo: 0, color: CELL_COLORS[idx % CELL_COLORS.length] };
      const factor = factorItem(it.unidad, b.unidad);
      return { nombre: b.nombre, esBase: true, unidad: it.unidad || b.unidad, cantidad: it.cantidad,
        costo: costoUnidadBase(b, data.insumos) * it.cantidad * factor, color: CELL_COLORS[idx % CELL_COLORS.length] };
    }
    const i = data.insumos.find((x) => x.id === it.refId);
    if (!i) return { nombre: "Insumo no encontrado", esBase: false, roto: true, unidad: it.unidad || "", cantidad: it.cantidad,
      costo: 0, color: CELL_COLORS[idx % CELL_COLORS.length] };
    const factor = factorItem(it.unidad, i.unidad);
    return { nombre: i.nombre, esBase: false, unidad: it.unidad || i.unidad, cantidad: it.cantidad, merma: Number(i.merma) || 0,
      sinCosto: !i.costoProm, costo: costoUtil(i) * it.cantidad * factor, color: CELL_COLORS[idx % CELL_COLORS.length] };
  }).filter(Boolean);

const costoReceta = (r, data) => partesReceta(r, data).reduce((a, p) => a + p.costo, 0);

/* ── Producción real ───────────────────────────────────────── */
const PAQ = "__paq__"; // unidad especial "por paquete" al capturar producción
// Unidades en las que se puede capturar el consumo real de un insumo/base.
const unidadesCaptura = (ref, tipo) => {
  const base = unidadesCompatibles(ref.unidad);
  if (tipo === "insumo" && ref.porPaquete && Number(ref.unidadesPorPaquete) > 0) return [...base, PAQ];
  return base;
};
// De la unidad base del insumo/base → a la unidad en que se captura.
const aUnidadCaptura = (qty, ref, unidad) => {
  if (unidad === PAQ) return ref.unidadesPorPaquete > 0 ? qty / ref.unidadesPorPaquete : 0;
  return qty * factorItem(ref.unidad, unidad);
};
// De lo capturado (en 'unidad') → a la unidad base del insumo/base.
const aUnidadRef = (val, ref, unidad) => {
  if (unidad === PAQ) return (Number(val) || 0) * (ref.unidadesPorPaquete || 0);
  return (Number(val) || 0) * factorItem(unidad, ref.unidad);
};
const redondea = (x) => Math.round((Number(x) || 0) * 1000) / 1000;
// Costo real por pieza según el histórico de producciones (ponderado por piezas).
const costoRealPieza = (r) => {
  const p = r.producciones || [];
  const piezas = p.reduce((a, x) => a + (x.piezas || 0), 0);
  const costo = p.reduce((a, x) => a + (x.costo || 0), 0);
  return piezas > 0 ? costo / piezas : 0;
};
// Ruta SVG de una línea de tendencia diminuta (sin ejes) para valores ya en %.
const sparklinePath = (valores, w, h) => {
  if (valores.length < 2) return "";
  const min = Math.min(...valores), max = Math.max(...valores);
  const rango = max - min || 1;
  return valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * w;
    const y = h - ((v - min) / rango) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
};

/* Trae datos de versiones anteriores sin perder nada */
const migrar = (d) => {
  const out = { ...DEFAULTS, ...d, version: 3 };
  out.bases = (out.bases || []).map((b) => ({ stock: 0, costoProm: 0, items: [], ...b }));
  out.insumos = (out.insumos || []).map((i) => ({ tipo: "Otro", merma: 0, historial: [], ultimoCosto: i.costoProm || 0,
    porPaquete: false, unidadesPorPaquete: 0, nombrePaquete: "", ...i }));
  out.recetas = (out.recetas || []).map((r) => ({
    ...r,
    stock: r.stock || 0,
    precioMenudeo: r.precioMenudeo ?? r.precioVenta ?? 0,
    precioMayoreo: r.precioMayoreo ?? 0,
    producciones: r.producciones || [],
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

/* ── Navegación: 7 vistas, 4 primarias (barra inferior en móvil) ── */
const NAV_ITEMS = [
  { k: "panel", l: "Panel", icono: "panel", primaria: true },
  { k: "movimientos", l: "Movimientos", icono: "movimientos", primaria: true },
  { k: "paletas", l: "Paletas", icono: "paletas", primaria: true },
  { k: "insumos", l: "Insumos", icono: "insumos", primaria: true },
  { k: "bases", l: "Bases", icono: "bases", primaria: false },
  { k: "graficas", l: "Gráficas", icono: "graficas", primaria: false },
  { k: "ajustes", l: "Ajustes", icono: "ajustes", primaria: false },
];

const Icono = ({ n }) => {
  const p = { width: 18, height: 18, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  if (n === "panel") return <svg {...p}><rect x="2.5" y="2.5" width="6.3" height="6.3" rx="1.4" /><rect x="11.2" y="2.5" width="6.3" height="6.3" rx="1.4" /><rect x="2.5" y="11.2" width="6.3" height="6.3" rx="1.4" /><rect x="11.2" y="11.2" width="6.3" height="6.3" rx="1.4" /></svg>;
  if (n === "movimientos") return <svg {...p}><path d="M3 6.5h10M9 3.5l4 3-4 3" /><path d="M17 13.5H7M11 16.5l-4-3 4-3" /></svg>;
  if (n === "insumos") return <svg {...p}><rect x="3" y="5" width="14" height="11" rx="1.6" /><path d="M3 9h14M10 5v11" /></svg>;
  if (n === "bases") return <svg {...p}><rect x="6" y="3" width="8" height="3" rx="1.2" /><rect x="4" y="8.5" width="12" height="3" rx="1.2" /><rect x="2" y="14" width="16" height="3" rx="1.2" /></svg>;
  if (n === "paletas") return <svg {...p}><rect x="6" y="2.5" width="8" height="10" rx="3" /><rect x="9.25" y="12.5" width="1.5" height="5" rx="0.7" /></svg>;
  if (n === "graficas") return <svg {...p}><rect x="3" y="11" width="3.4" height="6" rx="1" /><rect x="8.3" y="6.5" width="3.4" height="10.5" rx="1" /><rect x="13.6" y="3" width="3.4" height="14" rx="1" /></svg>;
  if (n === "ajustes") return <svg {...p}><path d="M3 6h5.5M12.5 6h4.5M3 10h9.5M16.5 10h.5M3 14h5.5M12.5 14h4.5" /><circle cx="10" cy="6" r="1.6" /><circle cx="14.5" cy="10" r="1.6" /><circle cx="10" cy="14" r="1.6" /></svg>;
  if (n === "mas") return <svg {...p}><circle cx="4" cy="10" r="1.3" /><circle cx="10" cy="10" r="1.3" /><circle cx="16" cy="10" r="1.3" /></svg>;
  return null;
};

// Ancho de ventana, para decisiones responsive que CSS solo no puede tomar
// (ej. orientación de una gráfica de Recharts).
function useAncho() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => {
    let t;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => setW(window.innerWidth), 120); };
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, []);
  return w;
}

/* ── Estilos ───────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap');
:root{
  --tinta:#0E2A31; --tinta-70:#4A6B72; --tinta-40:#8FA6AB;
  --escarcha:#EDF2F2; --papel:#FFFFFF; --linea:#D8E2E2;
  --teal:#1FA39C; --ambar:#E0A32E; --chile:#D0402E; --cafe:#7A5340;
  --fs-disp:clamp(1.125rem, 1rem + 1.1vw, 1.5rem);
  --fs-valor:clamp(1.125rem, 1.05rem + 0.6vw, 1.375rem);
  --sp-3:10px; --sp-4:14px;
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
  font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:transform .15s ease}
.fq-btn:hover{background:#164048}
.fq-btn:active{transform:scale(.97)}
.fq-btn:disabled{opacity:.4;cursor:not-allowed}
.fq-btn.ghost{background:transparent;color:var(--tinta-70);border:1px solid var(--linea)}
.fq-btn.ghost:hover{background:var(--escarcha);color:var(--tinta)}
.fq-btn.danger{background:transparent;color:var(--chile);border:1px solid var(--linea)}
.fq-btn:focus-visible,.fq-in:focus-visible,.fq-nav-item:focus-visible,.fq-bottombar-item:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.fq-chip{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;cursor:pointer;
  border:1px solid var(--linea);color:var(--tinta-70);background:var(--escarcha);font-family:inherit;white-space:nowrap}
.fq-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;
  padding:11px 13px;border-bottom:1px solid var(--linea)}
.fq-row:last-child{border-bottom:0}
.fq-grid{display:grid;gap:10px}
.fq-molde{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}
.fq-celda{aspect-ratio:1/2.4;border-radius:2px 2px 5px 5px}
.fq-empty{padding:26px 16px;text-align:center;color:var(--tinta-70);font-size:14px;line-height:1.5}
.fq-merma{height:6px;border-radius:6px;background:var(--linea);overflow:hidden;display:flex}
@media (max-width:520px){.fq-grid[data-col3]{grid-template-columns:1fr!important}}
@media (max-width:767px){
  .fq-molde{grid-template-columns:repeat(5,1fr)}
  .fq-row .fq-btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center}
  .fq-chip{min-height:30px;display:inline-flex;align-items:center}
}

/* ── Estructura responsive: sidebar / riel / barra inferior ── */
.fq-shell{display:flex;min-height:100vh}
.fq-content{flex:1;min-width:0;display:flex;flex-direction:column}
.fq-topbar{background:var(--tinta);color:#fff;padding:14px 16px}
.fq-main{max-width:1320px;width:100%;margin:0 auto;padding:clamp(12px,4vw,32px);
  padding-bottom:calc(clamp(12px,4vw,32px) + 76px)}
@media (min-width:768px){.fq-main{padding-bottom:clamp(12px,4vw,32px)}}
.fq-nav{display:none}
@media (min-width:768px){
  .fq-nav{display:flex;flex-direction:column;width:64px;flex-shrink:0;background:var(--tinta);
    padding:16px 0 10px;gap:2px;position:sticky;top:0;align-self:flex-start;height:100vh;overflow-y:auto}
  .fq-nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:11px 4px;
    border:0;background:transparent;color:rgba(255,255,255,.55);cursor:pointer;font-family:inherit;
    border-left:2px solid transparent;font-size:9px;font-weight:600}
  .fq-nav-item.activo{color:#fff;border-left-color:var(--teal);background:rgba(255,255,255,.05)}
  .fq-nav-item:hover{color:#fff}
  .fq-nav-label{display:none}
}
@media (min-width:1024px){
  .fq-nav{width:212px;align-items:stretch;padding:8px 10px 16px}
  .fq-nav-item{flex-direction:row;justify-content:flex-start;padding:10px 12px;border-radius:9px;
    border-left:0;font-size:13px;gap:10px}
  .fq-nav-item.activo{background:rgba(255,255,255,.09);border-left:0}
  .fq-nav-label{display:inline}
  .fq-wordmark{padding:10px 12px 20px}
}
.fq-bottombar{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--tinta);
  border-top:1px solid rgba(255,255,255,.08);z-index:50;padding-bottom:env(safe-area-inset-bottom,0)}
@media (min-width:768px){.fq-bottombar{display:none}}
.fq-bottombar-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;padding:7px 4px 9px;background:transparent;border:0;color:rgba(255,255,255,.55);
  font-family:inherit;font-size:10px;font-weight:600;min-height:52px;cursor:pointer}
.fq-bottombar-item.activo{color:#fff}
.fq-bottombar-item.activo svg{color:var(--teal)}
.fq-sheet-backdrop{position:fixed;inset:0;background:rgba(14,42,49,.4);z-index:70}
.fq-sheet{position:fixed;left:0;right:0;bottom:0;background:var(--papel);border-radius:16px 16px 0 0;
  padding:8px 8px calc(14px + env(safe-area-inset-bottom,0));z-index:71;
  box-shadow:0 -8px 24px rgba(14,42,49,.2)}
.fq-sheet-handle{width:36px;height:4px;background:var(--linea);border-radius:4px;margin:6px auto 12px}
.fq-sheet-item{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:10px;
  font-size:14px;font-weight:600;color:var(--tinta);cursor:pointer;background:transparent;border:0;
  width:100%;text-align:left;font-family:inherit}
.fq-sheet-item:active{background:var(--escarcha)}

/* ── Grillas responsive de KPI y paneles ── */
.fq-metrica-grid{display:grid;gap:var(--sp-3);
  grid-template-columns:repeat(auto-fit, minmax(clamp(148px, 30vw, 200px), 1fr))}
.fq-metrica-valor{font-size:var(--fs-valor);font-weight:600;margin-top:4px}
.fq-2col{display:grid;gap:12px}
@media (min-width:1024px){.fq-2col{grid-template-columns:1fr 1fr;align-items:start}}
.fq-panel-layout{display:grid;gap:14px;grid-template-areas:"aviso" "principal" "atencion"}
.fq-panel-aviso{grid-area:aviso}
.fq-panel-principal{grid-area:principal;display:grid;gap:10px;min-width:0}
.fq-panel-atencion{grid-area:atencion;display:grid;gap:10px;align-content:start;min-width:0}
@media (min-width:1024px){
  .fq-panel-layout{grid-template-columns:2fr 1fr;align-items:start;
    grid-template-areas:"principal aviso" "principal atencion"}
}

/* ── Gamificación: un solo acento (teal), siempre contorno/brillo, nunca relleno de dato ── */
@keyframes fq-logro-glow{
  0%{box-shadow:0 0 0 0 rgba(31,163,156,0)}
  18%{box-shadow:0 0 0 3px rgba(31,163,156,.22)}
  100%{box-shadow:0 0 0 0 rgba(31,163,156,0)}
}
.fq-logro{animation:fq-logro-glow 2s ease-out 1}
@keyframes fq-elevar{0%{transform:translateY(0);box-shadow:none}30%{transform:translateY(-2px);box-shadow:0 6px 16px rgba(14,42,49,.1)}100%{transform:translateY(0);box-shadow:none}}
.fq-elevar{animation:fq-elevar 1.5s ease-out 1}
@keyframes fq-brush{0%{background-color:rgba(31,163,156,.14)}100%{background-color:transparent}}
.fq-brush{animation:fq-brush .5s ease-out 1}
.fq-progreso{position:relative}
.fq-progreso::before{content:"";position:absolute;top:0;left:0;height:2px;border-radius:3px 0 0 0;
  background:rgba(31,163,156,.5);width:var(--progreso,0%);transition:width .6s ease}
.fq-racha{display:flex;gap:3px;align-items:center;flex-wrap:wrap}
.fq-racha-punto{width:5px;height:5px;border-radius:50%;background:var(--linea);flex-shrink:0}
.fq-racha-punto.on{background:var(--teal)}
.fq-ping{position:relative}
.fq-ping::after{content:"";position:absolute;top:-1px;right:-1px;width:6px;height:6px;border-radius:50%;background:var(--teal)}
.fq-confirm{font-size:11px;color:var(--teal);margin-left:8px;font-weight:600;opacity:0;animation:fq-confirm-fade 1.6s ease forwards}
@keyframes fq-confirm-fade{0%{opacity:0}15%{opacity:1}75%{opacity:1}100%{opacity:0}}
.fq-nota{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);
  background:var(--tinta);color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;
  box-shadow:0 6px 18px rgba(14,42,49,.25);z-index:55;opacity:0;animation:fq-nota-in 3.2s ease forwards;
  max-width:calc(100vw - 24px);text-align:center}
@keyframes fq-nota-in{0%{opacity:0;transform:translate(-50%,6px)}12%{opacity:1;transform:translate(-50%,0)}82%{opacity:1}100%{opacity:0}}
.fq-undo{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;
  background:var(--tinta);color:#fff;border-radius:12px;padding:10px 10px 10px 16px;
  display:flex;align-items:center;gap:14px;font-size:13px;box-shadow:0 8px 24px rgba(14,42,49,.28);
  z-index:60;max-width:calc(100vw - 24px)}
.fq-undo button{background:transparent;border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:8px;
  padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}
@keyframes fq-pulse{0%,100%{opacity:.5}50%{opacity:1}}
.fq-skel{background:var(--linea);border-radius:10px;animation:fq-pulse 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/* ── UI base ───────────────────────────────────────────────── */
const Campo = ({ label, hint, children }) => (
  <div><span className="fq-lbl">{label}</span>{children}{hint && <div className="fq-hint">{hint}</div>}</div>
);

const Metrica = ({ eyebrow, valor, color, sub, logro }) => (
  <div className={"fq-card" + (logro ? " fq-logro" : "")} style={{ padding: "13px 14px" }}>
    <div className="fq-eyebrow">{eyebrow}</div>
    <div className="fq-num fq-metrica-valor" style={{ color: color || "var(--tinta)" }}>{valor}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--tinta-40)", marginTop: 3, lineHeight: 1.35 }}>{sub}</div>}
  </div>
);

/* ── App ───────────────────────────────────────────────────── */
export default function FresquitoFinanzas() {
  const [data, setData] = useState(DEFAULTS);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem("fq_vista") || "panel"; } catch { return "panel"; }
  });
  const [aviso, setAviso] = useState("");
  const [masAbierto, setMasAbierto] = useState(false);
  const [nota, setNota] = useState(null);
  const [papelera, setPapelera] = useState(null);
  const notaMostrada = React.useRef(false);
  const pendienteRef = React.useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.leerLibro();
        if (d) setData(migrar(d));
      } catch {
        setAviso("No se pudo abrir el libro. Revisa la conexión con Supabase (client/.env).");
      }
      setCargando(false);
      // Personalización silenciosa: si el dispositivo ya traía otra pestaña
      // guardada de una sesión anterior, un aviso breve y nada más.
      if (vista !== "panel" && !notaMostrada.current) {
        notaMostrada.current = true;
        const etiqueta = NAV_ITEMS.find((n) => n.k === vista)?.l || vista;
        setNota(`Sigues donde ibas: ${etiqueta}`);
        setTimeout(() => setNota(null), 3200);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    try { localStorage.setItem("fq_vista", vista); } catch {}
  }, [vista]);

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

  // Borrar con deshacer: la UI se actualiza al instante, pero el guardado real
  // a Supabase se retrasa 5s por si el usuario se arrepiente. Confirmación y
  // deshacer en vez de un modal previo — para eso son las acciones destructivas.
  const confirmarPendiente = () => {
    const p = pendienteRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendienteRef.current = null;
    setPapelera(null);
    api.guardarLibro(p.nuevo).catch(() => {
      setAviso("No se guardó el cambio. Revisa tu conexión y vuelve a intentarlo.");
      setTimeout(() => setAviso(""), 4500);
    });
  };
  const pedirBorrar = (nuevo, etiqueta) => {
    confirmarPendiente();
    const anterior = data;
    setData(nuevo);
    const timer = setTimeout(confirmarPendiente, 5000);
    pendienteRef.current = { anterior, nuevo, timer };
    setPapelera({ etiqueta });
  };
  const deshacer = () => {
    const p = pendienteRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendienteRef.current = null;
    setData(p.anterior);
    setPapelera(null);
  };

  if (cargando)
    return (
      <div className="fq">
        <style>{CSS}</style>
        <div className="fq-topbar"><span className="fq-disp" style={{ fontSize: "var(--fs-disp)" }}>Fresquito</span></div>
        <main className="fq-main" style={{ maxWidth: 1320 }}>
          <div className="fq-grid">
            <div className="fq-metrica-grid">
              <div className="fq-skel" style={{ height: 74 }} />
              <div className="fq-skel" style={{ height: 74 }} />
              <div className="fq-skel" style={{ height: 74 }} />
            </div>
            <div className="fq-skel" style={{ height: 210 }} />
            <div className="fq-skel" style={{ height: 130 }} />
          </div>
        </main>
      </div>
    );

  const irA = (k) => { setVista(k); setMasAbierto(false); };
  const enMas = ["bases", "graficas", "ajustes"].includes(vista);

  return (
    <div className="fq">
      <style>{CSS}</style>
      <div className="fq-shell">
        <nav className="fq-nav" aria-label="Secciones">
          {NAV_ITEMS.map((n) => (
            <button key={n.k} className={"fq-nav-item" + (vista === n.k ? " activo" : "")} onClick={() => irA(n.k)}>
              <Icono n={n.icono} />
              <span className="fq-nav-label">{n.l}</span>
            </button>
          ))}
        </nav>

        <div className="fq-content">
          <div className="fq-topbar">
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
              <span className="fq-disp" style={{ fontSize: "var(--fs-disp)" }}>Fresquito</span>
              <span className="fq-eyebrow" style={{ color: "rgba(255,255,255,.5)" }}>Libro de finanzas · Cancún</span>
            </div>
          </div>

          {aviso && <div style={{ background: "var(--chile)", color: "#fff", padding: "9px 16px", fontSize: 13 }}>{aviso}</div>}

          <main className="fq-main">
            {vista === "panel" && <Panel data={data} />}
            {vista === "movimientos" && <Movimientos data={data} guardar={guardar} pedirBorrar={pedirBorrar} />}
            {vista === "insumos" && <Insumos data={data} set={set} pedirBorrar={pedirBorrar} />}
            {vista === "bases" && <Bases data={data} guardar={guardar} pedirBorrar={pedirBorrar} />}
            {vista === "paletas" && <Paletas data={data} guardar={guardar} pedirBorrar={pedirBorrar} />}
            {vista === "graficas" && <Graficas data={data} />}
            {vista === "ajustes" && <Ajustes data={data} set={set} guardar={guardar} />}
          </main>
        </div>

        <div className="fq-bottombar" aria-label="Secciones">
          {NAV_ITEMS.filter((n) => n.primaria).map((n) => (
            <button key={n.k} className={"fq-bottombar-item" + (vista === n.k ? " activo" : "")} onClick={() => irA(n.k)}>
              <Icono n={n.icono} /><span>{n.l}</span>
            </button>
          ))}
          <button className={"fq-bottombar-item" + (masAbierto || enMas ? " activo" : "")} onClick={() => setMasAbierto(true)}>
            <Icono n="mas" /><span>Más</span>
          </button>
        </div>
        {masAbierto && (
          <>
            <div className="fq-sheet-backdrop" onClick={() => setMasAbierto(false)} />
            <div className="fq-sheet">
              <div className="fq-sheet-handle" />
              {NAV_ITEMS.filter((n) => !n.primaria).map((n) => (
                <button key={n.k} className="fq-sheet-item" onClick={() => irA(n.k)}>
                  <Icono n={n.icono} />{n.l}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {nota && <div className="fq-nota">{nota}</div>}
      {papelera && (
        <div className="fq-undo">
          <span>{papelera.etiqueta}</span>
          <button onClick={deshacer}>Deshacer</button>
        </div>
      )}
    </div>
  );
}

/* ── Panel ─────────────────────────────────────────────────── */
function Panel({ data }) {
  const ancho = useAncho();
  const movil = ancho < 768;
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

  // Momento de logro: la utilidad de este mes supera la del mes pasado (y sí
  // hubo mes pasado con actividad real, para no "festejar" el primer uso).
  const mesPrev = serie.length >= 2 ? serie[serie.length - 2] : null;
  const utilPrev = mesPrev ? mesPrev.Ingresos - mesPrev.Egresos : null;
  const huboPrev = mesPrev && (mesPrev.Ingresos > 0 || mesPrev.Egresos > 0);
  const logroUtilidad = !!(huboPrev && util > utilPrev);

  // Brush silencioso cuando la lista de "por reponer" se vacía por completo.
  const bajosPrevRef = React.useRef(bajos.length);
  const [resuelto, setResuelto] = useState(false);
  useEffect(() => {
    if (bajosPrevRef.current > 0 && bajos.length === 0) {
      setResuelto(true);
      setTimeout(() => setResuelto(false), 500);
    }
    bajosPrevRef.current = bajos.length;
  }, [bajos.length]);

  return (
    <div className="fq-panel-layout">
      <div className="fq-panel-principal">
        <div className="fq-metrica-grid">
          <Metrica eyebrow="Ingresos del mes" valor={mxn(ing)} color="var(--teal)" />
          <Metrica eyebrow="Egresos del mes" valor={mxn(egr)} color="var(--chile)" />
          <Metrica eyebrow="Utilidad" valor={mxn(util)} color={util >= 0 ? "var(--tinta)" : "var(--chile)"}
            sub={ing > 0 ? `Margen ${num((util / ing) * 100, 1)}%` : "Sin ingresos este mes"} logro={logroUtilidad} />
        </div>

        <div className="fq-metrica-grid">
          <Metrica eyebrow="Insumos en almacén" valor={mxn(valInsumos)} />
          <Metrica eyebrow="Bases hechas" valor={mxn(valBases)} sub={`${num(data.bases.reduce((a, b) => a + b.stock, 0), 1)} L listos`} />
          <Metrica eyebrow="Paletas terminadas" valor={mxn(valPaletas)} sub={`${num(piezasEnStock, 0)} piezas al costo`} />
        </div>

        <div className="fq-card" style={{ padding: 14 }}>
          <div className="fq-eyebrow">Últimos 6 meses</div>
          <div style={{ height: movil ? 160 : 210, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie}>
                <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={46} />
                <Tooltip formatter={(v) => mxn(v)} />
                {!movil && <Legend wrapperStyle={{ fontSize: 12 }} />}
                <Bar dataKey="Ingresos" fill="#1FA39C" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Egresos" fill="#D0402E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {sinCosto > 0 && (
        <div className="fq-panel-aviso fq-card" style={{ padding: "12px 14px", borderColor: "var(--ambar)" }}>
          <div className="fq-eyebrow" style={{ color: "var(--ambar)" }}>Pendiente</div>
          <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.45 }}>
            Hay {sinCosto} insumos sin precio. Mientras no los captures, el costeo de esos sabores sale incompleto.
          </div>
        </div>
      )}

      <div className="fq-panel-atencion">
        <div className={"fq-card" + (resuelto ? " fq-brush" : "")}>
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
    </div>
  );
}

/* ── Movimientos ───────────────────────────────────────────── */
function Movimientos({ data, guardar, pedirBorrar }) {
  const base = {
    tipo: "gasto", fecha: hoy(), monto: "", categoria: "Insumos", lugar: "",
    canal: "Evento / carrito", notas: "", insumoId: "", cantidad: "", mayoreo: false, porPaquete: false,
    recurrente: false, recetaId: "", piezas: "", capturadoPor: data.ajustes.usuario || "",
  };
  const [f, setF] = useState(base);
  const [filtro, setFiltro] = useState("todos");
  const [filtroClicks, setFiltroClicks] = useState(0);
  const [comparar, setComparar] = useState(false);
  const [unlockVisto, setUnlockVisto] = useState(false);
  const [guardadoTick, setGuardadoTick] = useState(0);
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const receta = data.recetas.find((r) => r.id === f.recetaId);
  const aplicarFiltro = (k) => { setFiltro(k); setFiltroClicks((n) => n + 1); };

  // Desbloqueo progresivo: al tercer filtro usado en la sesión aparece,
  // sin interrumpir, una comparación rápida contra el mes pasado.
  const comparativa = useMemo(() => {
    const mesActual = claveMes(hoy());
    const dPrev = new Date(); dPrev.setDate(1); dPrev.setMonth(dPrev.getMonth() - 1);
    const mesPrevio = dPrev.toISOString().slice(0, 7);
    const suma = (mes) => data.movimientos
      .filter((m) => claveMes(m.fecha) === mes && (filtro === "todos" || m.tipo === filtro))
      .reduce((a, m) => a + (filtro === "todos" ? (m.tipo === "ingreso" ? m.monto : -m.monto) : m.monto), 0);
    return { actual: suma(mesActual), previo: suma(mesPrevio) };
  }, [data.movimientos, filtro]);

  const proponerMonto = (recetaId, piezas, mayoreo) => {
    const r = data.recetas.find((x) => x.id === recetaId);
    if (!r || !piezas) return "";
    const p = mayoreo ? r.precioMayoreo : r.precioMenudeo;
    return p > 0 ? String(Number(piezas) * p) : "";
  };

  const agregar = () => {
    if (!f.monto || Number(f.monto) <= 0) return;
    const insumoComprado = data.insumos.find((i) => i.id === f.insumoId);
    const usaPaq = f.porPaquete && insumoComprado?.porPaquete && Number(insumoComprado.unidadesPorPaquete) > 0;
    const cantidadReal = usaPaq ? (Number(f.cantidad) || 0) * insumoComprado.unidadesPorPaquete : (Number(f.cantidad) || 0);
    const mov = { ...f, id: uid(), monto: Number(f.monto), cantidad: cantidadReal, piezas: Number(f.piezas) || 0,
      paquetes: usaPaq ? Number(f.cantidad) || 0 : 0 };
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
    setGuardadoTick((n) => n + 1);
  };

  const repetir = (m) => setF({ ...base, ...m, fecha: hoy(), monto: String(m.monto), cantidad: m.cantidad ? String(m.cantidad) : "", piezas: m.piezas ? String(m.piezas) : "" });
  const borrar = (id) => pedirBorrar({ ...data, movimientos: data.movimientos.filter((m) => m.id !== id) }, "Movimiento eliminado");

  const lista = data.movimientos.filter((m) => filtro === "todos" || m.tipo === filtro);
  const esGasto = f.tipo === "gasto";
  const insumoSel = data.insumos.find((i) => i.id === f.insumoId);
  const usaPaquete = f.porPaquete && insumoSel?.porPaquete && Number(insumoSel.unidadesPorPaquete) > 0;
  const cantidadReal = usaPaquete ? (Number(f.cantidad) || 0) * insumoSel.unidadesPorPaquete : (Number(f.cantidad) || 0);

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
              <Campo label={usaPaquete ? `${insumoSel.nombrePaquete || "Paquetes"} comprados` : "Cantidad como la compraste"}>
                <input type="number" inputMode="decimal" className="fq-in" placeholder="0" value={f.cantidad} onChange={c("cantidad")} />
              </Campo>
            </div>
            {insumoSel?.porPaquete && Number(insumoSel.unidadesPorPaquete) > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 13 }}>
                <input type="checkbox" checked={f.porPaquete} onChange={(e) => setF({ ...f, porPaquete: e.target.checked })} />
                Comprar por {insumoSel.nombrePaquete || "paquete"} ({num(insumoSel.unidadesPorPaquete)} {insumoSel.unidad} c/u)
              </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 13 }}>
              <input type="checkbox" checked={f.mayoreo} onChange={(e) => setF({ ...f, mayoreo: e.target.checked })} />
              Fue compra de mayoreo
            </label>
            {insumoSel && cantidadReal > 0 && Number(f.monto) > 0 && (
              <div className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 8, lineHeight: 1.5 }}>
                {usaPaquete && `${num(cantidadReal)} ${insumoSel.unidad} en total · `}
                {mxn(Number(f.monto) / cantidadReal)} por {insumoSel.unidad}
                {insumoSel.costoProm > 0 && ` · tu promedio va en ${mxn(insumoSel.costoProm)}`}
                {Number(insumoSel.merma) > 0 && ` · ya limpio ${mxn((Number(f.monto) / cantidadReal) / (1 - insumoSel.merma / 100))}`}
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

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 13 }}>
          <button className="fq-btn" style={{ flex: 1 }} onClick={agregar}>
            Guardar {esGasto ? "gasto" : "ingreso"}
          </button>
          {guardadoTick > 0 && <span key={guardadoTick} className="fq-confirm">Guardado</span>}
        </div>
      </div>

      <div className="fq-card">
        <div style={{ display: "flex", gap: 6, padding: "12px 13px", flexWrap: "wrap", alignItems: "center" }}>
          {[["todos", "Todos"], ["gasto", "Gastos"], ["ingreso", "Ingresos"]].map(([k, l]) => (
            <button key={k} className="fq-chip" onClick={() => aplicarFiltro(k)}
              style={filtro === k ? { background: "var(--tinta)", color: "#fff", borderColor: "var(--tinta)" } : {}}>{l}</button>
          ))}
          {filtroClicks >= 3 && (
            <button className={"fq-chip" + (!unlockVisto ? " fq-ping" : "")}
              onClick={() => { setComparar((v) => !v); setUnlockVisto(true); }}
              style={comparar ? { background: "var(--tinta)", color: "#fff", borderColor: "var(--tinta)" } : {}}>
              Comparar periodos
            </button>
          )}
        </div>
        {comparar && filtroClicks >= 3 && (
          <div className="fq-num" style={{ padding: "0 13px 12px", fontSize: 12, color: "var(--tinta-70)" }}>
            Este mes {mxn(comparativa.actual)} · mes pasado {mxn(comparativa.previo)}
            {comparativa.previo !== 0 && (
              <span style={{ color: comparativa.actual >= comparativa.previo ? "var(--teal)" : "var(--chile)" }}>
                {" "}({comparativa.actual >= comparativa.previo ? "+" : ""}{num(((comparativa.actual - comparativa.previo) / Math.abs(comparativa.previo)) * 100, 0)}%)
              </span>
            )}
          </div>
        )}
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
function Insumos({ data, set, pedirBorrar }) {
  const vacio = { nombre: "", tipo: "Fruta", unidad: "kg", merma: "", stock: "", costoProm: "", lugar: "", stockMin: "", notas: "",
    porPaquete: false, unidadesPorPaquete: "", nombrePaquete: "" };
  const [f, setF] = useState(vacio);
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState(null);
  const [busca, setBusca] = useState("");
  const [soloSinPrecio, setSoloSinPrecio] = useState(false);
  const [guardadoTick, setGuardadoTick] = useState(0);
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const agregar = () => {
    if (!f.nombre.trim()) return;
    set({
      insumos: [...data.insumos, {
        ...f, id: uid(), nombre: f.nombre.trim(), merma: Number(f.merma) || 0,
        stock: Number(f.stock) || 0, costoProm: Number(f.costoProm) || 0, ultimoCosto: Number(f.costoProm) || 0,
        precioUnit: 0, precioMayoreo: 0, stockMin: Number(f.stockMin) || 0, historial: [],
        porPaquete: !!f.porPaquete, unidadesPorPaquete: Number(f.unidadesPorPaquete) || 0, nombrePaquete: f.nombrePaquete.trim(),
      }],
    });
    setF(vacio); setAbierto(false);
    setGuardadoTick((n) => n + 1);
  };

  const ajustar = (id, d) => set({ insumos: data.insumos.map((i) => (i.id === id ? { ...i, stock: Math.max(0, i.stock + d) } : i)) });
  const TEXTO = ["nombre", "lugar", "notas", "tipo", "nombrePaquete"];
  const editar = (id, k, v) => set({ insumos: data.insumos.map((i) => (i.id === id ? { ...i, [k]: TEXTO.includes(k) ? v : Number(v) || 0 } : i)) });
  const editarPatch = (id, patch) => set({ insumos: data.insumos.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const borrar = (id) => pedirBorrar({ ...data, insumos: data.insumos.filter((i) => i.id !== id) }, "Insumo eliminado");

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
      unidadesPorPaquete: (i.unidadesPorPaquete || 0) * f,
      costoProm: (i.costoProm || 0) / f,
      ultimoCosto: (i.ultimoCosto || 0) / f,
      historial: (i.historial || []).map((h) => ({ ...h, costo: h.costo / f })),
    }));
    // Solo se convierten los ítems que heredan la unidad del insumo. Los que
    // ya tienen su propia unidad (ej. "250 ml") son independientes.
    const recetas = data.recetas.map((r) => ({
      ...r, items: r.items.map((it) => (it.tipo === "insumo" && it.refId === id && !it.unidad ? { ...it, cantidad: it.cantidad * f } : it)),
    }));
    const bases = data.bases.map((b) => ({
      ...b, items: b.items.map((it) => (it.insumoId === id && !it.unidad ? { ...it, cantidad: it.cantidad * f } : it)),
    }));
    set({ insumos, recetas, bases });
  };

  const valorTotal = data.insumos.reduce((a, i) => a + i.stock * i.costoProm, 0);
  const sinPrecio = data.insumos.filter((i) => !i.costoProm).length;
  const lista = data.insumos.filter((i) =>
    i.nombre.toLowerCase().includes(busca.toLowerCase()) && (!soloSinPrecio || !i.costoProm));

  return (
    <div className="fq-grid">
      <div className="fq-metrica-grid">
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
          <div style={{ marginTop: 12, padding: 12, background: "var(--escarcha)", borderRadius: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
              <input type="checkbox" checked={f.porPaquete} onChange={(e) => setF({ ...f, porPaquete: e.target.checked })} />
              Se compra por paquete (ej. leche, galletas Oreo)
            </label>
            {f.porPaquete && (
              <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
                <Campo label={`${f.unidad} por paquete`} hint={`Cuántos ${f.unidad} trae un paquete/caja`}>
                  <input type="number" inputMode="decimal" className="fq-in" placeholder="0" value={f.unidadesPorPaquete} onChange={c("unidadesPorPaquete")} />
                </Campo>
                <Campo label="Cómo le llamas" hint="Ej. caja, paquete, rejilla">
                  <input className="fq-in" placeholder="paquete" value={f.nombrePaquete} onChange={c("nombrePaquete")} />
                </Campo>
              </div>
            )}
          </div>
          {Number(f.merma) > 0 && Number(f.costoProm) > 0 && (
            <div className="fq-num" style={{ fontSize: 12, color: "var(--teal)", marginTop: 10 }}>
              Compras a {mxn(f.costoProm)}/{f.unidad}, pero el {f.unidad} limpio te sale en {mxn(Number(f.costoProm) / (1 - Number(f.merma) / 100))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <button className="fq-btn" style={{ flex: 1 }} onClick={agregar}>Guardar insumo</button>
            {guardadoTick > 0 && <span key={guardadoTick} className="fq-confirm">Guardado</span>}
          </div>
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
            {sel === i.id && <DetalleInsumo i={i} editar={editar} editarPatch={editarPatch} borrar={borrar} cambiarUnidad={cambiarUnidad} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetalleInsumo({ i, editar, editarPatch, borrar, cambiarUnidad }) {
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

      <div style={{ marginTop: 10, padding: 12, background: "var(--papel)", border: "1px solid var(--linea)", borderRadius: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
          <input type="checkbox" checked={!!i.porPaquete} onChange={(e) => editarPatch(i.id, { porPaquete: e.target.checked })} />
          Se compra por paquete
        </label>
        {i.porPaquete && (
          <div className="fq-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
            <Campo label={`${i.unidad} por paquete`} hint={`Cuántos ${i.unidad} trae un ${i.nombrePaquete || "paquete"}`}>
              <input type="number" inputMode="decimal" className="fq-in" value={i.unidadesPorPaquete || ""} placeholder="0"
                onChange={(e) => editar(i.id, "unidadesPorPaquete", e.target.value)} />
            </Campo>
            <Campo label="Cómo le llamas">
              <input className="fq-in" value={i.nombrePaquete || ""} placeholder="paquete"
                onChange={(e) => editar(i.id, "nombrePaquete", e.target.value)} />
            </Campo>
          </div>
        )}
        {i.porPaquete && Number(i.unidadesPorPaquete) > 0 && Number(i.costoProm) > 0 && (
          <div className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 8 }}>
            Un {i.nombrePaquete || "paquete"} = {num(i.unidadesPorPaquete)} {i.unidad} · te cuesta ~{mxn(i.costoProm * i.unidadesPorPaquete)}
          </div>
        )}
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

      <div className="fq-metrica-grid" style={{ marginTop: 12 }}>
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
  const editItem = (idx, k, v) => setF({ ...f, items: f.items.map((it, j) => {
    if (j !== idx) return it;
    if (k === "cantidad") return { ...it, cantidad: Number(v) || 0 };
    if (k === "insumoId") return { ...it, insumoId: v, unidad: undefined }; // otra unidad puede no aplicar
    return { ...it, [k]: v };
  }) });
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
      {f.items.map((it, idx) => {
        const ins = insumos.find((x) => x.id === it.insumoId);
        const units = ins ? unidadesCompatibles(ins.unidad) : [];
        return (
          <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select className="fq-in" style={{ flex: 2 }} value={it.insumoId} onChange={(e) => editItem(idx, "insumoId", e.target.value)}>
              {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
            </select>
            <input type="number" inputMode="decimal" className="fq-in" style={{ flex: 1 }} placeholder="Cant."
              value={it.cantidad || ""} onChange={(e) => editItem(idx, "cantidad", e.target.value)} />
            {units.length > 1 && (
              <select className="fq-in" style={{ flex: "0 0 64px", padding: "9px 6px" }} value={it.unidad || ins.unidad}
                onChange={(e) => editItem(idx, "unidad", e.target.value)}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
            <button className="fq-btn danger" style={{ padding: "0 10px" }} onClick={() => quitItem(idx)}>×</button>
          </div>
        );
      })}
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

function Bases({ data, guardar, pedirBorrar }) {
  const vacio = { nombre: "", unidad: "L", rinde: "", items: [], notas: "", stock: 0, costoProm: 0 };
  const [editando, setEditando] = useState(null); // "nuevo" | id
  const [lotes, setLotes] = useState({});

  const onGuardar = (f) => {
    if (editando === "nuevo") guardar({ ...data, bases: [...data.bases, { ...f, id: uid() }] });
    else guardar({ ...data, bases: data.bases.map((b) => (b.id === editando ? { ...b, ...f } : b)) });
    setEditando(null);
  };
  const borrar = (id) => { setEditando(null); pedirBorrar({ ...data, bases: data.bases.filter((b) => b.id !== id) }, "Base eliminada"); };

  const producir = (b, n) => {
    const cantidad = Number(n) || 1;
    const consumo = {};
    b.items.forEach((it) => {
      const i = data.insumos.find((x) => x.id === it.insumoId);
      consumo[it.insumoId] = (consumo[it.insumoId] || 0) + it.cantidad * factorItem(it.unidad, i?.unidad) * cantidad;
    });
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
                if (!i) return (
                  <div className="fq-row" key={k} style={{ padding: "6px 0" }}>
                    <span style={{ fontSize: 13, color: "var(--chile)" }}>⚠️ Insumo no encontrado</span>
                    <span className="fq-num" style={{ fontSize: 12, color: "var(--chile)" }}>
                      {num(it.cantidad)} {it.unidad || ""} · corrígelo en "Editar"
                    </span>
                  </div>
                );
                const cantBase = it.cantidad * factorItem(it.unidad, i.unidad);
                const fisico = cantBase / (1 - Math.min(95, Number(i.merma) || 0) / 100);
                return (
                  <div className="fq-row" key={k} style={{ padding: "6px 0" }}>
                    <span style={{ fontSize: 13 }}>{i.nombre}</span>
                    <span className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)" }}>
                      {num(it.cantidad)} {it.unidad || i.unidad}
                      {Number(i.merma) > 0 && ` (compras ${num(fisico)} ${i.unidad})`} · {mxn(costoUtil(i) * cantBase)}
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
function FormReceta({ inicial, opciones, data, onGuardar, onCancelar }) {
  const [f, setF] = useState(inicial);
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const refUnidad = (it) => (it.tipo === "base"
    ? data.bases.find((b) => b.id === it.refId)?.unidad
    : data.insumos.find((i) => i.id === it.refId)?.unidad);
  const addItem = () => {
    if (!opciones.length) return;
    const [tipo, refId] = opciones[0].v.split(":");
    setF({ ...f, items: [...f.items, { tipo, refId, cantidad: 0 }] });
  };
  const editItem = (idx, campo, v) =>
    setF({ ...f, items: f.items.map((it, j) => {
      if (j !== idx) return it;
      if (campo === "ref") { const [tipo, refId] = v.split(":"); return { ...it, tipo, refId, unidad: undefined }; }
      if (campo === "unidad") return { ...it, unidad: v };
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
      {f.items.map((it, idx) => {
        const ru = refUnidad(it);
        const units = ru ? unidadesCompatibles(ru) : [];
        return (
          <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select className="fq-in" style={{ flex: 2 }} value={`${it.tipo}:${it.refId}`} onChange={(e) => editItem(idx, "ref", e.target.value)}>
              {opciones.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <input type="number" inputMode="decimal" className="fq-in" style={{ flex: 1 }} placeholder="Cant."
              value={it.cantidad || ""} onChange={(e) => editItem(idx, "cantidad", e.target.value)} />
            {units.length > 1 && (
              <select className="fq-in" style={{ flex: "0 0 64px", padding: "9px 6px" }} value={it.unidad || ru}
                onChange={(e) => editItem(idx, "unidad", e.target.value)}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
            <button className="fq-btn danger" style={{ padding: "0 10px" }} onClick={() => quitItem(idx)}>×</button>
          </div>
        );
      })}
      <button className="fq-btn ghost" style={{ width: "100%" }} onClick={addItem}>Agregar base o insumo</button>
      <div className="fq-hint">Las bases traen el ⬢ enfrente. Puedes elegir la unidad (ej. ml o L) por ingrediente.</div>
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

function Paletas({ data, guardar, pedirBorrar }) {
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
  const borrar = (id) => { setSel(null); setEditando(null); pedirBorrar({ ...data, recetas: data.recetas.filter((r) => r.id !== id) }, "Sabor eliminado"); };

  // Producción con cantidades REALES capturadas. `lineas` trae, por ingrediente,
  // la cantidad física ya usada (en la unidad base del insumo/base) y su costo real.
  const producirReal = (r, corridas, lineas) => {
    const consumoIns = {}, consumoBase = {};
    lineas.forEach((l) => {
      const dest = l.tipo === "base" ? consumoBase : consumoIns;
      dest[l.refId] = (dest[l.refId] || 0) + l.cant;
    });
    const insumos = data.insumos.map((i) => (consumoIns[i.id] != null ? { ...i, stock: Math.max(0, i.stock - consumoIns[i.id]) } : i));
    const bases = data.bases.map((b) => (consumoBase[b.id] != null ? { ...b, stock: Math.max(0, b.stock - consumoBase[b.id]) } : b));
    const costo = lineas.reduce((a, l) => a + (l.costo || 0), 0);
    const piezas = (r.piezas || 0) * corridas;
    const prod = { id: uid(), fecha: hoy(), corridas, piezas, costo, costoPieza: piezas > 0 ? costo / piezas : 0 };
    const recetas = data.recetas.map((x) => (x.id === r.id
      ? { ...x, stock: (x.stock || 0) + piezas, producciones: [prod, ...(x.producciones || [])].slice(0, 60) }
      : x));
    guardar({ ...data, insumos, bases, recetas });
  };

  const piezasTotal = data.recetas.reduce((a, r) => a + (r.stock || 0), 0);
  const lista = data.recetas.filter((r) =>
    r.sabor.toLowerCase().includes(busca.toLowerCase()) && (linea === "todas" || r.linea === linea));

  return (
    <div className="fq-grid">
      <div className="fq-metrica-grid">
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
        <FormReceta inicial={vacio} opciones={opciones} data={data} onGuardar={onGuardar} onCancelar={() => setEditando(null)} />
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
            <div key={r.id}>
            <div className="fq-row" style={{ cursor: "pointer", background: sel === r.id ? "var(--escarcha)" : "transparent" }}
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
            {sel === r.id && (
              <div style={{ padding: 8, background: "var(--escarcha)" }}>
                {editando === r.id ? (
                  <FormReceta inicial={r} opciones={opciones} data={data} onGuardar={onGuardar} onCancelar={() => setEditando(null)} />
                ) : (
                  <DetalleReceta r={r} data={data} producir={producirReal} borrar={borrar} onEditar={() => setEditando(r.id)} />
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetalleReceta({ r, data, producir, borrar, onEditar }) {
  const partes = partesReceta(r, data).sort((a, b) => b.costo - a.costo);
  const costo = partes.reduce((a, p) => a + p.costo, 0);
  const faltantes = partes.filter((p) => p.sinCosto).length;
  const rotos = partes.filter((p) => p.roto).length;
  const piezas = r.piezas || 1;
  const porPieza = costo / piezas;
  const prods = r.producciones || [];
  const realPieza = costoRealPieza(r);
  const variacion = porPieza > 0 && realPieza > 0 ? ((realPieza - porPieza) / porPieza) * 100 : 0;
  const fijos = data.ajustes.costosFijosMes || 0;
  const utilMen = r.precioMenudeo - porPieza;
  const utilMay = r.precioMayoreo - porPieza;
  const equilibrio = utilMen > 0 ? Math.ceil(fijos / utilMen) : 0;

  // Progreso ambiental hacia el punto de equilibrio de este sabor este mes.
  const mesActual = claveMes(hoy());
  const piezasVendidasMes = data.movimientos
    .filter((m) => m.tipo === "ingreso" && m.recetaId === r.id && claveMes(m.fecha) === mesActual)
    .reduce((a, m) => a + (m.piezas || 0), 0);
  const progresoEquilibrio = equilibrio > 0 ? Math.min(100, (piezasVendidasMes / equilibrio) * 100) : 0;

  // Racha: últimas producciones dentro del estándar. Desbloqueo: con 5+
  // producciones aparece además la tendencia como una línea diminuta.
  const racha = prods.slice(0, 12).reverse().map((p) => porPieza > 0 && p.costoPieza <= porPieza);
  const sparkVals = prods.slice(0, 8).reverse().map((p) => (porPieza > 0 ? ((p.costoPieza - porPieza) / porPieza) * 100 : 0));
  const sparkPath = prods.length >= 5 ? sparklinePath(sparkVals, 88, 22) : "";

  const total = Math.max(1, Math.min(120, Math.round(piezas)));
  const celdas = [];
  partes.forEach((p) => {
    const n = costo > 0 ? Math.round((p.costo / costo) * total) : 0;
    for (let i = 0; i < n; i++) celdas.push(p.color);
  });
  while (celdas.length < total) celdas.push("#D8E2E2");
  celdas.length = total;

  return (
    <div className="fq-card fq-progreso" style={{ padding: 14, "--progreso": `${progresoEquilibrio}%` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="fq-eyebrow">Una corrida de {r.sabor} · {num(r.litros, 1)} L · {num(piezas, 0)} piezas</div>
        <button className="fq-btn ghost" style={{ padding: "4px 10px", fontSize: 12, whiteSpace: "nowrap" }} onClick={onEditar}>Editar receta</button>
      </div>
      {r.notas && <div style={{ fontSize: 12, color: "var(--tinta-70)", marginTop: 6, lineHeight: 1.45 }}>{r.notas}</div>}

      <div className="fq-2col" style={{ marginTop: 12 }}>
        <div>
          <div className="fq-molde">
            {celdas.map((color, i) => <div key={i} className="fq-celda" style={{ background: color }} />)}
          </div>
          <div style={{ fontSize: 11, color: "var(--tinta-40)", margin: "6px 0 12px" }}>
            Cada paleta del molde, pintada según a qué se le va el dinero.
          </div>

          {rotos > 0 && (
            <div style={{ fontSize: 12, color: "var(--chile)", marginBottom: 10, lineHeight: 1.4 }}>
              ⚠️ {rotos} ingrediente{rotos > 1 ? "s" : ""} de esta receta ya no existe{rotos > 1 ? "n" : ""} en tu catálogo de insumos/bases.
              Corrígelo en "Editar receta" — el costo de abajo NO los está contando.
            </div>
          )}
          {faltantes > 0 && (
            <div style={{ fontSize: 12, color: "var(--ambar)", marginBottom: 10, lineHeight: 1.4 }}>
              {faltantes} de estos insumos no tienen precio todavía. El costo de abajo está incompleto.
            </div>
          )}

          {partes.map((p, k) => (
            <div key={k} className="fq-row" style={{ padding: "7px 0" }}>
              <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: p.color }} />
                {p.roto ? "⚠️ " : p.esBase ? "⬢ " : ""}{p.nombre}
                <span className="fq-num" style={{ color: "var(--tinta-40)", fontSize: 11 }}>
                  {num(p.cantidad)} {p.unidad}{p.merma > 0 ? " limpio" : ""}
                </span>
              </span>
              <span className="fq-num" style={{ fontSize: 13, whiteSpace: "nowrap", color: p.roto ? "var(--chile)" : p.sinCosto ? "var(--ambar)" : "var(--tinta)" }}>
                {p.roto ? "no encontrado" : p.sinCosto ? "sin precio" : `${mxn(p.costo)} · ${num(costo > 0 ? (p.costo / costo) * 100 : 0, 0)}%`}
              </span>
            </div>
          ))}
        </div>

        <div>
          <div className="fq-metrica-grid">
            <Metrica eyebrow="Costo por corrida" valor={mxn(costo)} />
            <Metrica eyebrow="Costo por pieza" valor={mxn(porPieza)} />
            <Metrica eyebrow="Ganas al menudeo" valor={r.precioMenudeo > 0 ? mxn(utilMen) : "—"}
              color={utilMen > 0 ? "var(--teal)" : "var(--chile)"} sub={r.precioMenudeo > 0 ? `Vendes a ${mxn(r.precioMenudeo)}` : "Captura el precio"} />
            <Metrica eyebrow="Ganas al mayoreo" valor={r.precioMayoreo > 0 ? mxn(utilMay) : "—"}
              color={utilMay > 0 ? "var(--teal)" : "var(--chile)"} sub={r.precioMayoreo > 0 ? `Vendes a ${mxn(r.precioMayoreo)}` : "Captura el precio"} />
          </div>

          {prods.length > 0 && (
            <div className="fq-metrica-grid" style={{ marginTop: 10 }}>
              <Metrica eyebrow="Costo real / pieza (prom.)" valor={mxn(realPieza)}
                color={realPieza <= porPieza ? "var(--teal)" : "var(--chile)"}
                sub={`${prods.length} producciones · estándar ${mxn(porPieza)}`} />
              <Metrica eyebrow="Variación vs estándar" valor={`${variacion > 0 ? "+" : ""}${num(variacion, 0)}%`}
                color={variacion <= 0 ? "var(--teal)" : "var(--chile)"}
                sub={variacion > 0 ? "Cuesta más de lo planeado" : "Dentro del estándar"} />
            </div>
          )}

          {racha.length >= 3 && (
            <div style={{ marginTop: 10 }}>
              <div className="fq-eyebrow" style={{ marginBottom: 5 }}>Racha dentro del estándar</div>
              <div className="fq-racha">
                {racha.map((on, i) => <span key={i} className={"fq-racha-punto" + (on ? " on" : "")} />)}
                {sparkPath && (
                  <svg width="88" height="22" viewBox="0 0 88 22" style={{ marginLeft: 6, flexShrink: 0 }}>
                    <path d={sparkPath} fill="none" stroke="var(--teal)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="fq-hint">{sparkPath ? "Puntos = últimas producciones · línea = tendencia de variación" : "Puntos = últimas producciones dentro o fuera del estándar"}</div>
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <Metrica eyebrow="Punto de equilibrio" valor={equilibrio > 0 ? `${num(equilibrio, 0)} pzas al mes` : "—"}
              sub={fijos > 0 ? (equilibrio > 0 ? `Llevas ${num(piezasVendidasMes, 0)} vendidas este mes` : "Piezas al menudeo para cubrir tus costos fijos") : "Captura tus costos fijos en Ajustes"} />
          </div>

          <ProducirReceta r={r} data={data} producir={producir} porPieza={porPieza} />

          {prods.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="fq-eyebrow" style={{ marginBottom: 6 }}>Últimas producciones</div>
              {prods.slice(0, 6).map((p) => (
                <div className="fq-row" key={p.id} style={{ padding: "6px 0" }}>
                  <span className="fq-num" style={{ fontSize: 12, color: "var(--tinta-70)" }}>
                    {p.fecha} · {num(p.corridas, 0)} corr · {num(p.piezas, 0)} pzas
                  </span>
                  <span className="fq-num" style={{ fontSize: 12 }}>{mxn(p.costo)} · {mxn(p.costoPieza)}/pza</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 13 }}>
            <button className="fq-btn ghost" style={{ flex: 1 }} onClick={onEditar}>Editar receta</button>
            <button className="fq-btn danger" onClick={() => borrar(r.id)}>Borrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Panel de producción: captura lo REAL usado por ingrediente (kg/g, pzs o
   paquete) para descontar bien del inventario y sacar el costo real. */
function ProducirReceta({ r, data, producir, porPieza }) {
  const [corridas, setCorridas] = useState("1");
  const corridasNum = Number(corridas) || 1;
  const [reales, setReales] = useState({});
  const [logroActivo, setLogroActivo] = useState(false);

  const refDe = (it) => (it.tipo === "base"
    ? data.bases.find((b) => b.id === it.refId)
    : data.insumos.find((i) => i.id === it.refId));

  // Cantidad física teórica (en la unidad base del insumo/base) para las corridas.
  // En insumos sube la cantidad limpia de la receta por la merma estimada.
  const teoricoBase = (it) => {
    const ref = refDe(it);
    if (!ref) return 0;
    const enUnidad = it.cantidad * factorItem(it.unidad, ref.unidad) * corridasNum;
    if (it.tipo === "base") return enUnidad;
    const m = Math.min(95, Number(ref.merma) || 0) / 100;
    return enUnidad / (1 - m);
  };

  // Pre-llena lo real con lo teórico al cambiar corridas o de receta.
  useEffect(() => {
    setReales((prev) => {
      const next = {};
      r.items.forEach((it, idx) => {
        const ref = refDe(it);
        const unidad = prev[idx]?.unit || (ref ? ref.unidad : "");
        const teo = ref ? aUnidadCaptura(teoricoBase(it), ref, unidad) : 0;
        next[idx] = { unit: unidad, val: teo ? String(redondea(teo)) : "" };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id, corridasNum]);

  const setUnidad = (idx, unidad) => {
    const it = r.items[idx]; const ref = refDe(it);
    const teo = ref ? aUnidadCaptura(teoricoBase(it), ref, unidad) : 0;
    setReales((p) => ({ ...p, [idx]: { unit: unidad, val: teo ? String(redondea(teo)) : "" } }));
  };
  const setVal = (idx, val) => setReales((p) => ({ ...p, [idx]: { ...(p[idx] || {}), val } }));

  const lineas = r.items.map((it, idx) => {
    const ref = refDe(it);
    const st = reales[idx] || {};
    const unidad = st.unit || (ref ? ref.unidad : "");
    const fisico = ref ? aUnidadRef(st.val, ref, unidad) : 0;
    const costo = !ref ? 0 : it.tipo === "base"
      ? fisico * costoUnidadBase(ref, data.insumos)
      : fisico * (ref.costoProm || 0);
    return { idx, it, ref, unidad, fisico, costo };
  });
  const costoTotal = lineas.reduce((a, l) => a + l.costo, 0);
  const piezas = (r.piezas || 0) * corridasNum;

  const confirmar = () => {
    const payload = lineas.filter((l) => l.ref).map((l) => ({ tipo: l.it.tipo, refId: l.it.refId, cant: l.fisico, costo: l.costo }));
    producir(r, corridasNum, payload);
    // Momento de logro: la corrida salió igual o mejor que el estándar.
    if (porPieza > 0 && piezas > 0 && costoTotal / piezas <= porPieza) {
      setLogroActivo(true);
      setTimeout(() => setLogroActivo(false), 1500);
    }
  };

  const nombreUnidad = (ref, u) => (u === PAQ ? (ref.nombrePaquete || "paq") : u);

  return (
    <div className={logroActivo ? "fq-elevar" : undefined}
      style={{ marginTop: 14, padding: 12, background: "var(--papel)", border: "1px solid var(--linea)", borderRadius: 10 }}>
      <div className="fq-eyebrow" style={{ marginBottom: 8 }}>Registrar producción · cantidades reales usadas</div>
      <Campo label="Corridas / ciclos" hint="Cuántas veces hiciste esta receta. Pre-llena lo sugerido abajo.">
        <input type="number" inputMode="numeric" className="fq-in" value={corridas} onChange={(e) => setCorridas(e.target.value)} />
      </Campo>
      <div style={{ marginTop: 10 }}>
        {lineas.map((l) => {
          if (!l.ref) return null;
          const units = unidadesCaptura(l.ref, l.it.tipo);
          const teo = redondea(aUnidadCaptura(teoricoBase(l.it), l.ref, l.unidad));
          return (
            <div key={l.idx} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ flex: 2, fontSize: 13, minWidth: 0 }}>{l.it.tipo === "base" ? `⬢ ${l.ref.nombre}` : l.ref.nombre}</span>
                <input type="number" inputMode="decimal" className="fq-in" style={{ flex: 1 }} placeholder="0"
                  value={reales[l.idx]?.val ?? ""} onChange={(e) => setVal(l.idx, e.target.value)} />
                {units.length > 1 ? (
                  <select className="fq-in" style={{ flex: "0 0 78px", padding: "9px 6px" }} value={l.unidad}
                    onChange={(e) => setUnidad(l.idx, e.target.value)}>
                    {units.map((u) => <option key={u} value={u}>{nombreUnidad(l.ref, u)}</option>)}
                  </select>
                ) : (
                  <span className="fq-num" style={{ flex: "0 0 78px", fontSize: 12, color: "var(--tinta-40)", textAlign: "center" }}>{l.unidad}</span>
                )}
              </div>
              <div className="fq-num" style={{ fontSize: 11, color: "var(--tinta-40)", marginTop: 2 }}>
                sugerido {num(teo)} {nombreUnidad(l.ref, l.unidad)}
                {l.it.tipo === "insumo" && Number(l.ref.merma) > 0 ? ` (receta + merma ${num(l.ref.merma, 0)}%)` : ""}
                {" · "}{mxn(l.costo)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="fq-num" style={{ fontSize: 13, color: "var(--teal)", marginTop: 6 }}>
        Costo real {mxn(costoTotal)}{piezas > 0 ? ` · ${mxn(costoTotal / piezas)}/pza` : ""} · salen {num(piezas, 0)} paletas
      </div>
      <button className="fq-btn" style={{ width: "100%", marginTop: 10 }} onClick={confirmar}>Registrar producción</button>
      <div style={{ fontSize: 11, color: "var(--tinta-40)", marginTop: 7 }}>
        Descuenta del inventario lo que capturaste aquí (no la receta), guarda el costo real y mete las paletas al stock.
      </div>
    </div>
  );
}

/* ── Gráficas ──────────────────────────────────────────────── */
function Graficas({ data }) {
  const [insHist, setInsHist] = useState("");
  const ancho = useAncho();
  const movil = ancho < 768;

  // ── Costeo de paletas ──
  // "De agua" = sin base de leche/crema; "de leche" = usa alguna base (⬢).
  const costPieza = (r) => (r.piezas > 0 ? costoReceta(r, data) / r.piezas : 0);
  const esCrema = (r) => r.items.some((it) => it.tipo === "base");

  const conCosto = useMemo(
    () => data.recetas.filter((r) => r.piezas > 0 && costoReceta(r, data) > 0),
    [data.recetas, data.insumos, data.bases]
  );
  const prom = (arr) => (arr.length ? arr.reduce((a, r) => a + costPieza(r), 0) / arr.length : 0);
  const agua = conCosto.filter((r) => !esCrema(r));
  const crema = conCosto.filter((r) => esCrema(r));
  const promAgua = prom(agua), promCrema = prom(crema), promTodas = prom(conCosto);

  const ranking = useMemo(
    () => conCosto.map((r) => ({ sabor: r.sabor, costo: costPieza(r), crema: esCrema(r) })).sort((a, b) => b.costo - a.costo),
    [conCosto]
  );
  const masCara = ranking[0], masBarata = ranking[ranking.length - 1];
  const topCosto = ranking.slice(0, 14);

  const margenData = useMemo(
    () => conCosto.filter((r) => r.precioMenudeo > 0)
      .map((r) => ({ sabor: r.sabor, margen: ((r.precioMenudeo - costPieza(r)) / r.precioMenudeo) * 100 }))
      .sort((a, b) => b.margen - a.margen),
    [conCosto]
  );

  const insumosConHist = data.insumos.filter((i) => (i.historial || []).length > 1);
  const insSelId = insHist || insumosConHist[0]?.id || "";
  const insSel = data.insumos.find((i) => i.id === insSelId);

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

  const hayMov = data.movimientos.length > 0;

  return (
    <div className="fq-grid">
      {conCosto.length > 0 ? (
        <>
          <div className="fq-metrica-grid">
            <Metrica eyebrow="Costo prom. paletas de agua" valor={mxn(promAgua)} color="var(--teal)" sub={`${agua.length} sabores sin base`} />
            <Metrica eyebrow="Costo prom. paletas de leche" valor={mxn(promCrema)} color="var(--ambar)" sub={`${crema.length} sabores con base`} />
            <Metrica eyebrow="Costo prom. todas" valor={mxn(promTodas)} sub={`${conCosto.length} sabores costeados`} />
          </div>

          <div className="fq-metrica-grid">
            <Metrica eyebrow="La que más cuesta" valor={masCara ? masCara.sabor : "—"} color="var(--chile)"
              sub={masCara ? `${mxn(masCara.costo)} por pieza` : ""} />
            <Metrica eyebrow="La que menos cuesta" valor={masBarata ? masBarata.sabor : "—"} color="var(--teal)"
              sub={masBarata ? `${mxn(masBarata.costo)} por pieza` : ""} />
          </div>

          <div className="fq-2col">
            <Panelito titulo="Costo por pieza de cada sabor (teal = agua · ámbar = leche)">
              <BarChart data={topCosto} layout={movil ? "vertical" : "horizontal"}>
                <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={movil} horizontal={!movil} />
                {movil ? (
                  <>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="sabor" width={96} tick={{ fontSize: 10, fill: "#4A6B72" }} axisLine={false} tickLine={false} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="sabor" tick={{ fontSize: 9, fill: "#8FA6AB" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={64} />
                    <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={48} />
                  </>
                )}
                <Tooltip formatter={(v) => mxn(v)} />
                <Bar dataKey="costo" radius={movil ? [0, 3, 3, 0] : [3, 3, 0, 0]}>
                  {topCosto.map((d, i) => <Cell key={i} fill={d.crema ? "#E0A32E" : "#1FA39C"} />)}
                </Bar>
              </BarChart>
            </Panelito>

            {margenData.length > 0 && (
              <Panelito titulo="Margen al menudeo por sabor (%)">
                <BarChart data={margenData} layout={movil ? "vertical" : "horizontal"}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={movil} horizontal={!movil} />
                  {movil ? (
                    <>
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#8FA6AB" }} axisLine={false} tickLine={false} unit="%" />
                      <YAxis type="category" dataKey="sabor" width={96} tick={{ fontSize: 10, fill: "#4A6B72" }} axisLine={false} tickLine={false} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey="sabor" tick={{ fontSize: 9, fill: "#8FA6AB" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={64} />
                      <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={44} unit="%" />
                    </>
                  )}
                  <Tooltip formatter={(v) => `${num(v, 0)}%`} />
                  <Bar dataKey="margen" radius={movil ? [0, 3, 3, 0] : [3, 3, 0, 0]}>
                    {margenData.map((d, i) => <Cell key={i} fill={d.margen >= 50 ? "#1FA39C" : d.margen >= 0 ? "#E0A32E" : "#D0402E"} />)}
                  </Bar>
                </BarChart>
              </Panelito>
            )}
          </div>
        </>
      ) : (
        <div className="fq-card fq-empty">Carga el catálogo o captura precios de insumos para ver el análisis de costos de tus paletas.</div>
      )}

      {insumosConHist.length > 0 && (
        <div className="fq-card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="fq-eyebrow">Seguimiento histórico de precios</div>
            <select className="fq-in" style={{ width: "auto", maxWidth: 220 }} value={insSelId} onChange={(e) => setInsHist(e.target.value)}>
              {insumosConHist.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          <div style={{ height: 220, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insSel?.historial || []}>
                <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={46} domain={["auto", "auto"]} />
                <Tooltip formatter={(v) => mxn(v)} />
                <Line type="monotone" dataKey="costo" stroke="#7A5340" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="fq-hint">Precio por {insSel?.unidad} en cada compra registrada de {insSel?.nombre}.</div>
        </div>
      )}

      {hayMov ? (
        <>
      <div className="fq-2col">
      <Panelito titulo="A dónde se va el dinero">
        <BarChart data={porCategoria} layout="vertical">
          <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="categoria" width={movil ? 100 : 82} tick={{ fontSize: 11, fill: "#4A6B72" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => mxn(v)} />
          <Bar dataKey="monto" radius={[0, 3, 3, 0]}>
            {porCategoria.map((_, i) => <Cell key={i} fill={CELL_COLORS[i % CELL_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </Panelito>

      {porSabor.length > 0 && (
        <Panelito titulo="Qué sabores se venden más (piezas)">
          <BarChart data={porSabor} layout={movil ? "vertical" : "horizontal"}>
            <CartesianGrid strokeDasharray="2 4" stroke="#D8E2E2" vertical={movil} horizontal={!movil} />
            {movil ? (
              <>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#8FA6AB" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="sabor" width={92} tick={{ fontSize: 10, fill: "#4A6B72" }} axisLine={false} tickLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey="sabor" tick={{ fontSize: 9, fill: "#8FA6AB" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "#8FA6AB" }} axisLine={false} tickLine={false} width={40} />
              </>
            )}
            <Tooltip />
            <Bar dataKey="piezas" radius={movil ? [0, 3, 3, 0] : [3, 3, 0, 0]}>
              {porSabor.map((_, i) => <Cell key={i} fill={CELL_COLORS[i % CELL_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </Panelito>
      )}
      </div>

      <div className="fq-2col">
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
        </>
      ) : (
        <div className="fq-card fq-empty">Las gráficas de ingresos y gastos se dibujan en cuanto captures movimientos.</div>
      )}
    </div>
  );
}

const Panelito = ({ titulo, children }) => {
  const ancho = useAncho();
  return (
    <div className="fq-card" style={{ padding: 14 }}>
      <div className="fq-eyebrow">{titulo}</div>
      <div style={{ height: ancho < 768 ? 180 : 230, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
};

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
