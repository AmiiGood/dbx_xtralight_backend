const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

/**
 * Middleware para verificar el token JWT
 */
const verificarToken = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No se proporcionó token de autenticación",
      });
    }

    // El formato debe ser: "Bearer TOKEN"
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Formato de token inválido",
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario aún existe y está activo
    const result = await query(
      `SELECT u.id, u.uuid, u.username, u.email, u.nombre, u.apellido, 
              u.rol_id, r.nombre as rol_nombre, u.activo
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1 AND u.activo = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado o inactivo",
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: result.rows[0].id,
      uuid: result.rows[0].uuid,
      username: result.rows[0].username,
      email: result.rows[0].email,
      nombre: result.rows[0].nombre,
      apellido: result.rows[0].apellido,
      rolId: result.rows[0].rol_id,
      rol: result.rows[0].rol_nombre,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      });
    }

    console.error("Error en verificarToken:", error);
    return res.status(500).json({
      success: false,
      message: "Error al verificar token",
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * Uso: verificarRol('Administrador', 'Supervisor')
 */
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para acceder a este recurso",
        rolRequerido: rolesPermitidos,
        tuRol: req.user.rol,
      });
    }

    next();
  };
};

/**
 * Middleware opcional - Si hay token lo verifica, si no, continúa
 */
const verificarTokenOpcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT u.id, u.uuid, u.username, u.email, u.nombre, u.apellido, 
              u.rol_id, r.nombre as rol_nombre
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1 AND u.activo = true`,
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = {
        id: result.rows[0].id,
        uuid: result.rows[0].uuid,
        username: result.rows[0].username,
        email: result.rows[0].email,
        nombre: result.rows[0].nombre,
        apellido: result.rows[0].apellido,
        rolId: result.rows[0].rol_id,
        rol: result.rows[0].rol_nombre,
      };
    }

    next();
  } catch (error) {
    // Si hay error, simplemente continúa sin usuario
    next();
  }
};

module.exports = {
  verificarToken,
  verificarRol,
  verificarTokenOpcional,
};
