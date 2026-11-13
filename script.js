const KEY = "cerveza_usuarios";
const KEY_PEDIDOS = "cerveza_pedidos";

const ADMIN_CEDULA = "0000000000";
const ADMIN_PASS = "admin123";

const DOMICILIO = 5000;

/* ---------- PRODUCTOS ---------- */

const PRODUCTOS = [
  {
    id: 1,
    nombre: "Cerveza Aguila",
    marca: "Original",
    presentacion: "Canasta x 30 unidades",
    precio: 75000,
    emoji: "🍺"
  },
  {
    id: 2,
    nombre: "Cerveza Poker",
    marca: "Poker",
    presentacion: "Canasta x 30 unidades",
    precio: 95000,
    emoji: "🍻"
  },
  {
    id: 3,
    nombre: "Cerveza Costeñita",
    marca: "Costeñita",
    presentacion: "Canasta x 38 unidades",
    precio: 82000,
    emoji: "🍺"
  },
  {
    id: 4,
    nombre: "Cerveza Corona",
    marca: "Light",
    presentacion: "Canasta x 30 unidades",
    precio: 70000,
    emoji: "🍻"
  }
];

/* ---------- VARIABLES ---------- */

let carrito = {};
let clienteActual = null;
let vendedorActual = null;
let filtro = "pendiente";

/* ---------- FUNCIONES GENERALES ---------- */

const $ = selector => document.querySelector(selector);

const dinero = valor =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(valor);

const getUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const setUsers = usuarios => {
  localStorage.setItem(KEY, JSON.stringify(usuarios));
};

const show = id => {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.remove("active");
  });

  const vista = $("#" + id);

  if (vista) {
    vista.classList.add("active");
  }

  const subtitle = $("#subtitle");

  if (subtitle) {
    subtitle.textContent =
      id === "vRegistro"
        ? "Solicita tu cuenta"
        : "Inicia sesión para continuar";
  }

  ["#msgLogin", "#msgReg"].forEach(selector => {
    const mensaje = $(selector);

    if (mensaje) {
      mensaje.className = "msg";
    }
  });
};

const note = (selector, texto, tipo) => {
  const mensaje = $(selector);

  if (!mensaje) return;

  mensaje.textContent = texto;
  mensaje.className = "msg show " + tipo;
};

/* ---------- PEDIDOS COMPARTIDOS ---------- */

function obtenerTodosLosPedidos() {
  try {
    const pedidos = JSON.parse(localStorage.getItem(KEY_PEDIDOS) || "[]");
    return Array.isArray(pedidos) ? pedidos : [];
  } catch {
    return [];
  }
}

function guardarTodosLosPedidos(pedidos) {
  localStorage.setItem(KEY_PEDIDOS, JSON.stringify(pedidos));
}

const KEY_STOCK = "cerveza_stock";
const KEY_ABASTECIMIENTO = "cerveza_abastecimiento";
const KEY_CHATS = "cerveza_chats";
const STOCK_INICIAL = { 1: 20, 2: 18, 3: 15, 4: 12 };
// Capacidad de referencia para expresar el inventario como porcentaje.
const STOCK_CAPACIDAD = { 1: 30, 2: 30, 3: 30, 4: 30 };
let repartidorChatSeleccionado = null;
let pedidoChatClienteSeleccionado = null;

function obtenerStock() {
  let stock = {};
  try { stock = JSON.parse(localStorage.getItem(KEY_STOCK) || "null") || {}; } catch {}
  PRODUCTOS.forEach(p => { if (!Number.isFinite(Number(stock[p.id]))) stock[p.id] = STOCK_INICIAL[p.id] || 0; });
  localStorage.setItem(KEY_STOCK, JSON.stringify(stock));
  return stock;
}
function guardarStock(stock) { localStorage.setItem(KEY_STOCK, JSON.stringify(stock)); }
function obtenerAbastecimientos() {
  try { return JSON.parse(localStorage.getItem(KEY_ABASTECIMIENTO) || "[]") || []; } catch { return []; }
}
function obtenerChats() {
  try { return JSON.parse(localStorage.getItem(KEY_CHATS) || "{}") || {}; } catch { return {}; }
}
function guardarChats(chats) { localStorage.setItem(KEY_CHATS, JSON.stringify(chats)); }
function claveChat(pedidoId) { return String(pedidoId); }
function horaActual() { return new Date().toLocaleString("es-CO"); }

/* ---------- CONTRASEÑAS ---------- */

async function hash(texto) {
  if (window.crypto && window.crypto.subtle) {
    const buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(texto)
    );

    return [...new Uint8Array(buffer)]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  // Alternativa para pruebas cuando Web Crypto no está disponible.
  let resultado = 2166136261;

  for (let i = 0; i < texto.length; i++) {
    resultado ^= texto.charCodeAt(i);
    resultado = Math.imul(resultado, 16777619);
  }

  return "demo-" + (resultado >>> 0).toString(16);
}

/* =========================================
   NAVEGACIÓN ENTRE VISTAS
========================================= */

document.querySelectorAll("[data-go]").forEach(boton => {
  boton.addEventListener("click", evento => {
    evento.preventDefault();
    show(boton.dataset.go);
  });
});

/* =========================================
   REGISTRO DE USUARIOS
========================================= */

