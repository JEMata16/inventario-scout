import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFiltros, filtrosAParams, rangoInstantes, diaCR } from "./filtros";
import {
  diasTraslapados,
  generarCSV,
  generarGrupos,
  granularidadPara,
  inicioGrupo,
  porcentaje,
  porcentajeUtilizacion,
} from "./calculos";
import { aISO, parseFecha as f } from "../fechas";

const HOY = "2026-10-09"; // viernes

// ── Filtros ─────────────────────────────────────────────────────────────────

test("filtros: por defecto, últimos 3 meses sin sección", () => {
  const r = parseFiltros({}, HOY);
  assert.equal(r.preset, "3meses");
  assert.equal(aISO(r.desde), "2026-07-10");
  assert.equal(aISO(r.hasta), HOY);
  assert.equal(r.seccion, null);
  assert.equal(r.pagina, 1);
});

test("filtros: este mes y este año", () => {
  assert.equal(aISO(parseFiltros({ periodo: "mes" }, HOY).desde), "2026-10-01");
  assert.equal(aISO(parseFiltros({ periodo: "anio" }, HOY).desde), "2026-01-01");
});

test("filtros: 3 meses desde un fin de mes corto", () => {
  // 31 de mayo - 3 meses = "31 de febrero" -> Date.UTC lo lleva a 3 de marzo; +1 día
  assert.equal(aISO(parseFiltros({ periodo: "3meses" }, "2026-05-31").desde), "2026-03-04");
});

test("filtros: personalizado válido", () => {
  const r = parseFiltros({ periodo: "personalizado", desde: "2026-02-01", hasta: "2026-02-28", seccion: "TROPA", pagina: "3" }, HOY);
  assert.equal(r.preset, "personalizado");
  assert.equal(aISO(r.desde), "2026-02-01");
  assert.equal(aISO(r.hasta), "2026-02-28");
  assert.equal(r.seccion, "TROPA");
  assert.equal(r.pagina, 3);
});

test("filtros: lo inválido vuelve al valor por defecto", () => {
  // hasta antes de desde
  assert.equal(parseFiltros({ periodo: "personalizado", desde: "2026-03-01", hasta: "2026-02-01" }, HOY).preset, "3meses");
  // fecha inexistente
  assert.equal(parseFiltros({ periodo: "personalizado", desde: "2026-02-30", hasta: "2026-03-01" }, HOY).preset, "3meses");
  // más de dos años
  assert.equal(parseFiltros({ periodo: "personalizado", desde: "2020-01-01", hasta: "2026-01-01" }, HOY).preset, "3meses");
  // sección y página inválidas
  const r = parseFiltros({ seccion: "SCOUTS", pagina: "-2", periodo: "xyz" }, HOY);
  assert.equal(r.seccion, null);
  assert.equal(r.pagina, 1);
  assert.equal(r.preset, "3meses");
});

test("filtros: ida y vuelta por la URL", () => {
  const r = parseFiltros({ periodo: "personalizado", desde: "2026-02-01", hasta: "2026-02-28", seccion: "WAK" }, HOY);
  const p = Object.fromEntries(filtrosAParams(r));
  assert.deepEqual(p, { periodo: "personalizado", desde: "2026-02-01", hasta: "2026-02-28", seccion: "WAK" });
  assert.deepEqual(Object.fromEntries(filtrosAParams(parseFiltros({}, HOY))), { periodo: "3meses" });
});

test("instantes: los días del período se cuentan en hora de Costa Rica", () => {
  const { inicio, fin } = rangoInstantes({ desde: f("2026-10-01"), hasta: f("2026-10-01") });
  assert.equal(inicio.toISOString(), "2026-10-01T06:00:00.000Z");
  assert.equal(fin.toISOString(), "2026-10-02T06:00:00.000Z");
  // 7 p.m. en Costa Rica del 1 de octubre = 1 a.m. UTC del 2: sigue siendo el día 1
  assert.equal(aISO(diaCR(new Date("2026-10-02T01:00:00Z"))), "2026-10-01");
});

// ── Grupos de la serie temporal ─────────────────────────────────────────────

test("granularidad según el largo del período", () => {
  assert.equal(granularidadPara(f("2026-10-01"), f("2026-10-31")), "dia");
  assert.equal(granularidadPara(f("2026-07-10"), f("2026-10-09")), "semana");
  assert.equal(granularidadPara(f("2026-01-01"), f("2026-10-09")), "mes");
});

test("grupos: semanas empiezan en lunes e incluyen las vacías", () => {
  assert.equal(aISO(inicioGrupo(f("2026-10-09"), "semana")), "2026-10-05"); // viernes -> lunes
  assert.equal(aISO(inicioGrupo(f("2026-10-05"), "semana")), "2026-10-05");
  const g = generarGrupos(f("2026-09-16"), f("2026-10-09"), "semana");
  assert.deepEqual(g.map((x) => x.clave), ["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"]);
});

test("grupos: días y meses", () => {
  assert.equal(generarGrupos(f("2026-10-01"), f("2026-10-09"), "dia").length, 9);
  const meses = generarGrupos(f("2026-01-15"), f("2026-03-02"), "mes");
  assert.deepEqual(meses.map((x) => x.clave), ["2026-01-01", "2026-02-01", "2026-03-01"]);
});

// ── Utilización ─────────────────────────────────────────────────────────────

test("días traslapados", () => {
  assert.equal(diasTraslapados(f("2026-10-01"), f("2026-10-03"), f("2026-10-01"), f("2026-10-31")), 3);
  assert.equal(diasTraslapados(f("2026-09-29"), f("2026-10-02"), f("2026-10-01"), f("2026-10-31")), 2);
  assert.equal(diasTraslapados(f("2026-09-01"), f("2026-09-03"), f("2026-10-01"), f("2026-10-31")), 0);
});

test("utilización: unidades·día sobre la capacidad del período", () => {
  // 10 días, 5 unidades = 50 unidades·día. 2 unidades × 5 días = 10 -> 20%
  const desde = f("2026-10-01");
  const hasta = f("2026-10-10");
  assert.equal(porcentajeUtilizacion([{ cantidad: 2, inicio: f("2026-10-01"), fin: f("2026-10-05") }], 5, desde, hasta), 20);
  assert.equal(porcentajeUtilizacion([], 5, desde, hasta), 0);
  assert.equal(porcentajeUtilizacion([], 0, desde, hasta), null);
  // Nunca pasa de 100 aunque los datos históricos superen la capacidad actual
  assert.equal(porcentajeUtilizacion([{ cantidad: 9, inicio: desde, fin: hasta }], 5, desde, hasta), 100);
});

test("porcentaje sin base es null", () => {
  assert.equal(porcentaje(1, 3), 33);
  assert.equal(porcentaje(0, 0), null);
});

// ── CSV ─────────────────────────────────────────────────────────────────────

test("CSV: BOM, separador ; y escape", () => {
  const csv = generarCSV(["Sección", "Detalle"], [["Tropa", 'Dijo "hola"; ok'], ["Wak", null]]);
  assert.ok(csv.startsWith("﻿"));
  assert.equal(csv.slice(1), 'Sección;Detalle\r\nTropa;"Dijo ""hola""; ok"\r\nWak;\r\n');
});

test("CSV: neutraliza fórmulas en texto de usuarios, no en números", () => {
  const csv = generarCSV(["a", "b"], [["=HYPERLINK(\"x\")", -5]]);
  assert.equal(csv.slice(1).split("\r\n")[1], `"'=HYPERLINK(""x"")";-5`);
});
