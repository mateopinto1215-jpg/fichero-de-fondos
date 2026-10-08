"""Prueba del parser de fichas CAFCI con una ficha de ejemplo (estructura real de
estadisticas.cafci.org.ar/fondos/345?clase=576, Fima Premium - Clase B, 06/10/2026)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cafci import parse_ficha, rendimientos_directos, num_ar, fecha_ar  # noqa: E402

FIXTURE = """
<div id="rightContent">
 <div id="titlePage"><p class="encuentreColortxt">Fima Premium - Clase B <span>información al 06/10/2026</span></p></div>
 <div id="fichaLeft">
  <div id="consulta" class="divContent">
   <h3>Rendimiento Histórico (TNA)
              <span>— al 07/10/2026</span></h3>
   <table class="tablaRendimientos"><tbody>
    <tr class="titleTable"><td>Período</td><td>Fima Premium - Clase B</td></tr>
    <tr><td class="flechaTabla">Valor Cuotaparte</td><td>103.459,337</td></tr>
    <tr><td class="flechaTabla">7 días</td><td>18,8518 %</td></tr>
    <tr><td class="flechaTabla">1 mes</td><td>18,7844 %</td></tr>
    <tr><td class="flechaTabla">90 días</td><td>18,7075 %</td></tr>
    <tr><td class="flechaTabla">180 días</td><td>18,8613 %</td></tr>
    <tr><td class="flechaTabla">En el año</td><td>21,92 %</td></tr>
    <tr><td class="flechaTabla">12 meses</td><td>24,6386 %</td></tr>
   </tbody></table>
  </div>
  <div id="cuotaparte" class="divContent">
   <h3>Valores al 06/10/2026</h3>
   <p>Patrimonio bajo administración: <b>4.509.280.084.420,87</b></p>
   <p>Valor por cada cuotaparte: <b>103,459337</b></p>
   <p>(Valor por mil: 103.459,337)</p>
  </div>
  <div id="cartera" class="divContent">
   <h3>Composición de Cartera</h3><p>Valores al 18/09/2026</p>
   <div data-controller="pie-chart" data-pie-chart-items-value='[{"nombre":"Pzo Fi $ Bco Santander Ri","porcentaje":16.4},{"nombre":"Pzo Fi $ Bco Nacion","porcentaje":15.9},{"nombre":"Caucion Colocadora $ BYMA","porcentaje":7.0}]'></div>
  </div>
  <div id="calificacion" class="divContent">
   <h3>Calificación</h3>
   <table class="tablaDatos">
    <tr><td>Calificadora de riesgo</td><td>Calificacion</td><td>Fecha</td></tr>
    <tr><td>Moodys Local Calif. Riesgo</td><td>AA+.ar</td><td>26/02/2021</td></tr>
   </table>
  </div>
  <div id="honorarios" class="divContent">
   <h3>Honorarios y Comisiones</h3>
   <table class="tablaDatos">
    <tr><td>Honorarios de la gerente</td><td>Honorarios de la depositaria</td></tr>
    <tr><td>1.7425</td><td>0.3075</td></tr>
    <tr><td>Comisión de ingreso</td><td>Comisión de egreso</td><td>Comisión de transferencia</td></tr>
    <tr><td>0.0</td><td>0.0</td><td>0.0</td></tr>
    <tr><td>Gastos ordinarios de gestión</td><td>Comisión de éxito</td><td>Otros</td></tr>
    <tr><td>0.0</td><td>—</td><td>—</td></tr>
   </table>
  </div>
 </div>
</div>
"""


def test():
    assert num_ar("4.509.280.084.420,87") == 4509280084420.87
    assert num_ar("18,8518 %") == 18.8518
    assert num_ar("1.7425") == 1.7425
    assert num_ar("103.459,337") == 103459.337
    assert num_ar("—") is None
    assert fecha_ar("— al 07/10/2026") == "2026-10-07"

    d = parse_ficha(FIXTURE)
    assert d["f_rend"] == "2026-10-07", d["f_rend"]
    assert d["f_val"] == "2026-10-06", d["f_val"]
    assert d["vcp"] == 103.459337
    assert d["patrimonio"] == 4509280084420.87
    assert d["tna"] == {"d7": 18.8518, "m1": 18.7844, "d90": 18.7075, "d180": 18.8613, "ytd": 21.92, "m12": 24.6386}, d["tna"]
    assert d["f_cart"] == "2026-09-18"
    assert d["cartera"][0] == ["Pzo Fi $ Bco Santander Ri", 16.4] and len(d["cartera"]) == 3
    assert d["calif"] == [["Moodys Local Calif. Riesgo", "AA+.ar", "2021-02-26"]], d["calif"]
    h = d["hon"]
    assert h["gerente"] == 1.7425 and h["depositaria"] == 0.3075 and h["ingreso"] == 0.0 and h["exito"] is None, h

    r = rendimientos_directos(d["tna"], d["f_rend"])
    # CriptoYa (misma fuente) muestra para este fondo: mes 1,5 %, YTD 16,8 %, año 24,7 %
    assert abs(r["m1"] - 1.5) < 0.1, r
    assert abs(r["ytd"] - 16.8) < 0.15, r
    assert abs(r["m12"] - 24.7) < 0.1, r
    print("OK parser:", r)


if __name__ == "__main__":
    test()