$("#formReg").addEventListener("submit", async evento => {
  evento.preventDefault();

  const nombre = $("#rNombre").value.trim();
  const cedula = $("#rCedula").value.trim();
  const telefono = $("#rTel").value.trim();

  const rolSeleccionado = document.querySelector(
    'input[name="rol"]:checked'
  );

  if (!rolSeleccionado) {
    return note("#msgReg", "Selecciona un tipo de usuario.", "err");
  }

  const rol = rolSeleccionado.value;

  const pass1 = $("#rPass").value;
  const pass2 = $("#rPass2").value;

  if (!/^\d{6,12}$/.test(cedula)) {
    return note(
      "#msgReg",
      "La cédula debe tener entre 6 y 12 números.",
      "err"
    );
  }

  if (!/^\d{7,12}$/.test(telefono)) {
    return note(
      "#msgReg",
      "Ingresa un teléfono válido (solo números).",
      "err"
    );
  }

  if (pass1.length < 6) {
    return note(
      "#msgReg",
      "La contraseña debe tener mínimo 6 caracteres.",
      "err"
    );
  }

  if (pass1 !== pass2) {
    return note(
      "#msgReg",
      "Las contraseñas no coinciden.",
      "err"
    );
  }

  if (cedula === ADMIN_CEDULA) {
    return note(
      "#msgReg",
      "Esa cédula no está disponible.",
      "err"
    );
  }

  const usuarios = getUsers();

  if (usuarios.some(usuario => usuario.cedula === cedula)) {
    return note(
      "#msgReg",
      "Ya existe una solicitud o cuenta con esa cédula.",
      "err"
    );
  }

  const nuevoUsuario = {
    nombre,
    cedula,
    telefono,
    rol,
    estado: "pendiente",
    pass: await hash(pass1),
    creado: new Date().toISOString()
  };

  usuarios.push(nuevoUsuario);
  setUsers(usuarios);

  evento.target.reset();

  show("vLogin");

  note(
    "#msgLogin",
    "Solicitud enviada. Un administrador debe aprobar tu cuenta antes de ingresar.",
    "ok"
  );
});

/* =========================================
   INICIO DE SESIÓN
========================================= */

$("#formLogin").addEventListener("submit", async evento => {
  evento.preventDefault();

  const cedula = $("#lCedula").value.trim();
  const pass = $("#lPass").value;

  // Acceso del administrador
  if (cedula === ADMIN_CEDULA && pass === ADMIN_PASS) {
    sessionStorage.setItem("sesion", "admin");
    return openAdmin();
  }

  const usuario = getUsers().find(
    elemento => elemento.cedula === cedula
  );

  if (!usuario || usuario.pass !== await hash(pass)) {
    return note(
      "#msgLogin",
      "Cédula o contraseña incorrectas.",
      "err"
    );
  }

  if (usuario.estado === "pendiente") {
    return note(
      "#msgLogin",
      "Tu cuenta aún está pendiente de aprobación.",
      "warn"
    );
  }

  if (usuario.estado === "rechazada") {
    return note(
      "#msgLogin",
      "Tu solicitud fue rechazada. Contacta a un administrador.",
      "err"
    );
  }

  sessionStorage.setItem("sesion", usuario.cedula);

  openWelcome(usuario);
});

/* =========================================
   BIENVENIDA Y REDIRECCIÓN POR ROL
========================================= */

function openWelcome(usuario) {

  if (usuario.rol === "cliente") {
    openCliente(usuario);
    return;
  }

  if (usuario.rol === "repartidor") {
    openRepartidor(usuario);
    return;
  }

  $("#cardCliente").style.display = "none";
  $("#cardVendedor").style.display = "none";
  $("#cardRepartidor").style.display = "none";
  $("#cardAdmin").style.display = "none";
  $("#cardMain").style.display = "block";

  $("#wNombre").textContent = "¡Hola, " + usuario.nombre + "!";
  $("#wRol").textContent = usuario.rol;

  show("vWelcome");
}

/* =========================================
   PANEL DEL CLIENTE
========================================= */

/* Obtener carrito del cliente */

function obtenerCarrito() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "cerveza_carrito_" + clienteActual.cedula
      )
    ) || {};
  } catch {
    return {};
  }
}

/* Guardar carrito */

function guardarCarrito() {
  if (!clienteActual) return;

  localStorage.setItem(
    "cerveza_carrito_" + clienteActual.cedula,
    JSON.stringify(carrito)
  );
}

/* Obtener pedidos */

function obtenerPedidos() {
  try {
    const todos = JSON.parse(
      localStorage.getItem(KEY_PEDIDOS)
    ) || [];

    return todos.filter(
      pedido => pedido.cliente === clienteActual.cedula
    );
  } catch {
    return [];
  }
}

/* Abrir panel del cliente */

function openCliente(usuario) {
  clienteActual = usuario;
  carrito = obtenerCarrito();

  $("#cardMain").style.display = "none";
  $("#cardAdmin").style.display = "none";
  $("#cardVendedor").style.display = "none";
  $("#cardRepartidor").style.display = "none";
  $("#cardCliente").style.display = "block";

  $("#clienteSaludo").textContent =
    "¡Hola, " + usuario.nombre + "!";

  renderCatalogo();
  renderCarrito();
  renderPedidos();
  renderChatCliente();
  mostrarSeccionCliente("catalogo");
}

/* Mostrar catálogo */

function renderCatalogo() {
  const contenedor = $("#catalogoProductos");

  contenedor.innerHTML = "";

  const stockActual = obtenerStock();
  PRODUCTOS.forEach(producto => {
    const article = document.createElement("article");
    const disponibles = Number(stockActual[producto.id]) || 0;

    article.className = "producto";

    article.innerHTML = `
      <div class="producto-imagen">${producto.emoji}</div>

      <div class="producto-info">
        <h3>${producto.nombre}</h3>

        <p>${producto.marca}</p>

        <p>${producto.presentacion}</p>
        <p><strong>Disponibles:</strong> ${disponibles} canastas</p>

        <strong class="producto-precio">
          ${dinero(producto.precio)}
        </strong>

        <button class="btn" type="button"
          data-agregar="${producto.id}" ${disponibles <= 0 ? "disabled" : ""}>
          ${disponibles <= 0 ? "Agotado" : "Agregar al carrito"}
        </button>
      </div>
    `;

    contenedor.appendChild(article);
  });

  contenedor.querySelectorAll("[data-agregar]").forEach(boton => {
    boton.addEventListener("click", () => {
      agregarAlCarrito(Number(boton.dataset.agregar));
    });
  });
}

/* Agregar producto */

function agregarAlCarrito(id) {
  const producto = PRODUCTOS.find(
    elemento => elemento.id === id
  );

  if (!producto) return;

  carrito[id] = (carrito[id] || 0) + 1;

  guardarCarrito();
  renderCarrito();
}

