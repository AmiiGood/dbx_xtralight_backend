const express = require("express");
const cors = require("cors");

const app = express();

// ========================================
// MIDDLEWARES GLOBALES
// ========================================

// CORS - Permitir peticiones desde el frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parsear JSON
app.use(express.json({ limit: "10mb" }));

// Parsear URL-encoded
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging de requests en desarrollo
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// ========================================
// RUTAS
// ========================================

// Ruta de health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Sistema de Etiquetas Foamy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// IMPORTAR RUTAS
// ========================================

const authRoutes = require("./routes/auth");
// const usuariosRoutes = require('./routes/usuarios');
const articulosRoutes = require('./routes/articulos');
// const etiquetasRoutes = require('./routes/etiquetas');

app.use("/api/auth", authRoutes);
// app.use('/api/usuarios', usuariosRoutes);
app.use('/api/articulos', articulosRoutes);
// app.use('/api/etiquetas', etiquetasRoutes);

// ========================================
// MANEJO DE ERRORES 404
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    path: req.path,
  });
});

// ========================================
// MANEJO DE ERRORES GLOBAL
// ========================================

app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  // Error de validación
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Error de validación",
      errors: err.errors,
    });
  }

  // Error de JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Token inválido",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expirado",
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
