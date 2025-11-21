const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// --- CONFIGURACIÓN DE LA BASE DE DATOS (RENDER) ---
// Usamos las credenciales exactas proporcionadas
const pool = new Pool({
  host: "dpg-d4e9rbngi27c73cik2c0-a.virginia-postgres.render.com",
  port: 5432,
  database: "taqueria_don_juan",
  user: "alvcd21",
  password: "v5kMB2R44Xh6P8d109bczIQ7sKbcYphz",
  ssl: {
    rejectUnauthorized: false // Necesario para conectar desde fuera de Render
  },
  connectionTimeoutMillis: 10000, // 10 segundos timeout
});

// Manejo de errores del Pool para evitar que el servidor se caiga si se va el internet
pool.on('error', (err, client) => {
  console.error('❌ Error inesperado en el cliente de PostgreSQL:', err);
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// --- VERIFICACIÓN DE CONEXIÓN AL INICIAR ---
async function testDbConnection() {
  try {
    console.log('⏳ Intentando conectar a PostgreSQL en Render...');
    const client = await pool.connect();
    console.log('✅ CONEXIÓN EXITOSA A LA BASE DE DATOS EN RENDER');
    
    // Verificar que existen las tablas
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('📊 Tablas encontradas:', res.rows.map(r => r.table_name).join(', '));
    
    client.release();
  } catch (err) {
    console.error('❌ ERROR FATAL: No se pudo conectar a la Base de Datos.');
    console.error('Detalle:', err.message);
    console.error('Verifica tu internet y que las credenciales sean correctas.');
  }
}

testDbConnection();

// --- API ENDPOINTS ---

// Endpoint raíz para probar si el servidor corre en el navegador
app.get('/', (req, res) => {
  res.send('Servidor de Taquería Don Juan está ACTIVO y CORRIENDO 🚀');
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', db: 'connected' });
});

// 1. Obtener información de la empresa
app.get('/api/empresa', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM empresa LIMIT 1');
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Si no existe, devolvemos un objeto vacío seguro
      res.json({ disponible: true, motivo_no_dispon: '' }); 
    }
  } catch (err) {
    console.error("Error en /api/empresa:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Actualizar disponibilidad
app.post('/api/empresa/disponibilidad', async (req, res) => {
  const { disponible, motivo } = req.body;
  try {
    // Actualizamos el primer registro que encontremos (asumiendo solo una empresa)
    const result = await pool.query(
      'UPDATE empresa SET disponible = $1, motivo_no_dispon = $2 WHERE id = (SELECT id FROM empresa LIMIT 1) RETURNING *',
      [disponible, motivo]
    );
    
    if (result.rows.length > 0) {
      const updatedEmpresa = result.rows[0];
      // Avisar a todos los dashboards conectados
      broadcast({ type: 'EMPRESA_UPDATE', data: updatedEmpresa });
      res.json(updatedEmpresa);
    } else {
      res.status(404).json({ error: 'Registro de empresa no encontrado para actualizar' });
    }
  } catch (err) {
    console.error("Error actualizando disponibilidad:", err.message);
    res.status(500).json({ error: 'Error actualizando disponibilidad' });
  }
});

// 3. Obtener pedidos (con items)
app.get('/api/orders', async (req, res) => {
  try {
    // Pedidos recientes primero
    const pedidosResult = await pool.query('SELECT * FROM pedidos ORDER BY fecha_hora DESC LIMIT 50');
    const pedidos = pedidosResult.rows;

    // Cargar items para cada pedido
    // Nota: Esto podría optimizarse con un JOIN, pero por claridad lo hacemos así
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

// 4. Actualizar estado de pedido
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
    
    // Necesitamos los items para enviar la actualización completa por WebSocket
    const itemsResult = await pool.query(`
        SELECT pi.*, mi.nombre as nombre_producto, mi.categoria 
        FROM pedido_items pi 
        LEFT JOIN menu_items mi ON pi.menu_item_id = mi.id 
        WHERE pi.pedido_id = $1
    `, [id]);
    updatedOrder.items = itemsResult.rows;

    // Notificar actualización en tiempo real
    broadcast({ type: 'ORDER_UPDATE', data: updatedOrder });

    res.json(updatedOrder);
  } catch (err) {
    console.error("Error cambiando estado:", err.message);
    res.status(500).json({ error: 'Error actualizando estado' });
  }
});

// --- LÓGICA WEBSOCKET (Tiempo Real) ---

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Polling inteligente para detectar nuevos pedidos insertados por n8n/ElevenLabs
let lastMaxId = 0;
let isFirstRun = true;

async function checkNewOrders() {
  try {
    // Obtenemos el ID más alto actual
    const res = await pool.query('SELECT MAX(id) as max_id FROM pedidos');
    const currentMaxId = res.rows[0].max_id;

    if (isFirstRun) {
      lastMaxId = currentMaxId || 0;
      isFirstRun = false;
      return;
    }

    // Si hay IDs nuevos mayores al último conocido
    if (currentMaxId > lastMaxId) {
      const newOrdersRes = await pool.query('SELECT * FROM pedidos WHERE id > $1 ORDER BY id ASC', [lastMaxId]);
      
      for (let order of newOrdersRes.rows) {
        // Obtener items
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
    // Ignorar errores de conexión transitorios para no llenar la consola
  }
}

// Revisar base de datos cada 5 segundos
setInterval(checkNewOrders, 5000);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 SERVIDOR INTERMEDIO CORRIENDO EN http://localhost:${PORT}`);
  console.log(`📡 WebSockets activos en ws://localhost:${PORT}`);
});