/* Cambiar cantidad */

function cambiarCantidad(id, cambio) {
  if (!carrito[id]) return;

  carrito[id] += cambio;

  if (carrito[id] <= 0) {
    delete carrito[id];
  }

  guardarCarrito();
  renderCarrito();
}

/* Mostrar carrito */

function renderCarrito() {
  const contenedor = $("#carritoProductos");

  contenedor.innerHTML = "";

  const ids = Object.keys(carrito);

  if (!ids.length) {
    contenedor.innerHTML =
      '<p class="carrito-vacio">Tu carrito está vacío.</p>';
  }

  let subtotal = 0;

  ids.forEach(id => {
    const producto = PRODUCTOS.find(
      elemento => elemento.id === Number(id)
    );

    if (!producto) return;

    const cantidad = carrito[id];
    const totalProducto = producto.precio * cantidad;

    subtotal += totalProducto;

    const item = document.createElement("div");

    item.className = "carrito-item";

    item.innerHTML = `
      <div>
        <strong>${producto.nombre}</strong>

        <small>
          ${dinero(producto.precio)} por canasta
        </small>

        <div class="cantidad-controles">
          <button type="button" data-menos="${id}">−</button>

          <span>${cantidad}</span>

          <button type="button" data-mas="${id}">+</button>
        </div>
      </div>

      <strong>${dinero(totalProducto)}</strong>
    `;

    contenedor.appendChild(item);
  });

  contenedor.querySelectorAll("[data-menos]").forEach(boton => {
    boton.addEventListener("click", () => {
      cambiarCantidad(Number(boton.dataset.menos), -1);
    });
  });

  contenedor.querySelectorAll("[data-mas]").forEach(boton => {
    boton.addEventListener("click", () => {
      cambiarCantidad(Number(boton.dataset.mas), 1);
    });
  });

  const domicilio = subtotal > 0 ? DOMICILIO : 0;
  const total = subtotal + domicilio;

  $("#carritoSubtotal").textContent = dinero(subtotal);
  $("#carritoDomicilio").textContent = dinero(domicilio);
  $("#carritoTotal").textContent = dinero(total);

  $("#btnConfirmarPedido").disabled = subtotal === 0;
}

/* Confirmar pedido */

function confirmarPedido() {
  const ids = Object.keys(carrito);

  if (!ids.length) {
    $("#mensajeCarrito").textContent =
      "Agrega productos antes de continuar.";

    return;
  }

  const subtotal = ids.reduce((suma, id) => {
    const producto = PRODUCTOS.find(
      elemento => elemento.id === Number(id)
    );

    return suma + (
      producto ? producto.precio * carrito[id] : 0
    );
  }, 0);

  const stockActual = obtenerStock();
  const sinStock = ids.find(id => Number(stockActual[id] || 0) < Number(carrito[id]));
  if (sinStock) {
    const productoSinStock = PRODUCTOS.find(p => p.id === Number(sinStock));
    alert("No hay suficientes existencias de " + (productoSinStock?.nombre || "ese producto") + ". Actualiza tu carrito.");
    return;
  }

  const pedido = {
    id: "PED-" + Date.now(),

    cliente: clienteActual.cedula,

    nombre: clienteActual.nombre,
    telefono: clienteActual.telefono || "",

    productos: ids.map(id => {
      const producto = PRODUCTOS.find(
        elemento => elemento.id === Number(id)
      );

      return {
        id: producto.id,
        nombre: producto.nombre,
        cantidad: carrito[id],
        precio: producto.precio
      };
    }),

    subtotal,

    domicilio: DOMICILIO,

    total: subtotal + DOMICILIO,

    estado: "Pendiente",

    fecha: horaActual(),
    hora: new Date().toLocaleTimeString("es-CO")
  };

  ids.forEach(id => { stockActual[id] = Number(stockActual[id] || 0) - Number(carrito[id]); });
  guardarStock(stockActual);

  const pedidos = JSON.parse(
    localStorage.getItem(KEY_PEDIDOS)
  ) || [];

  pedidos.push(pedido);

  localStorage.setItem(
    KEY_PEDIDOS,
    JSON.stringify(pedidos)
  );

  carrito = {};

  guardarCarrito();

  renderCarrito();
  renderPedidos();
  renderCatalogo();
  renderChatCliente();

  $("#mensajeCarrito").textContent =
    "¡Pedido de demostración creado correctamente!";

  alert("¡Pedido creado! Número: " + pedido.id);
}

/* Mostrar historial de pedidos */

function renderPedidos() {
  const contenedor = $("#listaPedidos");

  const pedidos = obtenerPedidos();

  contenedor.innerHTML = "";

  if (!pedidos.length) {
    contenedor.innerHTML =
      '<p class="carrito-vacio">Todavía no tienes pedidos.</p>';

    return;
  }

  pedidos.slice().reverse().forEach(pedido => {
    const item = document.createElement("div");

    item.className = "pedido-item";

    const detalle = pedido.productos
      .map(producto =>
        `${producto.nombre} x ${producto.cantidad}`
      )
      .join(", ");

    item.innerHTML = `
      <div>
        <strong>${pedido.id}</strong>

        <small>${pedido.fecha}</small>

        <small>${detalle}</small>
      </div>

      <div>
        <strong>${dinero(pedido.total)}</strong>

        <div class="pedido-estado">
          ${pedido.estado}
        </div>
      </div>
    `;

    contenedor.appendChild(item);
  });
}

/* Botones del cliente */

$("#btnConfirmarPedido").addEventListener(
  "click",
  confirmarPedido
);

$("#btnSalirCliente").addEventListener(
  "click",
  salir
);

/* =========================================
   PANEL DEL ADMINISTRADOR
========================================= */

