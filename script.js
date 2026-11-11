
const KEY = "cerveza_usuarios";
const ADMIN_CEDULA = "0000000000";     // CAMBIAR
const ADMIN_PASS   = "admin123";        // CAMBIAR

const $ = s => document.querySelector(s);
const show = id => {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $("#"+id).classList.add("active");
  $("#subtitle").textContent = id === "vRegistro" ? "Solicita tu cuenta" : "Inicia sesión para continuar";
  ["#msgLogin","#msgReg"].forEach(m => $(m).className = "msg");
};
const note = (sel, text, type) => { const m = $(sel); m.textContent = text; m.className = "msg show " + type; };

const getUsers = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const setUsers = u => localStorage.setItem(KEY, JSON.stringify(u));

async function hash(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); show(b.dataset.go); }));

/* ---------- Registro ---------- */
$("#formReg").addEventListener("submit", async e => {
  e.preventDefault();
  const nombre = $("#rNombre").value.trim();
  const cedula = $("#rCedula").value.trim();
  const tel = $("#rTel").value.trim();
  const rol = document.querySelector('input[name="rol"]:checked').value;
  const p1 = $("#rPass").value, p2 = $("#rPass2").value;

  if(!/^\d{6,12}$/.test(cedula)) return note("#msgReg","La cédula debe tener entre 6 y 12 números.","err");
  if(!/^\d{7,12}$/.test(tel)) return note("#msgReg","Ingresa un teléfono válido (solo números).","err");
  if(p1.length < 6) return note("#msgReg","La contraseña debe tener mínimo 6 caracteres.","err");
  if(p1 !== p2) return note("#msgReg","Las contraseñas no coinciden.","err");
  if(cedula === ADMIN_CEDULA) return note("#msgReg","Esa cédula no está disponible.","err");

  const users = getUsers();
  if(users.some(u => u.cedula === cedula)) return note("#msgReg","Ya existe una solicitud o cuenta con esa cédula.","err");

  users.push({ nombre, cedula, telefono: tel, rol, estado: "pendiente", pass: await hash(p1), creado: new Date().toISOString() });
  setUsers(users);
  e.target.reset();
  show("vLogin");
  note("#msgLogin","Solicitud enviada. Un administrador debe aprobar tu cuenta antes de que puedas ingresar.","ok");
});

/* ---------- Login ---------- */
$("#formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  const cedula = $("#lCedula").value.trim();
  const pass = $("#lPass").value;

  if(cedula === ADMIN_CEDULA && pass === ADMIN_PASS){
    sessionStorage.setItem("sesion","admin");
    return openAdmin();
  }
  const u = getUsers().find(x => x.cedula === cedula);
  if(!u || u.pass !== await hash(pass)) return note("#msgLogin","Cédula o contraseña incorrectas.","err");
  if(u.estado === "pendiente") return note("#msgLogin","Tu cuenta aún está pendiente de aprobación por un administrador.","warn");
  if(u.estado === "rechazada") return note("#msgLogin","Tu solicitud fue rechazada. Contacta a un administrador.","err");

  sessionStorage.setItem("sesion", u.cedula);
  openWelcome(u);
});

function openWelcome(u){
  $("#wNombre").textContent = "¡Hola, " + u.nombre + "!";
  $("#wRol").textContent = u.rol;
  show("vWelcome");
}

/* ---------- Panel admin ---------- */
let filtro = "pendiente";
function openAdmin(){
  $("#cardMain").style.display = "none";
  $("#cardAdmin").style.display = "block";
  renderTabla();
}
function renderTabla(){
  const users = getUsers().filter(u => filtro === "todas" || u.estado === filtro);
  const tb = $("#tbody");
  tb.innerHTML = "";
  if(!users.length){
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">No hay registros.</td></tr>';
    return;
  }
  users.forEach(u => {
    const tr = document.createElement("tr");
    const cells = [u.nombre, u.cedula, u.telefono, u.rol];
    cells.forEach(t => { const td = document.createElement("td"); td.textContent = t; tr.appendChild(td); });
    const tdE = document.createElement("td");
    tdE.innerHTML = '<span class="badge b-'+u.estado+'">'+u.estado+'</span>';
    tr.appendChild(tdE);
    const tdA = document.createElement("td");
    tdA.className = "acts";
    if(u.estado !== "aprobada") tdA.appendChild(btn("Aprobar","a-ok",()=>cambiar(u.cedula,"aprobada")));
    if(u.estado !== "rechazada") tdA.appendChild(btn("Rechazar","a-no",()=>cambiar(u.cedula,"rechazada")));
    tdA.appendChild(btn("Eliminar","a-del",()=>eliminar(u.cedula)));
    tr.appendChild(tdA);
    tb.appendChild(tr);
  });
}
function btn(text, cls, fn){ const b = document.createElement("button"); b.textContent = text; b.className = cls; b.onclick = fn; return b; }
function cambiar(cedula, estado){
  const users = getUsers();
  const u = users.find(x => x.cedula === cedula);
  if(u){ u.estado = estado; setUsers(users); }
  renderTabla();
  note("#msgAdmin","Cuenta de "+u.nombre+" marcada como "+estado+".","ok");
}
function eliminar(cedula){
  if(!confirm("¿Eliminar esta cuenta definitivamente?")) return;
  setUsers(getUsers().filter(x => x.cedula !== cedula));
  renderTabla();
}
$("#tabs").addEventListener("click", e => {
  if(e.target.tagName !== "BUTTON") return;
  filtro = e.target.dataset.f;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b === e.target));
  renderTabla();
});

/* ---------- Salir ---------- */
function salir(){
  sessionStorage.removeItem("sesion");
  $("#cardAdmin").style.display = "none";
  $("#cardMain").style.display = "block";
  $("#formLogin").reset();
  show("vLogin");
}
$("#btnSalir1").onclick = salir;
$("#btnSalir2").onclick = salir;

/* ---------- Restaurar sesión al recargar ---------- */
(function(){
  const s = sessionStorage.getItem("sesion");
  if(s === "admin") return openAdmin();
  if(s){ const u = getUsers().find(x => x.cedula === s && x.estado === "aprobada"); if(u) openWelcome(u); }
})();
