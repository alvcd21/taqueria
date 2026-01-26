import express from 'express';
import pg from 'pg';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Necesario para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// --- CONFIGURACIÓN DE LA BASE DE DATOS (RENDER) ---
const pool = new Pool({
  host: "dpg-d4hacb9r0fns73a46ugg-a.virginia-postgres.render.com",
  port: 5432,
  database: "taqueria_don_juan",
  user: "alvcd21",
  password: "v5kMB2R44Xh6P8d109bczIQ7sKbcYphz",
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err, client) => {
  console.error('❌ Error inesperado en el cliente de PostgreSQL:', err);
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// --- SERVIR FRONTEND REACT (Para Producción) ---
app.use(express.static(path.join(__dirname, 'dist')));

// --- VERIFICACIÓN DE CONEXIÓN AL INICIAR ---
async function testDbConnection() {
  try {
    console.log('⏳ Intentando conectar a PostgreSQL en Render...');
    const client = await pool.connect();
    console.log('✅ CONEXIÓN EXITOSA A LA BASE DE DATOS EN RENDER');
    client.release();
  } catch (err) {
    console.error('❌ ERROR FATAL: No se pudo conectar a la Base de Datos.');
    console.error('Detalle:', err.message);
  }
}

testDbConnection();

// --- API ENDPOINTS ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', db: 'connected' });
});

/**
 * 🔹 OBTENER INFO DE LA EMPRESA
 *  - Mapea motivo_no_disponible -> motivoNoDisponible para que el frontend lo entienda
 */
app.get('/api/empresa', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre,
        correo,
        telefono,
        direccion,
        horario,
        info_general,
        disponible,
        motivo_no_disponible AS "motivoNoDisponible"
      FROM empresa
      ORDER BY id
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // fallback si aún no hay registro
      res.json({
        id: 1,
        nombre: 'Taquería Don Juan',
        correo: null,
        telefono: null,
        direccion: null,
        horario: null,
        info_general: null,
        disponible: true,
        motivoNoDisponible: null
      });
    }
  } catch (err) {
    console.error("Error en /api/empresa:", err.message);
    res.status(500).json({ error: 'Error obteniendo información de empresa' });
  }
});

/**
 * 🔹 ACTUALIZAR DISPONIBILIDAD
 *  - Body esperado: { disponible: boolean, motivoNoDisponible?: string | null }
 *  - Actualiza la columna motivo_no_disponible
 *  - Devuelve los campos ya mapeados al formato del frontend
 */
app.post('/api/empresa/disponibilidad', async (req, res) => {
  try {
    const body = req.body || {};
    const { disponible, motivoNoDisponible } = body;

    if (typeof disponible !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'El campo "disponible" es obligatorio y debe ser booleano.' });
    }

    const result = await pool.query(
      `
      UPDATE empresa
      SET disponible = $1,
          motivo_no_disponible = $2
      WHERE id = (SELECT id FROM empresa ORDER BY id LIMIT 1)
      RETURNING
        id,
        nombre,
        correo,
        telefono,
        direccion,
        horario,
        info_general,
        disponible,
        motivo_no_disponible AS "motivoNoDisponible"
      `,
      [disponible, motivoNoDisponible ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de empresa no encontrado' });
    }

    const updatedEmpresa = result.rows[0];

    // Notificar a todos los clientes conectados
    broadcast({ type: 'EMPRESA_UPDATE', data: updatedEmpresa });

    res.json(updatedEmpresa);
  } catch (err) {
    console.error("Error actualizando disponibilidad:", err.message);
    res.status(500).json({ error: 'Error actualizando disponibilidad' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const pedidosResult = await pool.query('SELECT * FROM pedidos ORDER BY fecha_hora DESC LIMIT 50');
    const pedidos = pedidosResult.rows;

    for (let pedido of pedidos) {
      const itemsResult = await pool.query(`
        SELECT pi.*, mi.nombre as nombre_producto, mi.categoria 
        FROM pedido_items pi 
        LEFT JOIN menu_items mi ON pi.menu_item_id = mi.id 
        WHERE pi.pedido_id = $1
      `, [pedido.id]);
      pedido.items = itemsResult.rows;
    }

    res.json(pedidos);
  } catch (err) {
    console.error("Error obteniendo pedidos:", err.message);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.post('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const updatedOrder = result.rows[0];
    
    const itemsResult = await pool.query(`
        SELECT pi.*, mi.nombre as nombre_producto, mi.categoria 
        FROM pedido_items pi 
        LEFT JOIN menu_items mi ON pi.menu_item_id = mi.id 
        WHERE pi.pedido_id = $1
    `, [id]);
    updatedOrder.items = itemsResult.rows;

    broadcast({ type: 'ORDER_UPDATE', data: updatedOrder });

    res.json(updatedOrder);
  } catch (err) {
    console.error("Error cambiando estado:", err.message);
    res.status(500).json({ error: 'Error actualizando estado' });
  }
});

// --- CATCH-ALL ROUTE ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- LÓGICA WEBSOCKET ---

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(JSON.stringify(message));
    }
  });
}

let lastMaxId = 0;
let isFirstRun = true;

async function checkNewOrders() {
  try {
    const res = await pool.query('SELECT MAX(id) as max_id FROM pedidos');
    const currentMaxId = res.rows[0].max_id;

    if (isFirstRun) {
      lastMaxId = currentMaxId || 0;
      isFirstRun = false;
      return;
    }

    if (currentMaxId > lastMaxId) {
      const newOrdersRes = await pool.query('SELECT * FROM pedidos WHERE id > $1 ORDER BY id ASC', [lastMaxId]);
      
      for (let order of newOrdersRes.rows) {
        const itemsResult = await pool.query(`
          SELECT pi.*, mi.nombre as nombre_producto, mi.categoria 
          FROM pedido_items pi 
          LEFT JOIN menu_items mi ON pi.menu_item_id = mi.id 
          WHERE pi.pedido_id = $1
        `, [order.id]);
        order.items = itemsResult.rows;

        console.log(`🔔 Nuevo pedido detectado: #${order.id}`);
        broadcast({ type: 'NEW_ORDER', data: order });
      }
      lastMaxId = currentMaxId;
    }
  } catch (err) {
    // Silencioso
  }
}

setInterval(checkNewOrders, 5000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 SERVIDOR INTERMEDIO CORRIENDO EN PUERTO ${PORT}`);
});