function openAdmin() {
  $("#cardMain").style.display = "none";
  $("#cardCliente").style.display = "none";
  $("#cardVendedor").style.display = "none";
  $("#cardRepartidor").style.display = "none";
  $("#cardAdmin").style.display = "block";

  renderTabla();
  renderInventarioAdmin();
  renderStockAdmin();
  renderAbastecimientosAdmin();
  renderPedidosAdmin();
  renderContactosAdmin();
  actualizarResumenAdmin();
  mostrarSeccionAdmin("resumen");
}

/* Menú de navegación del administrador */
function mostrarSeccionAdmin(seccion) {
  document.querySelectorAll(".admin-page").forEach(pagina => {
    const activa = pagina.id === "adminPage-" + seccion;
    pagina.hidden = !activa;
    pagina.classList.toggle("active", activa);
  });
  document.querySelectorAll(".admin-nav-btn").forEach(boton => {
    boton.classList.toggle("active", boton.dataset.adminSection === seccion);
  });
}

document.querySelectorAll("[data-admin-section]").forEach(boton => {
  boton.addEventListener("click", () => mostrarSeccionAdmin(boton.dataset.adminSection));
});

function actualizarResumenAdmin() {
  const pendientes = getUsers().filter(u => u.estado === "pendiente").length;
  const pedidosEnCurso = obtenerTodosLosPedidos().filter(p => ["Pendiente", "Listo para entrega", "En camino"].includes(p.estado)).length;
  const stock = obtenerStock();
  const totalStock = Object.values(stock).reduce((s, n) => s + (Number(n) || 0), 0);
  const abastecimientos = obtenerAbastecimientos().filter(a => a.estado === "En curso").length;
  if ($("#resumenSolicitudes")) $("#resumenSolicitudes").textContent = pendientes;
  if ($("#resumenPedidos")) $("#resumenPedidos").textContent = pedidosEnCurso;
  if ($("#resumenStock")) $("#resumenStock").textContent = totalStock;
  if ($("#resumenAbastecimiento")) $("#resumenAbastecimiento").textContent = abastecimientos;
  if ($("#menuSolicitudesCount")) $("#menuSolicitudesCount").textContent = pendientes;
}

/* Mostrar usuarios */

function renderTabla() {
  const usuarios = getUsers().filter(
    usuario =>
      filtro === "todas" || usuario.estado === filtro
  );

  const tabla = $("#tbody");

  tabla.innerHTML = "";

  if (!usuarios.length) {
    tabla.innerHTML = `
      <tr>
        <td colspan="6"
          style="text-align:center;color:#888;padding:20px">
          No hay registros.
        </td>
      </tr>
    `;

    return;
  }

  usuarios.forEach(usuario => {
    const fila = document.createElement("tr");

    const datos = [
      usuario.nombre,
      usuario.cedula,
      usuario.telefono,
      usuario.rol
    ];

    datos.forEach(dato => {
      const celda = document.createElement("td");

      celda.textContent = dato;

      fila.appendChild(celda);
    });

    const celdaEstado = document.createElement("td");

    celdaEstado.innerHTML =
      '<span class="badge b-' +
      usuario.estado +
      '">' +
      usuario.estado +
      "</span>";

    fila.appendChild(celdaEstado);

    const celdaAcciones = document.createElement("td");

    celdaAcciones.className = "acts";

    if (usuario.estado !== "aprobada") {
      celdaAcciones.appendChild(
        btn("Aprobar", "a-ok", () =>
          cambiar(usuario.cedula, "aprobada")
        )
      );
    }

    if (usuario.estado !== "rechazada") {
      celdaAcciones.appendChild(
        btn("Rechazar", "a-no", () =>
          cambiar(usuario.cedula, "rechazada")
        )
      );
    }

    celdaAcciones.appendChild(
      btn("Eliminar", "a-del", () =>
        eliminar(usuario.cedula)
      )
    );

    fila.appendChild(celdaAcciones);

    tabla.appendChild(fila);
  });
}

/* Crear botones de administración */

function btn(texto, clase, funcion) {
  const boton = document.createElement("button");

  boton.textContent = texto;
  boton.className = clase;
  boton.type = "button";
  boton.onclick = funcion;

  return boton;
}

/* Aprobar o rechazar usuarios */

function cambiar(cedula, estado) {
  const usuarios = getUsers();

  const usuario = usuarios.find(
    elemento => elemento.cedula === cedula
  );

  if (!usuario) return;

  usuario.estado = estado;

  setUsers(usuarios);

  renderTabla();
  actualizarResumenAdmin();

  note(
    "#msgAdmin",
    "Cuenta de " + usuario.nombre + " marcada como " + estado + ".",
    "ok"
  );
}

/* Eliminar usuarios */

function eliminar(cedula) {
  if (!confirm("¿Eliminar esta cuenta definitivamente?")) {
    return;
  }

  setUsers(
    getUsers().filter(usuario => usuario.cedula !== cedula)
  );

  renderTabla();
  actualizarResumenAdmin();

  note(
    "#msgAdmin",
    "La cuenta fue eliminada.",
    "ok"
  );
}

/* Filtros del administrador */

$("#tabs").addEventListener("click", evento => {
  if (evento.target.tagName !== "BUTTON") return;

  filtro = evento.target.dataset.f;

  document.querySelectorAll("#tabs button").forEach(boton => {
    boton.classList.toggle("on", boton === evento.target);
  });

  renderTabla();
});

/* =========================================
   PANEL DEL REPARTIDOR
========================================= */

let repartidorActual = null;

function openRepartidor(usuario) {
  repartidorActual = usuario;

  $("#cardMain").style.display = "none";
  $("#cardAdmin").style.display = "none";
  $("#cardCliente").style.display = "none";
  $("#cardVendedor").style.display = "none";
  $("#cardRepartidor").style.display = "block";

  $("#repartidorSaludo").textContent = "¡Hola, " + usuario.nombre + "!";
  renderPedidosRepartidor();
  renderContactosAdmin();
  renderChatsRepartidor();
  mostrarSeccionRepartidor("resumen");
}

