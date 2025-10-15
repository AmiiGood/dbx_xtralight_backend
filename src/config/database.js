const { Pool } = require("pg");
require("dotenv").config();

// Configuración del pool de conexiones
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexión inactiva
  connectionTimeoutMillis: 2000, // Tiempo de espera para conectar
});

// Evento cuando se conecta exitosamente
pool.on("connect", () => {
  console.log("✅ Conectado a PostgreSQL");
});

// Evento cuando hay un error
pool.on("error", (err) => {
  console.error("❌ Error inesperado en PostgreSQL:", err);
  process.exit(-1);
});

// Función para verificar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    console.log("Hora del servidor PostgreSQL:", result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Error al conectar con PostgreSQL:", error.message);
    return false;
  }
};

// Función helper para ejecutar queries con manejo de errores
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log("Query ejecutada:", {
        text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        duration: duration + "ms",
        rows: res.rowCount,
      });
    }

    return res;
  } catch (error) {
    console.error("❌ Error en query:", error.message);
    throw error;
  }
};

// Función para obtener un cliente del pool (para transacciones)
const getClient = async () => {
  try {
    const client = await pool.connect();

    // Agregar método helper para queries
    const query = client.query.bind(client);
    const release = client.release.bind(client);

    // Configurar timeout para liberar cliente
    const timeout = setTimeout(() => {
      console.error("Cliente no liberado después de 5 segundos");
      client.release();
    }, 5000);

    // Sobrescribir release para limpiar timeout
    client.release = () => {
      clearTimeout(timeout);
      client.release = release;
      return release();
    };

    return client;
  } catch (error) {
    console.error("❌ Error al obtener cliente:", error.message);
    throw error;
  }
};

// Función para ejecutar transacciones
const transaction = async (callback) => {
  const client = await getClient();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Transacción revertida:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  testConnection,
};
