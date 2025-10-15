require("dotenv").config();
const app = require("./src/app");
const { testConnection } = require("./src/config/database");

const PORT = process.env.PORT || 3000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    console.log("Iniciando servidor...\n");

    // Verificar conexión a la base de datos
    console.log("Verificando conexión a PostgreSQL...");
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error("❌ No se pudo conectar a la base de datos");
      process.exit(1);
    }

    console.log("");

    // Iniciar servidor Express
    app.listen(PORT, () => {
      console.log("═══════════════════════════════════════");
      console.log(`Servidor corriendo en puerto ${PORT}`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV}`);
      console.log("═══════════════════════════════════════\n");
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Manejo de señales de terminación
process.on("SIGTERM", () => {
  console.log("SIGTERM recibido, cerrando servidor...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT recibido, cerrando servidor...");
  process.exit(0);
});

// Iniciar servidor
startServer();