/*
  Los pedidos nuevos del cliente tienen estado "Pendiente".
  También aceptamos "Listo para entrega" por compatibilidad
  con el flujo anterior del vendedor.
*/
function renderPedidosRepartidor() {
  const pedidos = obtenerTodosLosPedidos();

  const pendientes = pedidos.filter(pedido =>
    pedido.estado === "Pendiente" ||
    pedido.estado === "Listo para entrega"
  );

  const enCamino = pedidos.filter(pedido =>
    pedido.estado === "En camino" &&
    (!pedido.repartidorCedula ||
      pedido.repartidorCedula === repartidorActual?.cedula)
  );

  const entregados = pedidos.filter(pedido =>
    pedido.estado === "Entregado" &&
    (!pedido.repartidorCedula ||
      pedido.repartidorCedula === repartidorActual?.cedula)
  );

  $("#contadorPendientes").textContent = pendientes.length;
  $("#contadorCamino").textContent = enCamino.length;
  $("#contadorEntregados").textContent = entregados.length;

  const contenedorPendientes = $("#pedidosRepartidor");
  const contenedorCamino = $("#pedidosEnCamino");
  const contenedorEntregados = $("#entregasRealizadas");

  contenedorPendientes.innerHTML = "";
  contenedorCamino.innerHTML = "";
  contenedorEntregados.innerHTML = "";

  if (!pendientes.length) {
    contenedorPendientes.innerHTML =
      '<p class="carrito-vacio">No hay pedidos pendientes por aceptar.</p>';
  } else {
    pendientes.slice().reverse().forEach(pedido => {
      contenedorPendientes.appendChild(crearTarjetaRepartidor(pedido, "pendiente"));
    });
  }

  if (!enCamino.length) {
    contenedorCamino.innerHTML =
      '<p class="carrito-vacio">No tienes pedidos en camino.</p>';
  } else {
    enCamino.slice().reverse().forEach(pedido => {
      contenedorCamino.appendChild(crearTarjetaRepartidor(pedido, "camino"));
    });
  }

  if (!entregados.length) {
    contenedorEntregados.innerHTML =
      '<p class="carrito-vacio">Todavía no tienes entregas registradas.</p>';
  } else {
    entregados.slice().reverse().forEach(pedido => {
      contenedorEntregados.appendChild(crearTarjetaRepartidor(pedido, "entregado"));
    });
  }
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caracter]);
}

function crearTarjetaRepartidor(pedido, tipo) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "pedido-repartidor";

  const productos = (pedido.productos || [])
    .map(producto =>
      `<li>${escaparHTML(producto.nombre)} × ${Number(producto.cantidad) || 0}</li>`
    )
    .join("");

  let boton = "";
  if (tipo === "pendiente") {
    boton = `
      <button class="btn" type="button" data-aceptar="${escaparHTML(pedido.id)}">
        Aceptar pedido
      </button>`;
  } else if (tipo === "camino") {
    boton = `
      <button class="btn" type="button" data-entregar="${escaparHTML(pedido.id)}">
        Confirmar entrega
      </button>`;
  }

  const estadoTexto = tipo === "pendiente"
    ? "Pendiente de aceptación"
    : tipo === "camino"
      ? "En camino"
      : "Entregado";

  tarjeta.innerHTML = `
    <div class="pedido-repartidor-info">
      <div class="pedido-repartidor-titulo">
        <h3>${escaparHTML(pedido.id)}</h3>
        <span class="estado-repartidor estado-${tipo}">${estadoTexto}</span>
      </div>
      <p><strong>Cliente:</strong> ${escaparHTML(pedido.nombre || "Sin nombre")}</p>
      ${pedido.telefono
        ? `<p><strong>Teléfono:</strong> ${escaparHTML(pedido.telefono)}</p>`
        : ""}
      <p><strong>Fecha del pedido:</strong> ${escaparHTML(pedido.fecha || "No registrada")}</p>
      <p><strong>Productos:</strong></p>
      <ul>${productos || "<li>Sin detalle de productos</li>"}</ul>
      <p><strong>Total:</strong> ${dinero(Number(pedido.total) || 0)}</p>
      ${pedido.fechaAceptado && tipo !== "pendiente"
        ? `<p><strong>Aceptado:</strong> ${escaparHTML(pedido.fechaAceptado)}</p>`
        : ""}
      ${tipo === "entregado"
        ? `<p><strong>Fecha de entrega:</strong> ${escaparHTML(pedido.fechaEntrega || "Registrada")}</p>`
        : ""}
    </div>
    ${boton ? `<div class="pedido-repartidor-acciones">${boton}</div>` : ""}
  `;

  const botonAceptar = tarjeta.querySelector("[data-aceptar]");
  if (botonAceptar) {
    botonAceptar.addEventListener("click", () => aceptarPedidoRepartidor(pedido.id));
  }

  const botonEntregar = tarjeta.querySelector("[data-entregar]");
  if (botonEntregar) {
    botonEntregar.addEventListener("click", () => marcarPedidoEntregado(pedido.id));
  }

  return tarjeta;
}

function aceptarPedidoRepartidor(idPedido) {
  const pedidos = obtenerTodosLosPedidos();
  const pedido = pedidos.find(elemento => String(elemento.id) === String(idPedido));

  if (!pedido || !["Pendiente", "Listo para entrega"].includes(pedido.estado)) {
    note("#msgRepartidor", "Este pedido ya no está disponible para aceptar.", "warn");
    renderPedidosRepartidor();
    return;
  }

  const confirmar = confirm("¿Deseas aceptar el pedido " + idPedido + "?");
  if (!confirmar) return;

  pedido.estado = "En camino";
  pedido.fechaAceptado = new Date().toLocaleString("es-CO");
  pedido.repartidor = repartidorActual.nombre;
  pedido.repartidorCedula = repartidorActual.cedula;

  guardarTodosLosPedidos(pedidos);
  renderPedidosRepartidor();
  renderChatsRepartidor();
  renderPedidosAdmin();
  renderChatCliente();
  renderContactosAdmin();

  note("#msgRepartidor", "Pedido aceptado. Ahora aparece en «Pedidos en camino».", "ok");
}

function marcarPedidoEntregado(idPedido) {
  const pedidos = obtenerTodosLosPedidos();
  const pedido = pedidos.find(elemento => String(elemento.id) === String(idPedido));

  if (
    !pedido ||
    pedido.estado !== "En camino" ||
    (pedido.repartidorCedula &&
      pedido.repartidorCedula !== repartidorActual.cedula)
  ) {
    note("#msgRepartidor", "No se pudo registrar esta entrega.", "warn");
    renderPedidosRepartidor();
    return;
  }

  const confirmar = confirm(
    "¿Confirmas que el pedido " + idPedido + " fue entregado al cliente?"
  );
  if (!confirmar) return;

  pedido.estado = "Entregado";
  pedido.fechaEntrega = new Date().toLocaleString("es-CO");

  guardarTodosLosPedidos(pedidos);
  renderPedidosRepartidor();
  renderChatsRepartidor();
  renderPedidosAdmin();
  renderChatCliente();

  note("#msgRepartidor", "¡Entrega registrada correctamente!", "ok");
}

$("#btnSalirRepartidor").addEventListener("click", salir);

/* =========================================
   INVENTARIO, ABASTECIMIENTO Y SEGUIMIENTO ADMIN
========================================= */
function renderInventarioAdmin() {
  const cont = $("#adminInventario"); if (!cont) return;
  const stock = obtenerStock(); cont.innerHTML = "";
  PRODUCTOS.forEach(p => {
    const cantidad = Math.max(0, Number(stock[p.id]) || 0);
    const card = document.createElement("article"); card.className = "stock-admin-card";
    card.innerHTML = `<h3>${p.emoji} ${escaparHTML(p.nombre)}</h3><p>${escaparHTML(p.presentacion)}</p><div class="stock-porcentaje-linea"><strong class="stock-numero">${cantidad} canastas disponibles</strong></div><div class="stock-ajuste"><button type="button" data-stock-menos="${p.id}" aria-label="Disminuir inventario de ${escaparHTML(p.nombre)}">−</button><button type="button" data-stock-mas="${p.id}" aria-label="Aumentar inventario de ${escaparHTML(p.nombre)}">+</button></div>`;
    cont.appendChild(card);
  });
  cont.querySelectorAll("[data-stock-mas]").forEach(b => b.onclick = () => ajustarStock(Number(b.dataset.stockMas), 1));
  cont.querySelectorAll("[data-stock-menos]").forEach(b => b.onclick = () => ajustarStock(Number(b.dataset.stockMenos), -1));
}
function renderStockAdmin() {
  const cont = $("#adminStock"); if (!cont) return;
  const stock = obtenerStock(); cont.innerHTML = "";
  PRODUCTOS.forEach(p => {
    const cantidad = Math.max(0, Number(stock[p.id]) || 0);
    const capacidad = Math.max(1, Number(STOCK_CAPACIDAD[p.id]) || 30);
    const porcentaje = Math.min(100, Math.round((cantidad / capacidad) * 100));
    const nivel = porcentaje <= 25 ? "critico" : porcentaje <= 50 ? "medio" : "alto";
    const estado = porcentaje <= 25 ? "Stock crítico" : porcentaje <= 50 ? "Stock moderado" : "Stock suficiente";
    const card = document.createElement("article"); card.className = "stock-admin-card";
    card.innerHTML = `<h3>${p.emoji} ${escaparHTML(p.nombre)}</h3><p>${escaparHTML(p.presentacion)}</p><div class="stock-porcentaje-linea"><strong class="stock-numero">${cantidad} canastas</strong><strong class="stock-porcentaje">${porcentaje}%</strong></div><div class="stock-barra" role="progressbar" aria-label="Stock de ${escaparHTML(p.nombre)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${porcentaje}"><span class="stock-barra-relleno ${nivel}" style="width:${porcentaje}%"></span></div><div class="stock-detalle"><span>Capacidad: ${capacidad} canastas</span><span class="stock-alerta ${nivel === "critico" ? "bajo" : nivel === "medio" ? "medio" : ""}">${estado}</span></div>`;
    cont.appendChild(card);
  });
}
function ajustarStock(id, delta) {
  const stock = obtenerStock(); stock[id] = Math.max(0, Number(stock[id] || 0) + delta); guardarStock(stock);
  renderInventarioAdmin(); renderStockAdmin(); renderCatalogo();
}
function renderAbastecimientosAdmin() {
  const select = $("#abProducto"), cont = $("#listaAbastecimiento"); if (!select || !cont) return;
  select.innerHTML = PRODUCTOS.map(p => `<option value="${p.id}">${escaparHTML(p.nombre)}</option>`).join("");
  const lista = obtenerAbastecimientos().slice().reverse(); cont.innerHTML = lista.length ? "" : '<p class="carrito-vacio">Todavía no hay pedidos de abastecimiento.</p>';
  lista.forEach(item => { const div = document.createElement("article"); div.className = "registro-abastecimiento"; div.innerHTML = `<strong>${escaparHTML(item.id)}</strong><p>${escaparHTML(item.producto)} · ${item.cantidad} canastas</p><p>Proveedor: ${escaparHTML(item.proveedor)} · ${escaparHTML(item.fecha)}</p><span>${escaparHTML(item.estado)}</span>${item.estado === "En curso" ? `<button class="btn" type="button" data-recibir="${escaparHTML(item.id)}">Marcar recibido</button>` : ""}`; cont.appendChild(div); });
  cont.querySelectorAll("[data-recibir]").forEach(b => b.onclick = () => recibirAbastecimiento(b.dataset.recibir));
}
$("#formAbastecimiento")?.addEventListener("submit", e => {
  e.preventDefault(); const producto = PRODUCTOS.find(p => p.id === Number($("#abProducto").value)); const cantidad = Number($("#abCantidad").value); const proveedor = $("#abProveedor").value.trim();
  if (!producto || cantidad < 1 || !proveedor) return;
  const lista = obtenerAbastecimientos(); lista.push({ id: "INV-" + Date.now(), productoId: producto.id, producto: producto.nombre, cantidad, proveedor, fecha: horaActual(), estado: "En curso" });
  localStorage.setItem(KEY_ABASTECIMIENTO, JSON.stringify(lista)); e.target.reset(); renderAbastecimientosAdmin();
  actualizarResumenAdmin();
  note("#msgAbastecimiento", "Pedido de abastecimiento registrado. El stock aumentará cuando marques que fue recibido.", "ok");
});
function recibirAbastecimiento(id) {
  const lista = obtenerAbastecimientos(); const item = lista.find(x => x.id === id); if (!item || item.estado === "Recibido") return;
  item.estado = "Recibido"; item.fechaRecepcion = horaActual(); const stock = obtenerStock(); stock[item.productoId] = Number(stock[item.productoId] || 0) + Number(item.cantidad); guardarStock(stock); localStorage.setItem(KEY_ABASTECIMIENTO, JSON.stringify(lista));
  renderInventarioAdmin(); renderStockAdmin(); renderAbastecimientosAdmin(); renderCatalogo(); actualizarResumenAdmin(); note("#msgAbastecimiento", "Abastecimiento recibido y stock actualizado.", "ok");
}
function renderPedidosAdmin() {
  const cont = $("#adminPedidos"); if (!cont) return; const pedidos = obtenerTodosLosPedidos().slice().reverse(); cont.innerHTML = "";
  if (!pedidos.length) { cont.innerHTML = '<p class="carrito-vacio">Aún no hay pedidos de clientes.</p>'; return; }
  pedidos.forEach(p => { const div = document.createElement("article"); div.className = "admin-pedido-card"; const detalle = (p.productos || []).map(x => `${escaparHTML(x.nombre)} × ${Number(x.cantidad) || 0}`).join(", "); div.innerHTML = `<div class="admin-pedido-cabecera"><strong>${escaparHTML(p.id)}</strong><span class="badge">${escaparHTML(p.estado)}</span></div><p><strong>Cliente:</strong> ${escaparHTML(p.nombre || "Sin nombre")} · CC ${escaparHTML(p.cliente || "-")}</p><p><strong>Teléfono:</strong> ${escaparHTML(p.telefono || "No registrado")}</p><p><strong>Fecha y hora:</strong> ${escaparHTML(p.fecha || "-")} ${escaparHTML(p.hora || "")}</p><p><strong>Productos:</strong> ${detalle || "Sin detalle"}</p><p><strong>Total:</strong> ${dinero(Number(p.total) || 0)}</p><p><strong>Repartidor:</strong> ${escaparHTML(p.repartidor || "Aún sin asignar")}</p>`; cont.appendChild(div); });
  actualizarResumenAdmin();
}

/* =========================================
   CHAT LOCAL ENTRE CLIENTE, ADMIN Y REPARTIDOR
========================================= */
function obtenerMensajes(pedidoId) { const chats = obtenerChats(); return chats[claveChat(pedidoId)] || []; }
function agregarMensaje(pedidoId, emisor, nombre, texto) { const chats = obtenerChats(); const key = claveChat(pedidoId); chats[key] = chats[key] || []; chats[key].push({ emisor, nombre, texto, fecha: horaActual() }); guardarChats(chats); }
function pintarMensajes(pedidoId, contenedor, emisorPropio) {
  if (!contenedor) return; const mensajes = obtenerMensajes(pedidoId); contenedor.innerHTML = mensajes.length ? "" : '<p class="carrito-vacio">No hay mensajes todavía.</p>';
  mensajes.forEach(m => { const div = document.createElement("div"); div.className = "chat-burbuja " + (m.emisor === emisorPropio ? "propia" : "ajena"); div.innerHTML = `<strong>${escaparHTML(m.nombre)}</strong><p>${escaparHTML(m.texto)}</p><small>${escaparHTML(m.fecha)}</small>`; contenedor.appendChild(div); }); contenedor.scrollTop = contenedor.scrollHeight;
}
function renderContactosAdmin() {
  const cont = $("#listaChatsAdmin"); if (!cont) return;
  const repartidores = getUsers().filter(u => u.rol === "repartidor" && u.estado === "aprobada");
  cont.innerHTML = repartidores.length ? "" : '<p class="carrito-vacio">Todavía no hay repartidores aprobados.</p>';
  repartidores.forEach(r => {
    const b = document.createElement("button"); b.type = "button"; b.className = "chat-contacto"; b.textContent = r.nombre + " · " + r.cedula;
    b.onclick = () => { repartidorChatSeleccionado = r; const key = "ADMIN-" + r.cedula; $("#chatAdminTitulo").textContent = "Chat con " + r.nombre; pintarMensajes(key, $("#chatAdminMensajes"), "admin"); $("#formChatAdmin").dataset.pedido = key; };
    cont.appendChild(b);
  });
}
$("#formChatAdmin")?.addEventListener("submit", e => { e.preventDefault(); const pedido = e.currentTarget.dataset.pedido; const texto = $("#textoChatAdmin").value.trim(); if (!pedido || !texto) return; agregarMensaje(pedido, "admin", "Administrador", texto); $("#textoChatAdmin").value = ""; pintarMensajes(pedido, $("#chatAdminMensajes"), "admin"); });
function renderChatsRepartidor() {
  const cont = $("#listaChatsRepartidor"); if (!cont || !repartidorActual) return;
  const pedidos = obtenerTodosLosPedidos().filter(p => p.repartidorCedula === repartidorActual.cedula && ["En camino", "Entregado"].includes(p.estado));
  cont.innerHTML = "";
  const admin = document.createElement("button"); admin.type = "button"; admin.className = "chat-contacto"; admin.textContent = "Administrador";
  admin.onclick = () => { const key = "ADMIN-" + repartidorActual.cedula; $("#chatRepartidorTitulo").textContent = "Chat con el administrador"; pintarMensajes(key, $("#chatRepartidorMensajes"), "repartidor"); $("#formChatRepartidor").dataset.pedido = key; };
  cont.appendChild(admin);
  pedidos.forEach(p => { const b = document.createElement("button"); b.type = "button"; b.className = "chat-contacto"; b.textContent = (p.nombre || "Cliente") + " · " + p.id; b.onclick = () => { $("#chatRepartidorTitulo").textContent = "Chat del pedido " + p.id + " · " + (p.nombre || "Cliente"); pintarMensajes(p.id, $("#chatRepartidorMensajes"), "repartidor"); $("#formChatRepartidor").dataset.pedido = p.id; }; cont.appendChild(b); });
  if (!pedidos.length) { const ayuda = document.createElement("p"); ayuda.className = "carrito-vacio"; ayuda.textContent = "Acepta un pedido para habilitar el chat con el cliente."; cont.appendChild(ayuda); }
}
$("#formChatRepartidor")?.addEventListener("submit", e => { e.preventDefault(); const pedidoId = e.currentTarget.dataset.pedido; const texto = $("#textoChatRepartidor").value.trim(); if (!pedidoId || !texto) return; agregarMensaje(pedidoId, "repartidor", repartidorActual?.nombre || "Repartidor", texto); $("#textoChatRepartidor").value = ""; pintarMensajes(pedidoId, $("#chatRepartidorMensajes"), "repartidor"); });

function renderChatCliente() {
  const cont = $("#listaPedidosChat"); if (!cont || !clienteActual) return; const pedidos = obtenerPedidos().filter(p => p.repartidorCedula && ["En camino", "Entregado"].includes(p.estado)); cont.innerHTML = pedidos.length ? "" : '<p class="carrito-vacio">No tienes pedidos asignados a un repartidor todavía.</p>';
  pedidos.forEach(p => { const b = document.createElement("button"); b.type = "button"; b.className = "chat-contacto"; b.textContent = p.id + " · " + (p.repartidor || "Repartidor"); b.onclick = () => { pedidoChatClienteSeleccionado = p.id; $("#chatClienteTitulo").textContent = "Chat con " + (p.repartidor || "tu repartidor") + " · " + p.id; pintarMensajes(p.id, $("#chatClienteMensajes"), "cliente"); $("#formChatCliente").dataset.pedido = p.id; }; cont.appendChild(b); });
}
$("#formChatCliente")?.addEventListener("submit", e => { e.preventDefault(); const pedido = e.currentTarget.dataset.pedido; const texto = $("#textoChatCliente").value.trim(); if (!pedido || !texto) return; agregarMensaje(pedido, "cliente", clienteActual?.nombre || "Cliente", texto); $("#textoChatCliente").value = ""; pintarMensajes(pedido, $("#chatClienteMensajes"), "cliente"); });

/* Menús de navegación para cliente y repartidor */
function mostrarSeccionCliente(seccion) {
  document.querySelectorAll("#cardCliente .role-page").forEach(pagina => {
    const activa = pagina.id === "clientePage-" + seccion;
    pagina.hidden = !activa;
    pagina.classList.toggle("active", activa);
  });
  document.querySelectorAll("#cardCliente [data-cliente-section]").forEach(boton => {
    boton.classList.toggle("active", boton.dataset.clienteSection === seccion);
  });
}
function mostrarSeccionRepartidor(seccion) {
  document.querySelectorAll("#cardRepartidor .role-page").forEach(pagina => {
    const activa = pagina.id === "repartidorPage-" + seccion;
    pagina.hidden = !activa;
    pagina.classList.toggle("active", activa);
  });
  document.querySelectorAll("#cardRepartidor [data-repartidor-section]").forEach(boton => {
    boton.classList.toggle("active", boton.dataset.repartidorSection === seccion);
  });
}
document.querySelectorAll("#cardCliente [data-cliente-section]").forEach(boton => {
  boton.addEventListener("click", () => mostrarSeccionCliente(boton.dataset.clienteSection));
});
document.querySelectorAll("#cardRepartidor [data-repartidor-section]").forEach(boton => {
  boton.addEventListener("click", () => mostrarSeccionRepartidor(boton.dataset.repartidorSection));
});

/* =========================================
   CERRAR SESIÓN
========================================= */

function salir() {

  sessionStorage.removeItem("sesion");

  $("#cardAdmin").style.display = "none";
  $("#cardCliente").style.display = "none";
  $("#cardVendedor").style.display = "none";
  $("#cardRepartidor").style.display = "none";
  $("#cardMain").style.display = "block";

  clienteActual = null;
  vendedorActual = null;
  repartidorActual = null;
  carrito = {};

  $("#formLogin").reset();

  show("vLogin");
}

/* Botones de cerrar sesión */

$("#btnSalir1").addEventListener("click", salir);
$("#btnSalir2").addEventListener("click", salir);

/* Actualización entre pestañas del mismo navegador (prototipo local) */
window.addEventListener("storage", evento => {
  if ([KEY_PEDIDOS, KEY_STOCK, KEY_ABASTECIMIENTO, KEY_CHATS, KEY].includes(evento.key)) {
    if (clienteActual) { renderCatalogo(); renderPedidos(); renderChatCliente(); }
    if (repartidorActual) { renderPedidosRepartidor(); renderChatsRepartidor(); }
    if (sessionStorage.getItem("sesion") === "admin") {
      renderInventarioAdmin(); renderStockAdmin(); renderAbastecimientosAdmin(); renderPedidosAdmin(); renderContactosAdmin(); actualizarResumenAdmin();
    }
  }
});

/* =========================================
   RESTAURAR SESIÓN AL RECARGAR
========================================= */

(function restaurarSesion() {
  const sesion = sessionStorage.getItem("sesion");

  if (sesion === "admin") {
    openAdmin();
    return;
  }

  if (sesion) {
    const usuario = getUsers().find(
      elemento =>
        elemento.cedula === sesion &&
        elemento.estado === "aprobada"
    );

    if (usuario) {
      openWelcome(usuario);
    } else {
      sessionStorage.removeItem("sesion");
    }
  }
})();

